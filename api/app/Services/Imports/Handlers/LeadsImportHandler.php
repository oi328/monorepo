<?php

namespace App\Services\Imports\Handlers;

use App\Models\CrmSetting;
use App\Models\ImportJob;
use App\Models\ImportJobRow;
use App\Models\Lead;
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
            if ($rawPhone !== '') {
                $normalizedPhone = PhoneNormalizer::normalize($rawPhone, $phoneCountryHint);
                $normalized['phone'] = $normalizedPhone;
            } else {
                $normalized['phone'] = '';
            }

            // Minimal validation
            $name = trim((string) ($normalized['name'] ?? ''));
            if ($name === '') {
                $normalized['name'] = 'Unknown';
                $warnings[] = ['code' => 'missing_name', 'message' => 'Missing name; defaulted to Unknown.'];
            }

            $email = trim((string) ($normalized['email'] ?? ''));
            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $this->storeRow($job, [
                    'row_number' => $rowNumber,
                    'status' => 'failed',
                    'reason_code' => 'invalid_email',
                    'reason_message' => 'Invalid email format.',
                    'raw_data' => $rawRow,
                    'normalized_data' => $normalized,
                    'warnings' => $warnings,
                    'entity_type' => 'leads',
                ]);
                $failedRows++;
                continue;
            }

            $phone = trim((string) ($normalized['phone'] ?? ''));
            if ($phone === '') {
                $this->storeRow($job, [
                    'row_number' => $rowNumber,
                    'status' => 'failed',
                    'reason_code' => 'missing_phone',
                    'reason_message' => 'Missing phone.',
                    'raw_data' => $rawRow,
                    'normalized_data' => $normalized,
                    'warnings' => $warnings,
                    'entity_type' => 'leads',
                ]);
                $failedRows++;
                continue;
            }

            // Stage default
            if (empty($normalized['stage']) || in_array(Str::of((string) $normalized['stage'])->lower()->trim()->toString(), ['new', 'new lead'], true)) {
                $normalized['stage'] = 'New Lead';
            }

            $isInFileDup = false;
            if (isset($seenPhones[$phone])) {
                $isInFileDup = true;
            } else {
                $seenPhones[$phone] = true;
            }

            $isDbDup = false;
            $duplicateOfId = null;

            if ($enableDup) {
                $variants = PhoneNormalizer::variantsForSearch($rawPhone !== '' ? $rawPhone : $phone, $phoneCountryHint);
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
                    'normalized_data' => $normalized,
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
        foreach (['stage', 'status', 'priority', 'source', 'campaign', 'assigned_to', 'estimated_value', 'notes', 'company', 'email', 'phone', 'name'] as $k) {
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
}
