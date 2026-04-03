<?php

namespace App\Http\Controllers;

use App\Models\Export;
use App\Traits\UserHierarchyTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ExportController extends Controller
{
    use UserHierarchyTrait;

    /**
     * Display a listing of the exports.
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            if (!\Illuminate\Support\Facades\Schema::hasTable('exports')) {
                return response()->json(['data' => [], 'total' => 0, 'message' => 'Exports table not found'], 200);
            }

            $query = Export::with('user:id,name');

            // Apply manual tenant scoping (even if trait is there, let's be explicit)
            if ($user->tenant_id) {
                $query->where('exports.tenant_id', $user->tenant_id);
            }

            // --- Apply Visibility Filter (Hierarchy) ---
            $roleLower = strtolower($user->role ?? '');
            $isAdminOrManager = $user->is_super_admin || 
                                in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

            if (!$isAdminOrManager) {
                $viewableUserIds = $this->getViewableUserIds($user);
                if ($viewableUserIds !== null) {
                    $query->whereIn('exports.user_id', $viewableUserIds);
                } else {
                    $query->where('exports.user_id', $user->id);
                }
            }
            // ------------------------------------------

            // Filter by Action (Default to export if not provided)
            $action = $request->input('action', 'export');
            if ($action !== 'all') {
                $query->where('exports.action', $action);
            }

            // Filter by Module
            if ($request->has('module') && !empty($request->module)) {
                $query->where('exports.module', $request->module);
            }

            // Filter by User
            if ($request->has('user_id') && !empty($request->user_id)) {
                $query->where('exports.user_id', $request->user_id);
            }

            // Filter by Date Range
            if ($request->has('date_from') && !empty($request->date_from)) {
                $query->whereDate('exports.created_at', '>=', $request->date_from);
            }
            if ($request->has('date_to') && !empty($request->date_to)) {
                $query->whereDate('exports.created_at', '<=', $request->date_to);
            }

            // Sorting
            $query->orderBy('exports.created_at', 'desc');

            $exports = $query->paginate($request->get('per_page', 15));

            return response()->json($exports);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Exports Index Error: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to fetch exports',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new export record.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'module' => 'required|string',
                'action' => 'nullable|string',
                'file_name' => 'required|string',
                'format' => 'nullable|string',
                'status' => 'nullable|string',
                'filters' => 'nullable',
                'meta_data' => 'nullable|array',
                'error_message' => 'nullable|string',
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        }

        try {
            $user = $request->user();

            $action = trim((string) ($validated['action'] ?? ''));
            if ($action === '') {
                $path = '/' . ltrim((string) $request->path(), '/');
                $action = Str::contains($path, '/imports') ? 'import' : 'export';
            }

            $export = Export::create([
                'tenant_id' => $user->tenant_id,
                'user_id' => $user->id,
                'module' => $validated['module'],
                'action' => $action,
                'file_name' => $validated['file_name'],
                'format' => $request->input('format', 'xlsx'),
                'status' => $request->input('status', 'success'),
                'filters' => is_string($request->input('filters')) ? $request->input('filters') : json_encode($request->input('filters')),
                'meta_data' => $request->input('meta_data', []),
                'error_message' => $request->input('error_message'),
            ]);

            return response()->json($export, 201);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Export Store Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to store export',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get statistics for exports.
     */
    public function stats(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            $query = Export::query();

            // Apply manual tenant scoping
            if ($user->tenant_id) {
                $query->where('exports.tenant_id', $user->tenant_id);
            }

            // --- Apply Visibility Filter (Hierarchy) ---
            $roleLower = strtolower($user->role ?? '');
            $isAdminOrManager = $user->is_super_admin || 
                                in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

            if (!$isAdminOrManager) {
                $viewableUserIds = $this->getViewableUserIds($user);
                if ($viewableUserIds !== null) {
                    $query->whereIn('exports.user_id', $viewableUserIds);
                } else {
                    $query->where('exports.user_id', $user->id);
                }
            }
            // ------------------------------------------

            // Filter by Action (Default to export if not provided)
            $action = $request->input('action', 'export');
            if ($action !== 'all') {
                $query->where('exports.action', $action);
            }

            // Filter by Date Range
            if ($request->has('date_from') && !empty($request->date_from)) {
                $query->whereDate('exports.created_at', '>=', $request->date_from);
            }
            if ($request->has('date_to') && !empty($request->date_to)) {
                $query->whereDate('exports.created_at', '<=', $request->date_to);
            }

            // 1. Total Exports
            $totalExports = $query->count();

            // 1b. Success vs Failed
            $successfulExports = (clone $query)->where('status', 'success')->count();
            $failedExports = (clone $query)->where('status', 'failed')->count();

            // 2. Exports by Module
            $byModule = (clone $query)
                ->select('module', DB::raw('count(*) as count'))
                ->groupBy('module')
                ->orderByDesc('count')
                ->limit(5)
                ->get();

            // 3. Exports by User (Top 5 Users)
            $byUser = (clone $query)
                ->join('users', 'exports.user_id', '=', 'users.id')
                ->select('users.name', DB::raw('count(exports.id) as count'))
                ->groupBy('users.name')
                ->orderByDesc('count')
                ->limit(5)
                ->get();

            // 4. Activity Over Time (Daily for last 30 days or selected range)
            $activity = (clone $query)
                ->selectRaw('DATE(created_at) as date, count(*) as count')
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            return response()->json([
                'total_exports' => $totalExports,
                'successful_exports' => $successfulExports,
                'failed_exports' => $failedExports,
                'by_module' => $byModule,
                'by_user' => $byUser,
                'activity' => $activity
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Exports Stats Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch export stats',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
