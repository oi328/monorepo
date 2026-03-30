<?php

namespace App\Http\Controllers;

use App\Models\ErpSyncLog;
use App\Models\Tenant;
use Illuminate\Http\Request;
use App\Jobs\RunErpSyncJob;
use App\Services\ErpSyncService;

class ErpSyncController extends Controller
{
    /**
     * Manual ERP sync trigger.
     *
     */
    public function run(Request $request)
    {
        $user = $request->user();
        if (!$user?->tenant_id) {
            return response()->json(['message' => 'User does not belong to a tenant'], 403);
        }

        $roleLower = strtolower(trim((string)($user->role ?? $user->job_title ?? '')));
        $isTenantAdmin = $user->is_super_admin || in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin'], true);
        if (!$isTenantAdmin) {
            return response()->json(['message' => 'You do not have permission to run ERP sync'], 403);
        }

        $validated = $request->validate([
            'mode' => 'nullable|string|in:sync,async',
            'only_entities' => 'nullable|array',
            'only_entities.*' => 'string',
        ]);

        $mode = $validated['mode'] ?? 'sync';
        $only = $validated['only_entities'] ?? null;

        $tenant = app()->bound('tenant') ? app('tenant') : Tenant::find($user->tenant_id);
        if (!$tenant) {
            return response()->json(['message' => 'Tenant context not found.'], 403);
        }

        $options = [];
        if (is_array($only) && !empty($only)) {
            $options['only_entities'] = $only;
        }

        if ($mode === 'async') {
            RunErpSyncJob::dispatch($tenant->id, $user->id, $options);
            return response()->json(['message' => 'ERP sync queued'], 202);
        }

        $summary = app(ErpSyncService::class)->run($tenant, $user, $options);
        return response()->json(['message' => 'ERP sync completed', 'summary' => $summary], 200);
    }
}
