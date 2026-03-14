<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Validation\Rule;

class SuperAdminController extends Controller
{
    protected $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    /**
     * List all tenants with their user counts.
     */
    public function tenants(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $query = Tenant::with(['modules'])
            ->with(['backups' => function ($q) {
                $q->latest()->limit(1);
            }]);

        // Filter by Search (Name or Domain)
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('domain', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Filter by Plan Type
        if ($request->has('plan') && $request->plan && $request->plan !== 'all') {
            $query->where('subscription_plan', $request->plan);
        }

        // Filter by Status
        if ($request->has('status') && $request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by Company Type
        if ($request->has('company_type') && $request->company_type && $request->company_type !== 'all') {
            $query->where('company_type', $request->company_type);
        }

        $tenants = $query->latest()->paginate(20);

        $mapped = $tenants->through(function (Tenant $tenant) {
            $last = $tenant->backups->first();

            // Count users explicitly without global scope to ensure we get all users for this tenant
            $usersCount = User::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->count();

            $owner = User::withoutGlobalScopes()
                ->where('tenant_id', $tenant->id)
                ->orderBy('id')
                ->first();

            $data = $tenant->toArray();
            $data['users_count'] = $usersCount;
            $data['last_backup_status'] = $last?->status;
            $data['last_backup_at'] = $last?->finished_at;
            $data['admin_name'] = $owner?->name;
            $data['admin_email'] = $owner?->email;

            return $data;
        });

        return response()->json([
            'tenants' => $mapped
        ]);
    }

    /**
     * Provision a new tenant via Artisan command + update subscription metadata.
     */
    public function storeTenant(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'domain' => 'required|string|max:255|unique:tenants,domain',
            'slug' => 'required|string|max:64|unique:tenants,slug|regex:/^[a-z0-9\-]+$/',
            'tenancy_type' => 'required|string|in:shared,dedicated',
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|max:255',
            'admin_password' => 'required|string|min:8',
            'plan' => 'nullable|string|in:core,basic,professional,enterprise,custom',
            'modules' => 'nullable|array',
            'modules.*' => 'string|exists:modules,slug',
            'company_type' => 'nullable|string|in:General,Real Estate',
            'users_limit' => 'nullable|integer|min:1',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_lifetime' => 'nullable|boolean',
            'country' => 'nullable|string|max:255',
            'address_line_1' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
        ]);

        $exitCode = Artisan::call('tenants:create', [
            '--name' => $validated['name'],
            '--domain' => $validated['domain'],
            '--slug' => $validated['slug'],
            '--type' => $validated['tenancy_type'],
            '--admin-name' => $validated['admin_name'],
            '--admin-email' => $validated['admin_email'],
            '--admin-password' => $validated['admin_password'],
        ]);

        if ($exitCode !== 0) {
            return response()->json([
                'message' => 'Failed to create tenant',
                'output' => Artisan::output(),
            ], 500);
        }

        $tenant = Tenant::where('slug', $validated['slug'])->firstOrFail();

        $plan = $request->input('plan', 'core');
        $isLifetime = $request->boolean('is_lifetime', false);

        $tenant->subscription_plan = $plan;
        $tenant->company_type = $request->input('company_type', 'General');
        $tenant->users_limit = $request->input('users_limit', $tenant->users_limit ?? 5);
        $tenant->start_date = $request->input('start_date', $tenant->start_date ?? now());
        $tenant->end_date = $isLifetime ? null : $request->input('end_date', $tenant->end_date);
        $tenant->country = $request->input('country', $tenant->country);
        $tenant->city = $request->input('city', $tenant->city);
        $tenant->state = $request->input('state', $tenant->state);
        $tenant->address_line_1 = $request->input('address_line_1', $tenant->address_line_1);
        $tenant->address_line_2 = $request->input('address_line_2', $tenant->address_line_2);

        $meta = is_array($tenant->meta_data) ? $tenant->meta_data : [];
        $subscriptionMeta = $meta['subscription'] ?? [];
        $subscriptionMeta['is_lifetime'] = $isLifetime;
        $meta['subscription'] = $subscriptionMeta;
        $tenant->meta_data = $meta;

        $tenant->save();

        $modules = $request->input('modules', []);
        $this->tenantService->syncTenantModules($tenant, $plan, $modules);

        return response()->json([
            'message' => 'Tenant created successfully',
            'tenant' => $tenant,
        ], 201);
    }

    /**
     * Update tenant subscription details.
     */
    public function update(Request $request, Tenant $tenant)
    {
        $this->authorizeSuperAdmin($request);

        $owner = User::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenant->id)
            ->orderBy('id')
            ->first();

        $ownerId = optional($owner)->id;

        $validated = $request->validate([
            'subscription_plan' => 'nullable|string|in:core,basic,professional,enterprise,custom',
            'company_type' => 'nullable|string|in:General,Real Estate',
            'status' => 'nullable|string|in:active,pending,expired,cancelled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_lifetime' => 'nullable|boolean',
            'users_limit' => 'nullable|integer|min:1',
            'country' => 'nullable|string|max:255',
            'address_line_1' => 'nullable|string|max:255',
            'address_line_2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'modules' => 'nullable|array',
            'modules.*' => 'string|exists:modules,slug',
            'admin_name' => 'nullable|string|max:255',
            'admin_email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'email')
                    ->ignore($ownerId)
                    ->where(function ($query) use ($tenant) {
                        return $query->where('tenant_id', $tenant->id);
                    }),
            ],
        ]);

        $isLifetime = $request->boolean('is_lifetime', false);

        if ($isLifetime) {
            $validated['end_date'] = null;
        }

        $tenant->update($validated);

        if ($request->has('is_lifetime')) {
            $meta = is_array($tenant->meta_data) ? $tenant->meta_data : [];
            $subscriptionMeta = $meta['subscription'] ?? [];
            $subscriptionMeta['is_lifetime'] = $isLifetime;
            $meta['subscription'] = $subscriptionMeta;
            $tenant->meta_data = $meta;
            $tenant->save();
        }

        $plan = $request->input('subscription_plan', $tenant->subscription_plan);
        if ($plan) {
            $modules = $request->input('modules', []);
            $this->tenantService->syncTenantModules($tenant, $plan, $modules);
        }

        if ($owner) {
            $dirty = false;

            if ($request->filled('admin_name')) {
                $owner->name = $request->admin_name;
                $dirty = true;
            }

            if ($request->filled('admin_email')) {
                $owner->email = $request->admin_email;
                $dirty = true;
            }

            if ($dirty) {
                $owner->save();
            }
        }

        return response()->json([
            'message' => 'Tenant updated successfully',
            'tenant' => $tenant
        ]);
    }

    /**
     * List all users across all tenants.
     */
    public function users(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        // Since we are Super Admin, the global scope is bypassed automatically in BelongsToTenant trait
        $users = User::with('tenant')->paginate(20);

        return response()->json([
            'users' => $users
        ]);
    }

    /**
     * Ensure the user is a super admin.
     */
    protected function authorizeSuperAdmin(Request $request)
    {
        if (!$request->user() || !$request->user()->is_super_admin) {
            abort(403, 'Super Admin access required.');
        }
    }
}
