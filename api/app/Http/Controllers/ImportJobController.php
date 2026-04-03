<?php

namespace App\Http\Controllers;

use App\Models\Export;
use App\Models\ImportJob;
use App\Models\ImportJobRow;
use App\Services\Imports\ImportService;
use App\Traits\UserHierarchyTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ImportJobController extends Controller
{
    use UserHierarchyTrait;

    private function ensureEnabled(): void
    {
        if (!config('imports.enabled')) {
            abort(404);
        }
    }

    public function index(Request $request)
    {
        $this->ensureEnabled();

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!Schema::hasTable('import_jobs')) {
            return response()->json(['data' => [], 'total' => 0, 'message' => 'Import jobs table not found'], 200);
        }

        $query = ImportJob::with('uploader:id,name');

        if ($user->tenant_id) {
            $query->where('tenant_id', $user->tenant_id);
        }

        $roleLower = strtolower($user->role ?? '');
        $isAdminOrManager = $user->is_super_admin ||
            in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager', 'operations manager'], true);

        if (!$isAdminOrManager) {
            $viewableUserIds = $this->getViewableUserIds($user);
            if ($viewableUserIds !== null) {
                $query->whereIn('uploaded_by', $viewableUserIds);
            } else {
                $query->where('uploaded_by', $user->id);
            }
        }

        if ($request->filled('module')) {
            $query->where('module', $request->input('module'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $query->orderBy('created_at', 'desc');

        return response()->json($query->paginate((int) $request->get('per_page', 15)));
    }

    public function show(Request $request, int $id)
    {
        $this->ensureEnabled();

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $job = ImportJob::with('uploader:id,name')->findOrFail($id);
        if ($user->tenant_id && $job->tenant_id !== $user->tenant_id) {
            abort(404);
        }

        // Visibility: same logic as index.
        $roleLower = strtolower($user->role ?? '');
        $isAdminOrManager = $user->is_super_admin ||
            in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager', 'operations manager'], true);
        if (!$isAdminOrManager) {
            $viewableUserIds = $this->getViewableUserIds($user);
            if ($viewableUserIds !== null) {
                $ids = is_array($viewableUserIds) ? $viewableUserIds : (method_exists($viewableUserIds, 'toArray') ? $viewableUserIds->toArray() : []);
                $ids = array_map('intval', $ids);
                if (!in_array((int) $job->uploaded_by, $ids, true)) {
                    abort(404);
                }
            } else {
                if ((int) $job->uploaded_by !== (int) $user->id) {
                    abort(404);
                }
            }
        }

        return response()->json($job);
    }

    public function rows(Request $request, int $id)
    {
        $this->ensureEnabled();

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $job = ImportJob::findOrFail($id);
        if ($user->tenant_id && $job->tenant_id !== $user->tenant_id) {
            abort(404);
        }

        $query = ImportJobRow::query()->where('job_id', $job->id);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('reason_message', 'like', "%{$search}%")
                    ->orWhere('reason_code', 'like', "%{$search}%")
                    ->orWhereRaw('CAST(raw_data AS CHAR) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('CAST(normalized_data AS CHAR) LIKE ?', ["%{$search}%"]);
            });
        }

        $query->orderBy('row_number', 'asc');

        return response()->json($query->paginate((int) $request->get('per_page', 25)));
    }

    public function reviewedFile(Request $request, int $id)
    {
        $this->ensureEnabled();

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $job = ImportJob::findOrFail($id);
        if ($user->tenant_id && $job->tenant_id !== $user->tenant_id) {
            abort(404);
        }

        // Visibility: same logic as index/show.
        $roleLower = strtolower($user->role ?? '');
        $isAdminOrManager = $user->is_super_admin ||
            in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager', 'operations manager'], true);
        if (!$isAdminOrManager) {
            $viewableUserIds = $this->getViewableUserIds($user);
            if ($viewableUserIds !== null) {
                $ids = is_array($viewableUserIds) ? $viewableUserIds : (method_exists($viewableUserIds, 'toArray') ? $viewableUserIds->toArray() : []);
                $ids = array_map('intval', $ids);
                if (!in_array((int) $job->uploaded_by, $ids, true)) {
                    abort(404);
                }
            } else {
                if ((int) $job->uploaded_by !== (int) $user->id) {
                    abort(404);
                }
            }
        }

        $maxRows = (int) $request->get('max_rows', 5000);
        if ($maxRows < 1) $maxRows = 1;
        if ($maxRows > 20000) $maxRows = 20000;

        $onlyIssues = filter_var($request->get('issues_only', '0'), FILTER_VALIDATE_BOOLEAN);

        $jobRows = ImportJobRow::query()
            ->where('job_id', $job->id)
            ->orderBy('row_number', 'asc')
            ->limit($maxRows)
            ->get();

        if ($onlyIssues) {
            $jobRows = $jobRows->filter(function ($r) {
                $status = strtolower((string) ($r->status ?? ''));
                $hasWarnings = is_array($r->warnings) && !empty($r->warnings);
                return in_array($status, ['failed', 'skipped'], true) || $hasWarnings;
            })->values();
        }

        $columns = $this->buildReviewedFileColumns($jobRows, $job->module);
        $statusColKey = '__import_status';
        $issuesColKey = '__issues';

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Import Review');

        $cell = static function (int $col, int $row): string {
            return Coordinate::stringFromColumnIndex($col) . (string) $row;
        };

        // Header row
        $colIndex = 1;
        foreach ($columns as $col) {
            $sheet->setCellValueExplicit($cell($colIndex, 1), $col['label'], DataType::TYPE_STRING);
            $colIndex++;
        }
        $sheet->setCellValueExplicit($cell($colIndex, 1), 'Import Status', DataType::TYPE_STRING);
        $statusColIndex = $colIndex;
        $colIndex++;
        $sheet->setCellValueExplicit($cell($colIndex, 1), 'Issues', DataType::TYPE_STRING);
        $issuesColIndex = $colIndex;

        $headerRange = 'A1:' . $cell($issuesColIndex, 1);
        $sheet->getStyle($headerRange)->getFont()->setBold(true);
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFEEF2FF');
        $sheet->freezePane('A2');

        $errorStyle = [
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFFFE4E6'], // red-100
            ],
            'borders' => [
                'outline' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FFEF4444'], // red-500
                ],
            ],
        ];
        $warningStyle = [
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['argb' => 'FFFFFBEB'], // amber-50
            ],
            'borders' => [
                'outline' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['argb' => 'FFF59E0B'], // amber-500
                ],
            ],
        ];

        $rowNumber = 2;
        foreach ($jobRows as $jobRow) {
            $raw = is_array($jobRow->raw_data) ? $jobRow->raw_data : [];
            $normalized = is_array($jobRow->normalized_data) ? $jobRow->normalized_data : [];

            $colIndex = 1;
            foreach ($columns as $col) {
                $key = $col['key'];
                $value = array_key_exists($key, $raw) ? $raw[$key] : (array_key_exists($key, $normalized) ? $normalized[$key] : null);
                if (is_array($value) || is_object($value)) {
                    $value = json_encode($value, JSON_UNESCAPED_UNICODE);
                }
                $sheet->setCellValueExplicit($cell($colIndex, $rowNumber), $value === null ? '' : (string) $value, DataType::TYPE_STRING);
                $colIndex++;
            }

            $status = (string) ($jobRow->status ?? '');
            $sheet->setCellValueExplicit($cell($statusColIndex, $rowNumber), $status, DataType::TYPE_STRING);

            $issues = [];
            if ($jobRow->reason_message) {
                $issues[] = (string) $jobRow->reason_message;
            }
            if (is_array($jobRow->warnings) && !empty($jobRow->warnings)) {
                foreach ($jobRow->warnings as $w) {
                    if (!is_array($w)) continue;
                    $msg = (string) ($w['message'] ?? $w['code'] ?? '');
                    if ($msg !== '') {
                        $issues[] = $msg;
                    }
                }
            }
            $issuesText = implode(' | ', array_values(array_filter($issues)));
            $sheet->setCellValueExplicit($cell($issuesColIndex, $rowNumber), $issuesText, DataType::TYPE_STRING);

            // Field-level highlights (best-effort).
            $fieldErrors = [];
            if (is_array($normalized) && array_key_exists('_field_errors', $normalized) && is_array($normalized['_field_errors'])) {
                $fieldErrors = $normalized['_field_errors'];
            }

            foreach ($fieldErrors as $field => $message) {
                $fieldKey = $this->normalizeReviewedFieldKey((string) $field);
                $targetKey = $this->mapReviewedFieldToColumnKey($fieldKey, $columns);
                if (!$targetKey) {
                    continue;
                }
                $cellColumnIndex = $this->columnIndexForKey($targetKey, $columns);
                if ($cellColumnIndex <= 0) continue;
                $coord = $cell($cellColumnIndex, $rowNumber);
                $sheet->getStyle($coord)->applyFromArray($errorStyle);
                if (is_string($message) && trim($message) !== '') {
                    try {
                        $sheet->getComment($coord)->getText()->createTextRun((string) $message);
                    } catch (\Throwable $e) {
                        // best-effort
                    }
                }
            }

            // Warning highlights (best-effort).
            if (is_array($jobRow->warnings) && !empty($jobRow->warnings)) {
                foreach ($jobRow->warnings as $w) {
                    if (!is_array($w)) continue;
                    $field = isset($w['field']) ? (string) $w['field'] : '';
                    if ($field === '') continue;
                    $fieldKey = $this->normalizeReviewedFieldKey($field);
                    $targetKey = $this->mapReviewedFieldToColumnKey($fieldKey, $columns);
                    if (!$targetKey) continue;
                    $cellColumnIndex = $this->columnIndexForKey($targetKey, $columns);
                    if ($cellColumnIndex <= 0) continue;
                    $coord = $cell($cellColumnIndex, $rowNumber);
                    $sheet->getStyle($coord)->applyFromArray($warningStyle);
                }
            }

            $rowNumber++;
        }

        // Autosize columns (small cap to avoid slowdowns)
        $maxAuto = min(count($columns) + 2, 25);
        for ($i = 1; $i <= $maxAuto; $i++) {
            try {
                $sheet->getColumnDimensionByColumn($i)->setAutoSize(true);
            } catch (\Throwable $e) {
            }
        }

        $baseName = $job->file_name ? pathinfo((string) $job->file_name, PATHINFO_FILENAME) : ('import_job_' . $job->id);
        $safeBase = preg_replace('/[^a-zA-Z0-9_\\-]+/', '_', (string) $baseName);
        $suffix = $onlyIssues ? '_issues' : '_reviewed';
        $downloadName = ($safeBase ?: ('import_job_' . $job->id)) . $suffix . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $downloadName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'no-store, no-cache',
        ]);
    }

    public function store(Request $request, ImportService $importService)
    {
        $this->ensureEnabled();

        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (!Schema::hasTable('import_jobs') || !Schema::hasTable('import_job_rows')) {
            return response()->json(['message' => 'Import jobs tables not found'], 501);
        }

        $validated = $request->validate([
            'module' => 'required|string|max:100',
            'file_name' => 'nullable|string|max:255',
            'rows' => 'required|array',
            'mapping' => 'nullable|array',
            'updateExisting' => 'nullable|boolean',
            'phone_country' => 'nullable|string|max:10',
        ]);

        $module = Str::of($validated['module'])->lower()->trim()->toString();
        if (!in_array($module, ['leads', 'lead'], true)) {
            return response()->json(['message' => 'Unsupported module for Phase A', 'module' => $module], 422);
        }

        $rows = is_array($validated['rows'] ?? null) ? $validated['rows'] : [];
        $mapping = is_array($validated['mapping'] ?? null) ? $validated['mapping'] : [];
        $fileName = $validated['file_name'] ?? ('import_' . now()->format('Y-m-d_H-i-s'));

        $job = ImportJob::create([
            'tenant_id' => $user->tenant_id,
            'uploaded_by' => $user->id,
            'module' => $module === 'lead' ? 'leads' : $module,
            'file_name' => $fileName,
            'source' => 'json',
            'status' => 'processing',
            'started_at' => now(),
            'meta_data' => [
                'update_existing' => (bool) ($validated['updateExisting'] ?? false),
            ],
        ]);

        try {
            $importService->run($job, $job->module, $rows, $mapping, [
                'phone_country' => $validated['phone_country'] ?? null,
                'row_number_start' => 2,
            ]);

            $job->refresh();
            $jobStatus = ($job->failed_rows > 0 || $job->skipped_rows > 0 || $job->warning_rows > 0) ? 'completed_with_issues' : 'completed';
            $job->forceFill([
                'status' => $jobStatus,
                'finished_at' => now(),
            ])->save();

            $this->logLegacyExport($user->tenant_id, $user->id, $job);

            return response()->json([
                'job_id' => $job->id,
                'module' => $job->module,
                'status' => $job->status,
                'summary' => [
                    'total_rows' => $job->total_rows,
                    'success_rows' => $job->success_rows,
                    'failed_rows' => $job->failed_rows,
                    'duplicate_rows' => $job->duplicate_rows,
                    'skipped_rows' => $job->skipped_rows,
                    'warning_rows' => $job->warning_rows,
                ],
            ], 201);
        } catch (\Throwable $e) {
            $job->forceFill([
                'status' => 'failed',
                'finished_at' => now(),
                'meta_data' => array_merge(is_array($job->meta_data) ? $job->meta_data : [], [
                    'error' => $e->getMessage(),
                ]),
            ])->save();

            $this->logLegacyExport($user->tenant_id, $user->id, $job, $e->getMessage());

            return response()->json([
                'message' => 'Import failed',
                'job_id' => $job->id,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function logLegacyExport(?int $tenantId, int $userId, ImportJob $job, ?string $errorMessage = null): void
    {
        try {
            if (!Schema::hasTable('exports')) {
                return;
            }

            // If the job completed with issues, populate a compact legacy error_message so the Imports Report list
            // can show something meaningful in the "Error" column.
            if ($errorMessage === null && $job->status === 'completed_with_issues') {
                $errorMessage = $this->buildLegacyIssuesSummary($job);
            }

            Export::create([
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'module' => 'Leads',
                'action' => 'import',
                'file_name' => $job->file_name ?? ('import_job_' . $job->id),
                'status' => in_array($job->status, ['completed', 'completed_with_issues'], true) ? 'success' : 'failed',
                'meta_data' => [
                    'job_id' => (int) $job->id,
                    'total_rows' => (int) $job->total_rows,
                    'success_rows' => (int) $job->success_rows,
                    'failed_rows' => (int) $job->failed_rows,
                    'duplicate_rows' => (int) $job->duplicate_rows,
                    'skipped_rows' => (int) $job->skipped_rows,
                    'warning_rows' => (int) $job->warning_rows,
                ],
                'error_message' => $errorMessage,
            ]);
        } catch (\Throwable $e) {
            // best-effort
        }
    }

    private function buildLegacyIssuesSummary(ImportJob $job): ?string
    {
        try {
            if (!Schema::hasTable('import_job_rows')) {
                return null;
            }

            $rows = ImportJobRow::query()
                ->where('job_id', $job->id)
                ->orderBy('row_number', 'asc')
                ->limit(250)
                ->get();

            $lines = [];
            foreach ($rows as $r) {
                $rowNo = $r->row_number ?? null;
                $rowNoText = is_numeric($rowNo) ? (string) $rowNo : '';
                $status = strtolower((string) ($r->status ?? ''));

                if (in_array($status, ['failed', 'skipped'], true)) {
                    $msg = trim((string) ($r->reason_message ?? ''));
                    if ($msg !== '') {
                        $lines[] = "Row {$rowNoText}: {$msg}";
                    }
                }

                if (is_array($r->warnings) && !empty($r->warnings)) {
                    foreach ($r->warnings as $w) {
                        if (!is_array($w)) continue;
                        $msg = trim((string) ($w['message'] ?? $w['code'] ?? ''));
                        if ($msg !== '') {
                            $lines[] = "Row {$rowNoText}: {$msg}";
                        }
                    }
                }

                if (count($lines) >= 10) {
                    break;
                }
            }

            $counts = [];
            if ((int) $job->failed_rows > 0) $counts[] = "{$job->failed_rows} failed";
            if ((int) $job->skipped_rows > 0) $counts[] = "{$job->skipped_rows} skipped";
            if ((int) $job->warning_rows > 0) $counts[] = "{$job->warning_rows} warnings";

            $prefix = !empty($counts) ? ('Completed with issues (' . implode(', ', $counts) . ').') : 'Completed with issues.';

            if (empty($lines)) {
                return $prefix . ' See details.';
            }

            return $prefix . "\n" . implode("\n", array_slice($lines, 0, 10));
        } catch (\Throwable $e) {
            return 'Completed with issues. See details.';
        }
    }

    /**
     * @param \Illuminate\Support\Collection<int, ImportJobRow> $jobRows
     * @return array<int, array{key:string,label:string}>
     */
    private function buildReviewedFileColumns($jobRows, string $module): array
    {
        $preferred = [];
        if ($module === 'leads') {
            $preferred = [
                'name' => 'Name',
                'phone' => 'Phone',
                'phone_country' => 'Phone Country',
                'other_mobile' => 'Other Mobile',
                'email' => 'Email',
                'source' => 'Source',
                'project' => 'Project',
                'item' => 'Item',
                'assignedTo' => 'Sales Person',
                'stage' => 'Stage',
                'next_action_date' => 'Next Action Date',
                'next_action_time' => 'Next Action Time',
                'comment' => 'Comment',
                'priority' => 'Priority',
                'notes' => 'Notes',
                'company' => 'Company',
            ];
        }

        $keys = [];
        foreach ($jobRows as $r) {
            $raw = is_array($r->raw_data) ? $r->raw_data : [];
            foreach (array_keys($raw) as $k) {
                $k = (string) $k;
                if ($k === '' || str_starts_with($k, '_')) continue;
                $keys[$k] = true;
            }
        }

        $out = [];
        foreach ($preferred as $k => $label) {
            if (isset($keys[$k])) {
                $out[] = ['key' => $k, 'label' => $label];
                unset($keys[$k]);
            }
        }

        $remaining = array_keys($keys);
        sort($remaining);
        foreach ($remaining as $k) {
            $label = trim(str_replace(['_', '-'], ' ', (string) $k));
            $label = $label === '' ? (string) $k : ucwords($label);
            $out[] = ['key' => (string) $k, 'label' => $label];
        }

        return $out;
    }

    /**
     * @param array<int, array{key:string,label:string}> $columns
     */
    private function columnIndexForKey(string $key, array $columns): int
    {
        $i = 1;
        foreach ($columns as $col) {
            if (($col['key'] ?? null) === $key) {
                return $i;
            }
            $i++;
        }
        return 0;
    }

    private function normalizeReviewedFieldKey(string $field): string
    {
        $field = trim($field);
        if ($field === '') return '';
        $field = str_replace([' ', '-'], '_', $field);
        return $field;
    }

    /**
     * @param array<int, array{key:string,label:string}> $columns
     */
    private function mapReviewedFieldToColumnKey(string $fieldKey, array $columns): ?string
    {
        if ($fieldKey === '') return null;

        $aliases = [
            'sales_person' => 'assignedTo',
            'assigned_to' => 'assignedTo',
            'assignedto' => 'assignedTo',
            'phone_country' => 'phone_country',
        ];
        if (isset($aliases[$fieldKey])) {
            $fieldKey = $aliases[$fieldKey];
        }

        foreach ($columns as $col) {
            if (($col['key'] ?? null) === $fieldKey) {
                return $fieldKey;
            }
        }

        // Fallback: try case-insensitive match
        $lower = strtolower($fieldKey);
        foreach ($columns as $col) {
            $k = (string) ($col['key'] ?? '');
            if (strtolower($k) === $lower) {
                return $k;
            }
        }

        return null;
    }
}
