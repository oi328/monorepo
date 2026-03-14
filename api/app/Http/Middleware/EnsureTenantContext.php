<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantContext
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(401);
        }

        // If Super Admin, allow context switching if provided, otherwise default to global view
        if ($user->is_super_admin) {
            return $next($request);
        }

        // For regular users, ensure they are accessing resources within their tenant
        // This is mostly a secondary check since scopes handle data, 
        // but it can be used to validate route parameters or headers.
        
        // Example: If a route has {tenant} param, verify it matches
        if ($request->route('tenant')) {
            $routeTenantId = $request->route('tenant');
            // If route param is object, get ID
            if ($routeTenantId instanceof \App\Models\Tenant) {
                $routeTenantId = $routeTenantId->id;
            }

            if ($user->tenant_id != $routeTenantId) {
                abort(403, 'Unauthorized access to this tenant context.');
            }
        }

        return $next($request);
    }
}
