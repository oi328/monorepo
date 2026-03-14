<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SuperAdminImpersonationController extends Controller
{
    public function impersonate(Request $request, $tenantId)
    {
        $user = $request->user();

        if (!$user || !$user->is_super_admin) {
            abort(403, 'Super Admin access required.');
        }

        $tenant = Tenant::findOrFail($tenantId);

        $request->session()->put('impersonated_tenant_id', $tenant->id);

        activity()
            ->causedBy($user)
            ->performedOn($tenant)
            ->withProperties(['tenant_id' => $tenant->id])
            ->log('super_admin_impersonate_tenant');

        return response()->json([
            'message' => 'Impersonation started',
            'tenant' => $tenant->only(['id', 'name', 'slug']),
        ]);
    }

    public function stop(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->is_super_admin) {
            abort(403, 'Super Admin access required.');
        }

        $tenantId = $request->session()->pull('impersonated_tenant_id');

        if ($tenantId) {
            $tenant = Tenant::find($tenantId);
            activity()
                ->causedBy($user)
                ->performedOn($tenant)
                ->withProperties(['tenant_id' => $tenantId])
                ->log('super_admin_stop_impersonation');
        }

        return response()->json([
            'message' => 'Impersonation stopped',
        ]);
    }
}

