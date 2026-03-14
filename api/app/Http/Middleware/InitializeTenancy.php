<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Tenant;

class InitializeTenancy
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = Tenant::current();

        if ($tenant) {
            app()->instance('tenant', $tenant);
        }

        if (Auth::check()) {
            $user = Auth::user();

            if ($user->is_super_admin) {
                if (!app()->bound('tenant')) {
                    setPermissionsTeamId(null);
                    return $next($request);
                }
            } else {
                if ($user->tenant_id) {
                    if (app()->bound('tenant')) {
                        if (app('tenant')->id !== $user->tenant_id) {
                            abort(403, 'Unauthorized access to this workspace.');
                        }
                    } else {
                        setPermissionsTeamId($user->tenant_id);
                        app()->instance('current_tenant_id', $user->tenant_id);

                        $tenantFromUser = Tenant::find($user->tenant_id);
                        if ($tenantFromUser) {
                            app()->instance('tenant', $tenantFromUser);
                        }
                    }
                }
            }
        }

        return $next($request);
    }
}
