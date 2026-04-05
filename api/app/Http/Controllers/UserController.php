<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Tenant;
use App\Services\TenantStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $authUser = $request->user();

        $query = User::with(['team.department', 'roles', 'manager']);

        $tenantIdContext = null;
        if (app()->bound('current_tenant_id')) {
            $tenantIdContext = app('current_tenant_id');
        } elseif (app()->bound('tenant')) {
            $tenantIdContext = app('tenant')->id;
        } elseif ($authUser && $authUser->tenant_id) {
            $tenantIdContext = $authUser->tenant_id;
        }

        if ($tenantIdContext !== null) {
            $query->where('tenant_id', $tenantIdContext);
        }

        if ($request->has('department_id')) {
            $query->whereHas('team', function ($q) use ($request) {
                $q->where('department_id', $request->department_id);
            });
        }
        
        if ($request->has('team_id')) {
            $query->where('team_id', $request->team_id);
        }

        if ($request->has('manager_id')) {
            $managerId = $request->manager_id;
            if ($managerId === 'me' && $authUser) {
                $managerId = $authUser->id;
            }
            $query->where('manager_id', $managerId);
        }

        if ($request->has('roles') || $request->has('role')) {
            $rolesParam = $request->get('roles', $request->get('role'));
            $roles = is_array($rolesParam)
                ? $rolesParam
                : collect(explode(',', (string) $rolesParam))
                    ->map(fn($r) => trim($r))
                    ->filter()
                    ->all();
            if (!empty($roles)) {
                $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
                $query->whereHas('roles', function ($q) use ($roles, $tenantId) {
                    $q->whereIn('name', $roles);
                    if ($tenantId !== null) {
                        $q->where('roles.' . config('permission.column_names.team_foreign_key'), $tenantId);
                    }
                });
            }
        }
        
        if ($authUser && !$authUser->is_super_admin) {
            $roleLower = strtolower($authUser->role ?? '');
            $roles = $authUser->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
            $allowed = [
                'admin',
                'tenant admin',
                'tenant-admin',
                'sales admin',
                'operation manager',
                'director',
            ];
            $isPrivileged = in_array($roleLower, $allowed)
                || collect($roles)->intersect($allowed)->isNotEmpty();

            if (!$isPrivileged) {
                $tenantId = $authUser->tenant_id;
                $all = User::where('tenant_id', $tenantId)->get(['id', 'manager_id', 'tenant_id']);
                $byManager = [];
                foreach ($all as $u) {
                    $byManager[$u->manager_id ?? 0][] = $u;
                }
                $ids = [];
                $queue = [$authUser->id];
                $visited = [];
                while (!empty($queue)) {
                    $current = array_shift($queue);
                    if (isset($visited[$current])) {
                        continue;
                    }
                    $visited[$current] = true;
                    $children = $byManager[$current] ?? [];
                    foreach ($children as $child) {
                        $ids[] = (int) $child->id;
                        $queue[] = (int) $child->id;
                    }
                }
                $ids[] = (int) $authUser->id;
                $query->whereIn('id', $ids);
            }
        }

        $users = $query->get();

        // Calculate Inherited and Total Targets
        $this->calculateTargets($users);

        $users->each(function (User $user) {
            $user->append(['avatar_url']);
        });

        return $users;
    }

    /**
     * Calculate inherited and total targets for a collection of users.
     * This assumes the collection contains all relevant users for the hierarchy.
     */
    protected function calculateTargets($users)
    {
        // Build adjacency list
        $byManager = [];
        $userMap = [];
        
        foreach ($users as $user) {
            $userMap[$user->id] = $user;
            $mid = $user->manager_id;
            if ($mid) {
                if (!isset($byManager[$mid])) {
                    $byManager[$mid] = [];
                }
                $byManager[$mid][] = $user->id;
            }
            // Initialize calculated fields
            $user->inherited_monthly_target = 0;
            $user->inherited_yearly_target = 0;
            $user->total_monthly_target = (float)($user->monthly_target ?? 0);
            $user->total_yearly_target = (float)($user->yearly_target ?? 0);
        }

        // Calculate hierarchical targets
        $calculated = [];
        foreach ($users as $user) {
            $this->calculateUserTarget($user->id, $userMap, $byManager, $calculated);
        }

        // Special Logic for Top-Level Roles (Director, Sales Admin, Operator, Tenant Admin)
        // Their Total Target = Sum of Personal Targets of ALL users in the tenant.
        
        // 1. Calculate Tenant Total Personal Targets
        $tenantTotalMonthly = 0;
        $tenantTotalYearly = 0;

        foreach ($users as $user) {
            $tenantTotalMonthly += (float)($user->monthly_target ?? 0);
            $tenantTotalYearly += (float)($user->yearly_target ?? 0);
        }

        $superManagerRoles = [
            'director',
            'sales admin',
            'operator',
            'tenant admin',
            'tenant-admin',
            'admin' // Sometimes just 'admin' is used for tenant admin
        ];

        foreach ($users as $user) {
            $userRoles = [];
            
            // Check roles relation
            if ($user->relationLoaded('roles')) {
                foreach ($user->roles as $role) {
                    $userRoles[] = strtolower(trim($role->name));
                }
            }
            
            // Check direct role attribute if exists
            if (!empty($user->role)) {
                $userRoles[] = strtolower(trim($user->role));
            }

            $isSuperManager = false;
            foreach ($superManagerRoles as $smRole) {
                if (in_array($smRole, $userRoles)) {
                    $isSuperManager = true;
                    break;
                }
            }

            if ($isSuperManager) {
                // Override Total Target
                $user->total_monthly_target = $tenantTotalMonthly;
                $user->total_yearly_target = $tenantTotalYearly;
                
                // Recalculate Inherited = Total - Personal
                // (This ensures Personal + Inherited = Total)
                $user->inherited_monthly_target = $tenantTotalMonthly - (float)($user->monthly_target ?? 0);
                $user->inherited_yearly_target = $tenantTotalYearly - (float)($user->yearly_target ?? 0);
            }
        }
    }

    protected function calculateUserTarget($userId, &$userMap, &$byManager, &$calculated)
    {
        if (isset($calculated[$userId])) {
            return $calculated[$userId];
        }

        $user = $userMap[$userId] ?? null;
        if (!$user) {
            return ['monthly' => 0, 'yearly' => 0];
        }

        $childrenIds = $byManager[$userId] ?? [];
        $inheritedMonthly = 0;
        $inheritedYearly = 0;

        foreach ($childrenIds as $childId) {
            $childTotals = $this->calculateUserTarget($childId, $userMap, $byManager, $calculated);
            $inheritedMonthly += $childTotals['monthly'];
            $inheritedYearly += $childTotals['yearly'];
        }

        $user->inherited_monthly_target = $inheritedMonthly;
        $user->inherited_yearly_target = $inheritedYearly;
        
        $user->total_monthly_target = (float)($user->monthly_target ?? 0) + $inheritedMonthly;
        $user->total_yearly_target = (float)($user->yearly_target ?? 0) + $inheritedYearly;

        $calculated[$userId] = [
            'monthly' => $user->total_monthly_target,
            'yearly' => $user->total_yearly_target
        ];

        return $calculated[$userId];
    }

    public function store(Request $request, TenantStorageService $storage)
    {
        // Check User Limit
        $tenantId = null;
        if (app()->bound('current_tenant_id')) {
            $tenantId = app('current_tenant_id');
        } elseif (app()->bound('tenant')) {
            $tenantId = app('tenant')->id;
        } elseif ($request->user() && $request->user()->tenant_id) {
            $tenantId = $request->user()->tenant_id;
        }

        if ($tenantId) {
             $tenant = Tenant::find($tenantId);
             if ($tenant && $tenant->users_limit) {
                 // Count all users for this tenant to enforce limit strictly
                 $currentCount = User::withoutGlobalScopes()->where('tenant_id', $tenantId)->count();
                 if ($currentCount >= $tenant->users_limit) {
                     return response()->json([
                         'message' => 'User limit reached (' . $currentCount . '/' . $tenant->users_limit . '). Upgrade your plan to add more users.'
                     ], 403);
                 }
             }
        }

        $emailUnique = Rule::unique('users', 'email');
        $usernameUnique = Rule::unique('users', 'username');
        if ($tenantId === null) {
            $emailUnique = $emailUnique->whereNull('tenant_id');
            $usernameUnique = $usernameUnique->whereNull('tenant_id');
        } else {
            $emailUnique = $emailUnique->where('tenant_id', $tenantId);
            $usernameUnique = $usernameUnique->where('tenant_id', $tenantId);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', $emailUnique],
            'password' => 'required|string|min:8',
            'team_id' => 'nullable|exists:teams,id',
            'username' => ['nullable', 'string', 'max:255', $usernameUnique],
            'phone' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date',
            'status' => 'nullable|in:Active,Inactive,Suspended',
            'manager_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:departments,id',
            'avatar' => 'nullable|image|max:5120',
            'monthly_target' => 'nullable|numeric|min:0',
            'quarterly_target' => 'nullable|numeric|min:0',
            'yearly_target' => 'nullable|numeric|min:0',
            'commission_percentage' => 'nullable|numeric|min:0|max:100',
        ]);
        
        if ($request->hasFile('avatar')) {
            $upload = $storage->upload($request->file('avatar'), 'avatars');
            $validated['avatar'] = $upload['path'];
        }

        $validated['password'] = Hash::make($validated['password']);

        if ($tenantId !== null) {
            $validated['tenant_id'] = $tenantId;
        }
        
        $user = User::create($validated);
        
        if ($request->has('role')) {
            $roleName = $request->role;
            if (!empty($roleName)) {
                $tenantId = $user->tenant_id;
                $teamFk = config('permission.column_names.team_foreign_key', 'tenant_id');

                if (function_exists('setPermissionsTeamId') && $tenantId) {
                    setPermissionsTeamId($tenantId);
                }

                $roleAttributes = [
                    'name' => $roleName,
                    'guard_name' => 'web',
                ];

                if ($tenantId) {
                    $roleAttributes[$teamFk] = $tenantId;
                }

                $role = Role::firstOrCreate($roleAttributes);
                // Keep a single "current role" per user (prevents multiple roles causing UI to show the wrong one).
                $user->syncRoles([$role]);
                $user->job_title = $roleName;
                $user->save();
            }
        }

        $this->applyDuplicatePermissions($request, $user);

        $this->storeModulePermissions($request, $user);

        return response()->json($user->load(['roles', 'manager', 'team.department']), 201);
    }
    
    public function show(User $user)
    {
        $user->load(['team.department', 'roles', 'manager']);
        
        // For show, we need to calculate targets too.
        // We need the whole hierarchy to do this accurately if it depends on subordinates.
        // If we only have the user, we can't calculate inherited target without querying subordinates.
        // We'll do a fresh query for subordinates (recursive).
        
        // Optimization: Fetch all users of the same tenant to build tree, then pick this user.
        // This ensures O(N) instead of N+1 recursive queries, and N is small per tenant.
        $allUsers = User::where('tenant_id', $user->tenant_id)->get();
        $this->calculateTargets($allUsers);
        
        // Find the user in the calculated collection to get the values
        $calculatedUser = $allUsers->firstWhere('id', $user->id);
        if ($calculatedUser) {
            $user->inherited_monthly_target = $calculatedUser->inherited_monthly_target;
            $user->inherited_yearly_target = $calculatedUser->inherited_yearly_target;
            $user->total_monthly_target = $calculatedUser->total_monthly_target;
            $user->total_yearly_target = $calculatedUser->total_yearly_target;
        }

        return $user;
    }

    public function update(Request $request, User $user, TenantStorageService $storage)
    {
        $emailUnique = Rule::unique('users', 'email')->ignore($user->id);
        $usernameUnique = Rule::unique('users', 'username')->ignore($user->id);
        if ($user->tenant_id === null) {
            $emailUnique = $emailUnique->whereNull('tenant_id');
            $usernameUnique = $usernameUnique->whereNull('tenant_id');
        } else {
            $emailUnique = $emailUnique->where('tenant_id', $user->tenant_id);
            $usernameUnique = $usernameUnique->where('tenant_id', $user->tenant_id);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', $emailUnique],
            'password' => 'sometimes|string|min:8',
            'team_id' => 'nullable|exists:teams,id',
            'username' => ['nullable', 'string', 'max:255', $usernameUnique],
            'phone' => 'nullable|string|max:20',
            'birth_date' => 'nullable|date',
            'status' => 'nullable|in:Active,Inactive,Suspended',
            'manager_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:departments,id',
            'avatar' => 'nullable|image|max:5120',
            'monthly_target' => 'nullable|numeric|min:0',
            'quarterly_target' => 'nullable|numeric|min:0',
            'yearly_target' => 'nullable|numeric|min:0',
            'commission_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        if (array_key_exists('password', $validated) && $this->isPrimaryAdmin($user)) {
            return response()->json([
                'message' => 'Password for primary admin user cannot be changed.',
            ], 403);
        }
        
        $previousStatus = $user->status;
        $newStatus = $validated['status'] ?? $previousStatus;

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                $storage->delete($user->avatar);
            }
            $upload = $storage->upload($request->file('avatar'), 'avatars');
            $validated['avatar'] = $upload['path'];
        }
        
        $user->update($validated);

        if ($previousStatus === 'Active' && $newStatus === 'Inactive') {
            $user->tokens()->delete();
        }
        
        if ($request->has('role')) {
            $roleName = $request->role;

            if (!empty($roleName)) {
                $tenantId = $user->tenant_id;
                $teamFk = config('permission.column_names.team_foreign_key', 'tenant_id');

                if (function_exists('setPermissionsTeamId') && $tenantId) {
                    setPermissionsTeamId($tenantId);
                }

                $roleAttributes = [
                    'name' => $roleName,
                    'guard_name' => 'web',
                ];

                if ($tenantId) {
                    $roleAttributes[$teamFk] = $tenantId;
                }

                $role = Role::firstOrCreate($roleAttributes);
                $user->syncRoles([$role]);
                $user->job_title = $roleName;
                $user->save();
            } else {
                $user->syncRoles([]);
                $user->job_title = null;
                $user->save();
            }
        }

        $this->applyDuplicatePermissions($request, $user);

        $this->storeModulePermissions($request, $user);

        // Recalculate targets for the updated user
        $allUsers = User::where('tenant_id', $user->tenant_id)->get();
        // We need to update the user in the collection with the new values we just saved
        // but $allUsers already has the fresh data from DB because we just saved $user
        $this->calculateTargets($allUsers);
        
        $calculatedUser = $allUsers->firstWhere('id', $user->id);
        if ($calculatedUser) {
            $user->inherited_monthly_target = $calculatedUser->inherited_monthly_target;
            $user->inherited_yearly_target = $calculatedUser->inherited_yearly_target;
            $user->total_monthly_target = $calculatedUser->total_monthly_target;
            $user->total_yearly_target = $calculatedUser->total_yearly_target;
        }

        return response()->json($user->load(['roles', 'manager', 'team.department']));
    }
    
    public function destroy(User $user)
    {
        if ($this->isPrimaryAdmin($user)) {
            return response()->json([
                'message' => 'Primary admin user cannot be deleted.',
            ], 403);
        }

        $user->delete();
        return response()->noContent();
    }

    public function avatar(User $user)
    {
        if (!$user->avatar) {
            abort(404);
        }
        
        // Security Check: Same Tenant Only (unless Super Admin)
        $authUser = \Illuminate\Support\Facades\Auth::user();
        if (! $authUser) {
            abort(401);
        }
        if ($authUser->tenant_id !== $user->tenant_id && !$authUser->is_super_admin) {
             abort(403);
        }

        $disk = \Illuminate\Support\Facades\Storage::disk('tenants');
        $contents = $disk->get($user->avatar);

        return response($contents, 200, ['Content-Type' => 'application/octet-stream']);
    }

    protected function storeModulePermissions(Request $request, User $user): void
    {
        $meta = is_array($user->meta_data) ? $user->meta_data : [];
        $current = $meta['module_permissions'] ?? [];
        $current = is_array($current) ? $current : [];

        $permissions = $request->input('permissions');

        // Auto-grant: Sales Person users always get Leads.addAction (hidden in UI).
        // This must not affect other roles.
        $roleName = (string) ($request->input('role') ?? $user->job_title ?? $user->role ?? '');
        $roleNorm = strtolower(trim(preg_replace('/\s+/', ' ', str_replace(['_', '-'], ' ', $roleName))));
        $isSalesPerson = $roleNorm === 'sales person' || $roleNorm === 'salesperson';

        // If permissions were not sent, do nothing for non-sales users.
        // For Sales Person, preserve existing permissions and ensure `addAction` exists.
        if (!is_array($permissions)) {
            if (!$isSalesPerson) {
                return;
            }
            $permissions = $current;
        }

        if ($isSalesPerson) {
            $leadPerms = $permissions['Leads'] ?? [];
            $leadPerms = is_array($leadPerms) ? $leadPerms : [];
            if (!in_array('addAction', $leadPerms, true)) {
                $leadPerms[] = 'addAction';
            }
            $permissions['Leads'] = array_values(array_unique($leadPerms));
        }
        $meta['module_permissions'] = $permissions;
        $user->meta_data = $meta;
        $user->save();
    }

    protected function applyDuplicatePermissions(Request $request, User $user): void
    {
        $permissions = $request->input('permissions', []);
        $leadPerms = is_array($permissions) ? ($permissions['Leads'] ?? []) : [];
        $leadPerms = is_array($leadPerms) ? $leadPerms : [];

        // Ensure permissions exist
        $view = Permission::firstOrCreate(['name' => 'view-duplicate-leads', 'guard_name' => 'web']);
        $act  = Permission::firstOrCreate(['name' => 'act-on-duplicate-leads', 'guard_name' => 'web']);

        // Spatie teams context
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (function_exists('setPermissionsTeamId') && $tenantId) {
            setPermissionsTeamId($tenantId);
        }

        // Assign or revoke based on selected items
        if (in_array('viewDuplicateLeads', $leadPerms, true)) {
            $user->givePermissionTo($view);
        } else {
            if ($user->hasPermissionTo($view->name)) {
                $user->revokePermissionTo($view);
            }
        }
        if (in_array('actOnDuplicateLeads', $leadPerms, true)) {
            $user->givePermissionTo($act);
        } else {
            if ($user->hasPermissionTo($act->name)) {
                $user->revokePermissionTo($act);
            }
        }
    }

    protected function isPrimaryAdmin(User $user): bool
    {
        if ($user->is_super_admin) {
            return true;
        }

        $tenant = $user->tenant;
        if (!$tenant) {
            return false;
        }

        $owner = $tenant->owner;
        return $owner && $owner->id === $user->id;
    }
}
