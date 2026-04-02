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
                    ->orWhere('reason_code', 'like', "%{$search}%");
            });
        }

        $query->orderBy('row_number', 'asc');

        return response()->json($query->paginate((int) $request->get('per_page', 25)));
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
            $jobStatus = ($job->failed_rows > 0) ? 'completed_with_issues' : 'completed';
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
}
