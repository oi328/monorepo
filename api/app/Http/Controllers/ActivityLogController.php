<?php

namespace App\Http\Controllers;

use App\Models\LeadAction;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Activitylog\Models\Activity;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityLogController extends Controller
{
    use \App\Traits\UserHierarchyTrait;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        if (!$request->user()->is_super_admin) {
            abort(403, 'Unauthorized');
        }

        $query = Activity::query();

        // Filtering
        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }
        if ($request->has('user_id')) {
            $query->where('causer_id', $request->user_id)
                ->where('causer_type', 'App\Models\User');
        }
        if ($request->has('log_name')) {
            $query->where('log_name', $request->log_name);
        }
        if ($request->has('subject_type')) {
            $query->where('subject_type', $request->subject_type);
        }
        if ($request->has('event')) {
            $query->where('event', $request->event);
        }
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('properties', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortField = $request->input('sort_by', 'created_at');
        $sortDirection = $request->input('sort_dir', 'desc');
        $query->orderBy($sortField, $sortDirection);

        // Pagination
        $perPage = min($request->input('per_page', 50), 500); // Max 500
        $logs = $query->paginate($perPage);

        return response()->json($logs);
    }

    public function tenantLogs(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        $roleLower = strtolower($user->role ?? '');
        $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();

        // Check for privileged roles using string matching to handle variations
        $isAdmin = str_contains($roleLower, 'admin') || collect($roles)->contains(fn($r) => str_contains($r, 'admin'));
        $isManager = str_contains($roleLower, 'manager') || collect($roles)->contains(fn($r) => str_contains($r, 'manager')); // Covers 'sales manager', 'operation manager'
        $isDirector = str_contains($roleLower, 'director') || collect($roles)->contains(fn($r) => str_contains($r, 'director'));
        $isTeamLeader = str_contains($roleLower, 'team leader') || collect($roles)->contains(fn($r) => str_contains($r, 'team leader'));

        $isPrivileged = $user->is_super_admin
            || $user->can('view-reports')
            || $isAdmin
            || $isManager
            || $isDirector
            || $isTeamLeader;

        if (!$isPrivileged) {
            abort(403, 'Unauthorized');
        }

        $tenantId = $user->tenant_id;

        $query = Activity::with('causer');

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        // Apply Hierarchy Filtering
        $viewableIds = $this->getViewableUserIds($user);
        if ($viewableIds !== null) {
            $query->whereIn('causer_id', $viewableIds);
        }

        $perPage = min((int)$request->input('per_page', 500), 1000);

        $logs = $query
            ->orderByDesc('created_at')
            ->limit($perPage)
            ->get();

        $data = $logs->map(function (Activity $activity) {
            $props = $activity->properties;
            if (is_string($props)) {
                $decoded = json_decode($props, true);
                $props = is_array($decoded) ? $decoded : [];
            }
            elseif (!is_array($props)) {
                $props = (array)$props;
            }

            $ip = $props['ip'] ?? ($props['ip_address'] ?? null);
            $module = $this->mapModule($activity);
            $type = $this->mapType($activity);
            $target = $this->buildTarget($activity);
            $causer = $activity->causer;

            return [
            'id' => (int)$activity->id,
            'type' => $type,
            'user' => $causer ? $causer->name : 'System',
            'target' => $target,
            'description' => $activity->description,
            'ts' => $activity->created_at ? $activity->created_at->format('Y-m-d H:i') : null,
            'ip' => $ip,
            'module' => $module,
            ];
        });

        return response()->json($data);
    }

    /**
     * Top agents by number of actions on their own leads.
     */
    public function topAgents(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }
        $tenantId = $user->tenant_id;

        $range = strtolower($request->input('range', 'all'));
        $dateFrom = null;
        $dateTo = now();
        if ($range === 'today') {
            $dateFrom = now()->startOfDay();
            $dateTo = now()->endOfDay();
        }
        elseif ($range === 'weekly') {
            $dateFrom = now()->subDays(6)->startOfDay();
            $dateTo = now()->endOfDay();
        }
        elseif ($range === 'monthly') {
            $dateFrom = now()->startOfMonth();
            $dateTo = now()->endOfMonth();
        }
        else {
            $dateFrom = null;
            $dateTo = null;
        }

        $query = DB::table('activity_log')
            ->join('leads', function ($join) {
            $join->on('leads.id', '=', 'activity_log.subject_id');
        })
            ->join('users', function ($join) {
            $join->on('users.id', '=', 'activity_log.causer_id');
        })
            ->where('activity_log.subject_type', '=', Lead::class)
            ->whereNotNull('activity_log.causer_id')
            ->where('activity_log.causer_type', '=', User::class)
            ->whereColumn('leads.assigned_to', 'activity_log.causer_id');

        if ($tenantId) {
            $query->where('activity_log.tenant_id', $tenantId)
                ->where('leads.tenant_id', $tenantId)
                ->where('users.tenant_id', $tenantId);
        }
        if ($dateFrom && $dateTo) {
            $query->whereBetween('activity_log.created_at', [$dateFrom, $dateTo]);
        }

        $result = $query
            ->groupBy('activity_log.causer_id', 'users.name')
            ->selectRaw('activity_log.causer_id as user_id, users.name as name, COUNT(*) as actions_count')
            ->orderByDesc('actions_count')
            ->limit(10)
            ->get();

        $data = $result->map(function ($row, $index) {
            return [
            'id' => (int)$row->user_id,
            'name' => $row->name,
            'score' => (int)$row->actions_count,
            'isCrowned' => $index === 0,
            'avatar' => null,
            ];
        });

        return response()->json($data);
    }

    protected function collectSubordinatesIds(User $root): array
    {
        $ids = [];
        $all = User::where('tenant_id', $root->tenant_id)->get(['id', 'manager_id', 'tenant_id']);
        $byManager = [];
        foreach ($all as $u) {
            $byManager[$u->manager_id ?? 0][] = $u;
        }
        $queue = [$root->id];
        $visited = [];
        while (!empty($queue)) {
            $current = array_shift($queue);
            if (isset($visited[$current])) {
                continue;
            }
            $visited[$current] = true;
            $children = $byManager[$current] ?? [];
            foreach ($children as $child) {
                $ids[] = (int)$child->id;
                $queue[] = (int)$child->id;
            }
        }
        return $ids;
    }

    public function lastComments(Request $request)
    {
        $user = $request->user();
        if (!$user)
            abort(401, 'Unauthorized');
        $tenantId = $user->tenant_id;
        $employeeIds = $request->input('employee_ids', []);
        if (!is_array($employeeIds))
            $employeeIds = [];
        $managerId = $request->input('manager_id');
        $rangeFrom = $request->input('date_from');
        $rangeTo = $request->input('date_to');
        $ids = [];
        $shouldFilter = false;
        if (!empty($employeeIds)) {
            $ids = array_map('intval', $employeeIds);
        }
        else {
            $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
            $roleLower = strtolower($user->role ?? '');
            $isSalesPerson = str_contains($roleLower, 'sales person') || str_contains($roleLower, 'salesperson') || in_array('sales person', $roles) || in_array('salesperson', $roles);
            $isTeamLeader = str_contains($roleLower, 'team leader') || in_array('team leader', $roles);

            if ($isSalesPerson) {
                $ids = [(int)$user->id];
                $shouldFilter = true;
            }
            elseif ($isTeamLeader) {
                $ids = $this->collectSubordinatesIds($user);
                $ids[] = (int)$user->id;
                $shouldFilter = true;
            }
            elseif (!empty($managerId)) {
                $root = User::where('tenant_id', $tenantId)->find($managerId);
                if ($root) {
                    $ids = $this->collectSubordinatesIds($root);
                    $ids[] = (int)$root->id;
                    $shouldFilter = true;
                }
            }
        }
        
        $query = LeadAction::with(['lead.assignedAgent', 'user'])
            ->where('tenant_id', $tenantId);

        if ($shouldFilter) {
            $query->whereIn('user_id', $ids);
        }
        if (!empty($ids) && !$shouldFilter) { // If ids were provided manually via employee_ids
            $query->whereIn('user_id', $ids);
        }
        if (!empty($rangeFrom)) {
            $query->whereDate('created_at', '>=', $rangeFrom);
        }
        if (!empty($rangeTo)) {
            $query->whereDate('created_at', '<=', $rangeTo);
        }

        $rows = $query->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $data = $rows->map(function ($action) {
            $details = $action->details ?? [];
            $salesPerson = $action->lead && $action->lead->assignedAgent ? $action->lead->assignedAgent->name : null;
            
            // Fallback for sales person name if assignedAgent is null (try assigned_to if it's string, or just Unassigned)
            if (!$salesPerson && $action->lead && $action->lead->assigned_to) {
                 // Check if assigned_to is numeric ID but relation failed (deleted user?) or just a string name legacy
                 if (!is_numeric($action->lead->assigned_to)) {
                     $salesPerson = $action->lead->assigned_to;
                 }
            }

            return [
                'id' => $action->id,
                'employeeName' => $salesPerson ?: 'Unassigned',
                'actionBy' => $action->user ? $action->user->name : 'System',
                'leadName' => $action->lead ? $action->lead->name : ('Lead #' . $action->lead_id),
                'leadId' => $action->lead_id,
                'comment' => $action->description,
                'priority' => $details['priority'] ?? null,
                'type' => $action->action_type,
                'source' => $action->lead ? $action->lead->source : null,
                'createdAt' => $action->created_at->toIso8601String(),
            ];
        });
        
        return response()->json($data);
    }

    public function recentPhoneCalls(Request $request)
    {
        $user = $request->user();
        if (!$user)
            abort(401, 'Unauthorized');
        $tenantId = $user->tenant_id;
        $employeeIds = $request->input('employee_ids', []);
        if (!is_array($employeeIds))
            $employeeIds = [];
        $managerId = $request->input('manager_id');
        $rangeFrom = $request->input('date_from');
        $rangeTo = $request->input('date_to');
        $ids = [];
        $shouldFilter = false;
        if (!empty($employeeIds)) {
            $ids = array_map('intval', $employeeIds);
        }
        else {
            $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
            $roleLower = strtolower($user->role ?? '');
            $isSalesPerson = str_contains($roleLower, 'sales person') || str_contains($roleLower, 'salesperson') || in_array('sales person', $roles) || in_array('salesperson', $roles);
            $isTeamLeader = str_contains($roleLower, 'team leader') || in_array('team leader', $roles);

            $shouldFilter = false;

            if ($isSalesPerson) {
                $ids = [(int)$user->id];
                $shouldFilter = true;
            }
            elseif ($isTeamLeader) {
                $ids = $this->collectSubordinatesIds($user);
                $ids[] = (int)$user->id;
                $shouldFilter = true;
            }
            elseif (!empty($managerId)) {
                $root = User::where('tenant_id', $tenantId)->find($managerId);
                if ($root) {
                    $ids = $this->collectSubordinatesIds($root);
                    $ids[] = (int)$root->id;
                    $shouldFilter = true;
                }
            }
        }
        
        $query = LeadAction::with(['lead', 'user'])
            ->where('tenant_id', $tenantId)
            ->where('action_type', 'call');

        if ($shouldFilter) {
            $query->whereIn('user_id', $ids);
        }
        if (!empty($ids) && !$shouldFilter) {
            $query->whereIn('user_id', $ids);
        }
        if (!empty($rangeFrom)) {
            $query->whereDate('created_at', '>=', $rangeFrom);
        }
        if (!empty($rangeTo)) {
            $query->whereDate('created_at', '<=', $rangeTo);
        }

        $rows = $query->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $data = $rows->map(function ($action) {
            $details = $action->details ?? [];
            return [
                'id' => $action->id,
                'employeeName' => $action->user ? $action->user->name : 'System',
                'leadName' => $action->lead ? $action->lead->name : ('Lead #' . $action->lead_id),
                'leadId' => $action->lead_id,
                'phoneNumber' => $details['phone'] ?? ($action->lead->mobile ?? null),
                'callType' => $details['call_type'] ?? ($details['type'] ?? 'call'),
                'duration' => $details['duration'] ?? '00:00',
                'notes' => $details['notes'] ?? ($action->description ?? ''),
                'createdAt' => $action->created_at->toIso8601String(),
            ];
        });
        
        return response()->json($data);
    }

    /**
     * Export logs to CSV.
     */
    public function export(Request $request)
    {
        if (!$request->user()->is_super_admin) {
            abort(403, 'Unauthorized');
        }

        $query = Activity::query();

        // Apply same filters as index... (Refactoring to a scope or service would be better, but direct here is fine for now)
        if ($request->has('tenant_id'))
            $query->where('tenant_id', $request->tenant_id);
        if ($request->has('user_id'))
            $query->where('causer_id', $request->user_id)->where('causer_type', 'App\Models\User');
        if ($request->has('log_name'))
            $query->where('log_name', $request->log_name);
        if ($request->has('subject_type'))
            $query->where('subject_type', $request->subject_type);
        if ($request->has('event'))
            $query->where('event', $request->event);
        if ($request->has('date_from'))
            $query->whereDate('created_at', '>=', $request->date_from);
        if ($request->has('date_to'))
            $query->whereDate('created_at', '<=', $request->date_to);
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('properties', 'like', "%{$search}%");
            });
        }

        $query->orderBy('created_at', 'desc');

        $response = new StreamedResponse(function () use ($query) {
            $handle = fopen('php://output', 'w');

            // CSV Header
            fputcsv($handle, [
                'ID',
                'Log Name',
                'Description',
                'Subject Type',
                'Event',
                'Causer ID',
                'Tenant ID',
                'Created At'
            ]);

            $query->chunk(1000, function ($logs) use ($handle) {
                    foreach ($logs as $log) {
                        fputcsv($handle, [
                            $log->id,
                            $log->log_name,
                            $log->description,
                            $log->subject_type,
                            $log->event,
                            $log->causer_id,
                            $log->tenant_id,
                            $log->created_at->toDateTimeString()
                        ]);
                    }
                }
                );

                fclose($handle);
            });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="activity_logs.csv"');

        return $response;
    }

    public function activeUsers(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }
        $tenantId = $user->tenant_id;

        $rangeFrom = $request->input('date_from');
        $rangeTo = $request->input('date_to');
        $managerId = $request->input('manager_id');

        // Presence date range (default: today). Stored as date in user_presence_daily.
        $presenceFrom = null;
        $presenceTo = null;
        try {
            $presenceFrom = $rangeFrom ? \Carbon\Carbon::parse($rangeFrom)->toDateString() : null;
        } catch (\Throwable $e) {
            $presenceFrom = null;
        }
        try {
            $presenceTo = $rangeTo ? \Carbon\Carbon::parse($rangeTo)->toDateString() : null;
        } catch (\Throwable $e) {
            $presenceTo = null;
        }
        if (!$presenceFrom && !$presenceTo) {
            $presenceFrom = now()->toDateString();
            $presenceTo = $presenceFrom;
        } elseif ($presenceFrom && !$presenceTo) {
            $presenceTo = $presenceFrom;
        } elseif (!$presenceFrom && $presenceTo) {
            $presenceFrom = $presenceTo;
        }

        $ids = [];
        $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
        $roleLower = strtolower($user->role ?? '');
        $isSalesPerson = str_contains($roleLower, 'sales person') || str_contains($roleLower, 'salesperson') || in_array('sales person', $roles) || in_array('salesperson', $roles);
        $isTeamLeader = str_contains($roleLower, 'team leader') || in_array('team leader', $roles);

        $shouldFilter = false;

        if ($isSalesPerson) {
            $ids = [(int)$user->id];
            $shouldFilter = true;
        }
        elseif ($isTeamLeader) {
            $ids = $this->collectSubordinatesIds($user);
            $ids[] = (int)$user->id;
            $shouldFilter = true;
        }
        elseif (!empty($managerId)) {
            $root = User::where('tenant_id', $tenantId)->find($managerId);
            if ($root) {
                $ids = $this->collectSubordinatesIds($root);
                $ids[] = (int)$root->id;
                $shouldFilter = true;
            }
        }

        $query = User::where('tenant_id', $tenantId)
            ->where('status', 'active');

        // Sum online time within the requested range (or today by default).
        // Guarded to avoid runtime errors if migrations haven't run yet.
        if (Schema::hasTable('user_presence_daily')) {
            $presenceAgg = DB::table('user_presence_daily')
                ->select('user_id', DB::raw('SUM(total_seconds) as working_seconds'))
                ->where('tenant_id', $tenantId)
                ->whereBetween('date', [$presenceFrom, $presenceTo])
                ->groupBy('user_id');

            $query->leftJoinSub($presenceAgg, 'presence', function ($join) {
                $join->on('users.id', '=', 'presence.user_id');
            });

            // Ensure we still hydrate User models while keeping the join result.
            $query->select('users.*');
            $query->addSelect(DB::raw('COALESCE(presence.working_seconds, 0) as working_seconds'));
        } else {
            $query->select('users.*');
            $query->addSelect(DB::raw('0 as working_seconds'));
        }

        if ($shouldFilter) {
            $query->whereIn('id', $ids);
        }

        $query->withCount(['actions as actions_count' => function ($q) use ($rangeFrom, $rangeTo) {
            if ($rangeFrom) {
                $q->where('created_at', '>=', $rangeFrom);
            }
            if ($rangeTo) {
                $q->where('created_at', '<=', $rangeTo);
            }
        }]);

        $query->addSelect(['last_active_at' => \Laravel\Sanctum\PersonalAccessToken::select('last_used_at')
            ->whereColumn('tokenable_id', 'users.id')
            ->where('tokenable_type', User::class)
            ->latest('last_used_at')
            ->limit(1)
        ]);

        $users = $query->get();
        $users = $users->sortByDesc('last_active_at')->values();

        $data = $users->map(function ($u) {
            return [
            'id' => $u->id,
            'name' => $u->name,
            'role' => $u->role ?? $u->getRoleAttribute(),
            'active' => true,
            'last_active' => $u->last_active_at ?\Carbon\Carbon::parse($u->last_active_at)->toIso8601String() : null,
            'actions_count' => $u->actions_count,
            'working_seconds' => (int) ($u->working_seconds ?? 0),
            'working_minutes' => (int) floor(((int) ($u->working_seconds ?? 0)) / 60),
            'avatar' => '',
            ];
        });

        return response()->json($data);
    }

    protected function mapModule(Activity $activity): string
    {
        $name = $activity->log_name ?: 'general';
        if ($name === 'auth') {
            return 'User Management';
        }
        $name = str_replace(['-', '_'], ' ', $name);
        return ucwords($name);
    }

    protected function mapType(Activity $activity): string
    {
        $event = $activity->event ? strtolower($activity->event) : null;
        $description = strtolower($activity->description ?? '');

        if ($event === 'created') {
            return 'Created';
        }
        if ($event === 'updated') {
            return 'Updated';
        }
        if ($event === 'deleted') {
            return 'Deleted';
        }
        if (str_contains($description, 'failed login') || str_contains($description, 'login_failed')) {
            return 'Failed Login';
        }
        if (str_contains($description, 'logged_in') || str_contains($description, 'login')) {
            return 'Login';
        }

        return 'Activity';
    }

    protected function buildTarget(Activity $activity): string
    {
        if ($activity->subject_type && $activity->subject_id) {
            $base = class_basename($activity->subject_type);
            return $base . ' #' . $activity->subject_id;
        }

        return '-';
    }
}
