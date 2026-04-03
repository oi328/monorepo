<?php

namespace App\Services\Imports\Handlers;

use App\Models\CrmSetting;
use App\Models\ImportJob;
use App\Models\ImportJobRow;
use App\Models\Item;
use App\Models\Lead;
use App\Models\LeadAction;
use App\Models\Project;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Imports\Contracts\ImportHandler;
use App\Support\PhoneNormalizer;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;

class LeadsImportHandler implements ImportHandler
{
    /**
     * @param array<int, array<string, mixed>> $rows
     * @param array<string, string> $mapping
     * @param array<string, mixed> $options
     */
    public function handle(ImportJob $job, array $rows, array $mapping, array $options = []): void
    {
        $tenantId = $job->tenant_id;
        $uploaderId = $job->uploaded_by;
        $phoneCountryHint = isset($options['phone_country']) ? (string) $options['phone_country'] : null;

        $crm = CrmSetting::first();
        $enableDup = is_array($crm?->settings) ? (bool) ($crm->settings['duplicationSystem'] ?? false) : false;

        $companyType = '';
        try {
            $tenant = $tenantId ? Tenant::find($tenantId) : null;
            $companyType = strtolower((string) ($tenant?->company_type ?? ''));
        } catch (\Throwable $e) {
            $companyType = '';
        }
        $isGeneral = $companyType === 'general';

        $seenPhones = [];
        $firstLeadIdByPhone = [];

        $totalRows = 0;
        $successRows = 0;
        $failedRows = 0;
        $duplicateRows = 0;
        $skippedRows = 0;
        $warningRows = 0;

        $allowedColumns = $this->allowedLeadColumns();

        foreach ($rows as $index => $rawRow) {
            $totalRows++;
            $rowNumber = $this->rowNumberFromOptions($options, $index);

            $warnings = [];
            if (!is_array($rawRow)) {
                $this->storeRow($job, [
                    'row_number' => $rowNumber,
                    'status' => 'failed',
                    'reason_code' => 'invalid_row',
                    'reason_message' => 'Row is not an object.',
                    'raw_data' => $rawRow,
                    'normalized_data' => null,
                    'warnings' => [],
                    'entity_type' => 'leads',
                ]);
                $failedRows++;
                continue;
            }

            $normalized = $this->mapRow($rawRow, $mapping);

            $normalized = array_merge([
                'tenant_id' => $tenantId,
                'source' => 'import',
                'status' => $normalized['status'] ?? 'new',
                'priority' => $normalized['priority'] ?? 'medium',
            ], $normalized);

            // Normalize phone early
            $rawPhone = isset($normalized['phone']) ? trim((string) $normalized['phone']) : '';
            $rowPhoneCountryHint = isset($normalized['phone_country']) ? trim((string) $normalized['phone_country']) : '';
            $rowPhoneCountryHint = $rowPhoneCountryHint !== '' ? $rowPhoneCountryHint : $phoneCountryHint;
            if ($rawPhone !== '') {
                $normalizedPhone = PhoneNormalizer::normalize($rawPhone, $rowPhoneCountryHint);
                $normalized['phone'] = $normalizedPhone;
            } else {
                $normalized['phone'] = '';
            }

            // Extract optional fields we may use after create.
            $assignedToRaw = trim((string) ($normalized['assignedTo'] ?? $normalized['assigned_to'] ?? ''));
            $nextActionDate = trim((string) ($normalized['next_action_date'] ?? $normalized['nextActionDate'] ?? ''));
            $nextActionTime = trim((string) ($normalized['next_action_time'] ?? $normalized['nextActionTime'] ?? ''));
            $comment = trim((string) ($normalized['comment'] ?? ''));
            $phoneCountry = trim((string) ($normalized['phone_country'] ?? ''));

            // Required fields (match legacy bulk-import behavior): Name, Phone, Source, and (Project OR Item based on tenant type).
            $name = trim((string) ($normalized['name'] ?? ''));
            $sourceName = trim((string) ($normalized['source'] ?? ''));
            $phone = trim((string) ($normalized['phone'] ?? ''));

            $missing = [];
            if ($name === '') $missing[] = 'Name';
            if ($rawPhone === '' || $phone === '') $missing[] = 'Phone';
            if ($sourceName === '') $missing[] = 'Source';
            if (!empty($missing)) {
                $fieldErrors = [];
                if ($name === '') $fieldErrors['name'] = 'Name is required.';
                if ($rawPhone === '' || $phone === '') $fieldErrors['phone'] = 'Phone is required.';
                if ($sourceName === '') $fieldErrors['source'] = 'Source is required.';
                $this->storeRow($job, [
                    'row_number' => $rowNumber,
                    'status' => 'skipped',
                    'reason_code' => 'missing_required_fields',
                    'reason_message' => 'Missing required fields (' . implode(', ', $missing) . '). Row skipped.',
                    'raw_data' => $rawRow,
                    'normalized_data' => $this->withFieldErrors($normalized, $fieldErrors),
                    'warnings' => $warnings,
                    'entity_type' => 'leads',
                ]);
                $skippedRows++;
                continue;
            }

            $email = trim((string) ($normalized['email'] ?? ''));
            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $this->storeRow($job, [
                    'row_number' => $rowNumber,
                    'status' => 'failed',
                    'reason_code' => 'invalid_email',
                    'reason_message' => 'Invalid email format.',
                    'raw_data' => $rawRow,
                    'normalized_data' => $this->withFieldErrors($normalized, ['email' => 'Invalid email format.']),
                    'warnings' => $warnings,
                    'entity_type' => 'leads',
                ]);
                $failedRows++;
                continue;
            }

            // Project/Item resolution (match legacy bulk-import behavior)
            $projectName = trim((string) ($normalized['project'] ?? ''));
            $itemName = trim((string) ($normalized['item'] ?? ''));
            $projectId = null;
            $itemId = null;

            if ($isGeneral) {
                if ($itemName === '') {
                    $this->storeRow($job, [
                        'row_number' => $rowNumber,
                        'status' => 'skipped',
                        'reason_code' => 'missing_item',
                        'reason_message' => 'Item is required for general companies. Row skipped.',
                        'raw_data' => $rawRow,
                        'normalized_data' => $this->withFieldErrors($normalized, ['item' => 'Item is required.']),
                        'warnings' => $warnings,
                        'entity_type' => 'leads',
                    ]);
                    $skippedRows++;
                    continue;
                }

                $item = Item::where('tenant_id', $tenantId)
                    ->where(function ($q) use ($itemName) {
                        $q->where('name', $itemName)->orWhere('code', $itemName);
                    })
                    ->first();
                if (!$item) {
                    $this->storeRow($job, [
                        'row_number' => $rowNumber,
                        'status' => 'skipped',
                        'reason_code' => 'item_not_found',
                        'reason_message' => "Item '{$itemName}' not found. Row skipped.",
                        'raw_data' => $rawRow,
                        'normalized_data' => $this->withFieldErrors($normalized, ['item' => "Item '{$itemName}' not found."]),
                        'warnings' => $warnings,
                        'entity_type' => 'leads',
                    ]);
                    $skippedRows++;
                    continue;
                }

                $itemId = (int) $item->id;
                $itemName = (string) ($item->name ?? $itemName);
                $normalized['item_id'] = $itemId;
                $normalized['item'] = $itemName;
            } else {
                if ($projectName === '') {
                    $this->storeRow($job, [
                        'row_number' => $rowNumber,
                        'status' => 'skipped',
                        'reason_code' => 'missing_project',
                        'reason_message' => 'Project is required. Row skipped.',
                        'raw_data' => $rawRow,
                        'normalized_data' => $this->withFieldErrors($normalized, ['project' => 'Project is required.']),
                        'warnings' => $warnings,
                        'entity_type' => 'leads',
                    ]);
                    $skippedRows++;
                    continue;
                }

                $project = Project::where('tenant_id', $tenantId)
                    ->where(function ($q) use ($projectName) {
                        $q->where('name', $projectName)->orWhere('name_ar', $projectName);
                    })
                    ->first();
                if (!$project) {
                    $this->storeRow($job, [
                        'row_number' => $rowNumber,
                        'status' => 'skipped',
                        'reason_code' => 'project_not_found',
                        'reason_message' => "Project '{$projectName}' not found. Row skipped.",
                        'raw_data' => $rawRow,
                        'normalized_data' => $this->withFieldErrors($normalized, ['project' => "Project '{$projectName}' not found."]),
                        'warnings' => $warnings,
                        'entity_type' => 'leads',
                    ]);
                    $skippedRows++;
                    continue;
                }

                $projectId = (int) $project->id;
                $projectName = (string) ($project->name ?? $projectName);
                $normalized['project_id'] = $projectId;
                $normalized['project'] = $projectName;
            }

            // Stage normalization (match legacy behavior)
            $incomingStage = trim((string) ($normalized['stage'] ?? ''));
            if ($incomingStage === '') {
                $normalized['stage'] = 'New Lead';
            } else {
                $normIncoming = strtolower(str_replace([' ', '-'], '', $incomingStage));
                if (in_array($normIncoming, ['new', 'newlead', 'fresh'], true)) {
                    $normalized['stage'] = 'New Lead';
                } elseif ($normIncoming === 'pending') {
                    $normalized['stage'] = 'Pending';
                } elseif (in_array($normIncoming, ['coldcalls', 'coldcall'], true)) {
                    $normalized['stage'] = 'Cold Calls';
                } elseif ($normIncoming === 'duplicate') {
                    $normalized['stage'] = 'Duplicate';
                } else {
                    $normalized['stage'] = $incomingStage;
                }
            }

            // Store common template fields inside meta_data (best-effort).
            $meta = is_array($normalized['meta_data'] ?? null) ? ($normalized['meta_data'] ?? []) : [];
            if ($comment !== '') {
                $meta['comment'] = $comment;
            }
            if ($phoneCountry !== '') {
                $meta['phone_country'] = $phoneCountry;
            }
            $normalized['meta_data'] = $meta;

            $isInFileDup = false;
            if (isset($seenPhones[$phone])) {
                $isInFileDup = true;
            } else {
                $seenPhones[$phone] = true;
            }

            $isDbDup = false;
            $duplicateOfId = null;

            if ($enableDup) {
                $variants = PhoneNormalizer::variantsForSearch($rawPhone !== '' ? $rawPhone : $phone, $rowPhoneCountryHint);
                $variants = !empty($variants) ? $variants : [$phone];

                $base = Lead::query();
                if ($tenantId) {
                    $base->where('tenant_id', $tenantId);
                }
                $isDbDup = (clone $base)->whereIn('phone', $variants)->exists();

                if ($isDbDup) {
                    $original = (clone $base)->whereIn('phone', $variants)
                        ->where(function ($q) {
                            $q->whereNull('status')->orWhere('status', '!=', 'duplicate');
                        })
                        ->orderBy('id', 'asc')
                        ->first();
                    if (!$original) {
                        $original = (clone $base)->whereIn('phone', $variants)->orderBy('id', 'asc')->first();
                    }
                    $duplicateOfId = $this->resolveDuplicateRootId($original, $tenantId);
                }
            }

            // In-file duplicates should also be tracked as duplicates and linked to the first imported lead with that phone.
            if ($isInFileDup) {
                $duplicateOfId = $duplicateOfId ?: ($firstLeadIdByPhone[$phone] ?? null);
            }

            if ($enableDup && ($isDbDup || $isInFileDup)) {
                $normalized['status'] = 'duplicate';
                $normalized['stage'] = 'Duplicate';
                $meta = is_array($normalized['meta_data'] ?? null) ? ($normalized['meta_data'] ?? []) : [];
                if ($duplicateOfId) {
                    $meta['duplicate_of'] = (int) $duplicateOfId;
                }
                $meta['import_job_id'] = (int) $job->id;
                $normalized['meta_data'] = $meta;
            } else {
                $meta = is_array($normalized['meta_data'] ?? null) ? ($normalized['meta_data'] ?? []) : [];
                $meta['import_job_id'] = (int) $job->id;
                $normalized['meta_data'] = $meta;
            }

            // Normalize common camelCase keys coming from the frontend/import wizard.
            if (!array_key_exists('estimated_value', $normalized) && array_key_exists('estimatedValue', $normalized)) {
                $normalized['estimated_value'] = $normalized['estimatedValue'];
            }

            // Do not allow setting created_by from file; always set uploader.
            $normalized['created_by'] = $uploaderId;

            // Strip fields that are not columns (best-effort).
            unset($normalized['custom_fields'], $normalized['attachments']);
            $normalized = $this->filterToAllowedColumns($normalized, $allowedColumns);

            try {
                $lead = Lead::create($normalized);
                $createdId = (int) ($lead->id ?? 0);

                if (!isset($firstLeadIdByPhone[$phone]) && $createdId > 0) {
                    $firstLeadIdByPhone[$phone] = $createdId;
                }

                // Sales Person Assignment (optional). If not found, keep the row as success and add a warning.
                if ($assignedToRaw !== '') {
                    $assignedToNorm = mb_strtolower(trim($assignedToRaw), 'UTF-8');
                    $assignedToNorm = preg_replace('/\s+/u', ' ', $assignedToNorm);
                    $assignedToNoSpace = preg_replace('/\s+/u', '', $assignedToNorm);
                    $placeholders = ['sales person', 'salesperson', 'اسم البائع', 'اسمالبائع'];
                    if (in_array($assignedToNorm, $placeholders, true) || in_array($assignedToNoSpace, $placeholders, true)) {
                        $assignedToRaw = '';
                    }
                }

                if ($assignedToRaw !== '') {
                    $assignedUser = User::where('tenant_id', $tenantId)
                        ->where(function ($q) use ($assignedToRaw) {
                            $q->where('id', $assignedToRaw)->orWhere('name', 'LIKE', "%{$assignedToRaw}%");
                        })
                        ->first();

                    if ($assignedUser) {
                        $lead->assigned_to = $assignedUser->id;
                        $lead->sales_person = $assignedUser->name;
                        $lead->save();
                    } else {
                        $warnings[] = ['code' => 'sales_person_not_found', 'message' => "Sales Person '{$assignedToRaw}' not found.", 'field' => 'assignedTo'];
                    }
                }

                // Next action creation (optional, best-effort).
                if ($nextActionDate !== '' && preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $nextActionDate)) {
                    $time = $nextActionTime !== '' && preg_match('/^\\d{2}:\\d{2}$/', $nextActionTime) ? $nextActionTime : null;
                    try {
                        LeadAction::create([
                            'lead_id' => $lead->id,
                            'tenant_id' => $tenantId,
                            'user_id' => $lead->assigned_to ?: $uploaderId,
                            'action_type' => 'call',
                            'description' => 'Imported next action',
                            'stage_id_at_creation' => null,
                            'next_action_type' => 'call',
                            'details' => array_filter([
                                'date' => $nextActionDate,
                                'time' => $time,
                                'status' => 'scheduled',
                                'source' => 'import',
                                'priority' => $lead->priority ?? 'medium',
                            ], fn ($v) => $v !== null && $v !== ''),
                        ]);
                    } catch (\Throwable $e) {
                        $warnings[] = ['code' => 'next_action_failed', 'message' => "Failed to create next action ({$e->getMessage()}).", 'field' => 'next_action_date'];
                    }
                }

                $rowStatus = ($enableDup && ($isDbDup || $isInFileDup)) ? 'duplicate' : 'success';
                $reasonCode = null;
                $reasonMessage = null;
                if ($rowStatus === 'duplicate') {
                    $reasonCode = $isDbDup ? 'duplicate_existing' : 'duplicate_in_file';
                    $reasonMessage = $isDbDup ? 'Duplicate phone already exists.' : 'Duplicate phone appears multiple times in the same file.';
                }

                if (!empty($warnings)) {
                    $warningRows++;
                }

                $this->storeRow($job, [
                    'row_number' => $rowNumber,
                    'status' => $rowStatus,
                    'reason_code' => $reasonCode,
                    'reason_message' => $reasonMessage,
                    'raw_data' => $rawRow,
                    'normalized_data' => $normalized,
                    'warnings' => $warnings,
                    'entity_type' => 'leads',
                    'created_record_id' => $createdId ?: null,
                    'duplicate_of_id' => $duplicateOfId ?: null,
                ]);

                if ($rowStatus === 'duplicate') {
                    $duplicateRows++;
                } else {
                    $successRows++;
                }
            } catch (\Throwable $e) {
                $this->storeRow($job, [
                    'row_number' => $rowNumber,
                    'status' => 'failed',
                    'reason_code' => 'exception',
                    'reason_message' => $e->getMessage(),
                    'raw_data' => $rawRow,
                    'normalized_data' => $this->withFieldErrors($normalized, ['_row' => $e->getMessage()]),
                    'warnings' => $warnings,
                    'entity_type' => 'leads',
                    'duplicate_of_id' => $duplicateOfId ?: null,
                ]);
                $failedRows++;
            }
        }

        $job->forceFill([
            'total_rows' => $totalRows,
            'success_rows' => $successRows,
            'failed_rows' => $failedRows,
            'duplicate_rows' => $duplicateRows,
            'skipped_rows' => $skippedRows,
            'warning_rows' => $warningRows,
        ])->save();
    }

    /**
     * @param array<string, mixed> $rawRow
     * @param array<string, string> $mapping
     * @return array<string, mixed>
     */
    private function mapRow(array $rawRow, array $mapping): array
    {
        if (empty($mapping)) {
            return $rawRow;
        }

        $out = [];
        foreach ($mapping as $fileCol => $targetField) {
            $targetField = trim((string) $targetField);
            if ($targetField === '') {
                continue;
            }
            if (array_key_exists($fileCol, $rawRow)) {
                $out[$targetField] = $rawRow[$fileCol];
            }
        }

        // Preserve pass-through fields if they exist (optional)
        foreach (['stage', 'status', 'priority', 'source', 'campaign', 'assigned_to', 'assignedTo', 'estimated_value', 'estimatedValue', 'notes', 'company', 'email', 'phone', 'name', 'project', 'item', 'next_action_date', 'next_action_time', 'comment', 'phone_country'] as $k) {
            if (!array_key_exists($k, $out) && array_key_exists($k, $rawRow)) {
                $out[$k] = $rawRow[$k];
            }
        }

        return $out;
    }

    private function rowNumberFromOptions(array $options, int $index): int
    {
        $start = (int) ($options['row_number_start'] ?? 2); // 2 = after header row by default
        return $start + $index;
    }

    private function storeRow(ImportJob $job, array $attrs): void
    {
        $attrs['job_id'] = $job->id;
        ImportJobRow::create($attrs);
    }

    private function resolveDuplicateRootId(?Lead $lead, ?int $tenantId = null): ?int
    {
        if (!$lead) return null;

        $seen = [];
        $current = $lead;

        for ($i = 0; $i < 10; $i++) {
            $id = (int) ($current->id ?? 0);
            if ($id <= 0) {
                return null;
            }
            if (isset($seen[$id])) {
                return $id;
            }
            $seen[$id] = true;

            $meta = is_array($current->meta_data ?? null) ? ($current->meta_data ?? []) : [];
            $dupOf = $meta['duplicate_of'] ?? null;
            if (!is_numeric($dupOf) || (int) $dupOf <= 0) {
                return $id;
            }

            $nextQuery = Lead::query()->where('id', (int) $dupOf);
            if ($tenantId) {
                $nextQuery->where('tenant_id', $tenantId);
            }
            $next = $nextQuery->first();
            if (!$next) {
                return $id;
            }
            $current = $next;
        }

        return (int) ($current->id ?? null);
    }

    /**
     * @return array<string, bool>
     */
    private function allowedLeadColumns(): array
    {
        static $cache = null;
        if (is_array($cache)) {
            return $cache;
        }

        try {
            $cols = Schema::getColumnListing('leads');
        } catch (\Throwable $e) {
            $cols = [];
        }

        $out = [];
        foreach ($cols as $c) {
            $out[(string) $c] = true;
        }
        // Also allow meta_data (JSON cast) even if column listing fails.
        $out['meta_data'] = true;
        $out['tenant_id'] = true;
        $cache = $out;
        return $out;
    }

    /**
     * @param array<string, mixed> $data
     * @param array<string, bool> $allowed
     * @return array<string, mixed>
     */
    private function filterToAllowedColumns(array $data, array $allowed): array
    {
        $out = [];
        foreach ($data as $k => $v) {
            if (isset($allowed[$k])) {
                $out[$k] = $v;
            }
        }
        return $out;
    }

    /**
     * @param array<string, mixed> $normalized
     * @param array<string, string> $fieldErrors
     * @return array<string, mixed>
     */
    private function withFieldErrors(array $normalized, array $fieldErrors): array
    {
        if (empty($fieldErrors)) {
            return $normalized;
        }

        $normalized['_field_errors'] = $fieldErrors;
        return $normalized;
    }
}
