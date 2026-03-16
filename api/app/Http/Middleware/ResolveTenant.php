<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Tenant;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\Cache;

class ResolveTenant
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // قائمة بالراوتات التي لا تتطلب وجود Tenant (مثل تسجيل الدخول، إنشاء مستأجر جديد، الخ)
        $excludedRoutes = [
            'api/crm/login-redirect',
            'crm/login-redirect',
            'api/tenants/register',
            'tenants/register',
            'api/login',
            'login',
            'api/auth/2fa/verify',
            'auth/2fa/verify',
            'sanctum/csrf-cookie'
        ];

        // إذا كان الراوت الحالي ضمن المستثنين، نمرر الطلب فوراً
        if ($request->is($excludedRoutes)) {
            return $next($request);
        }

        $parseTenantSlugFromHost = function (?string $host): ?string {
            $host = strtolower(rtrim((string) $host, '.'));
            if ($host === '') {
                return null;
            }

            $parts = explode('.', $host);
            if (count($parts) <= 2) {
                return null;
            }

            $candidate = $parts[0] ?? null;
            if (!$candidate) {
                return null;
            }

            // Ignore infrastructure subdomains that are not tenants (e.g. api.besouholacrm.net).
            if (in_array($candidate, ['www', 'api'], true)) {
                return null;
            }

            return $candidate;
        };

        // 1. Extract tenant slug from subdomain or other sources
        // Assuming route parameter {tenant} is used in Route::domain('{tenant}.yourdomain.com')
        $slug = $request->route('tenant');

        if (!$slug) {
            // Fallback 1: Check if tenant is already bound by InitializeTenancy (e.g. via X-Tenant header)
            if (app()->bound('tenant')) {
                $slug = app('tenant')->slug;
            }
            
            // Fallback 2: Check X-Tenant or X-Tenant-Id header explicitly
            if (!$slug && ($request->hasHeader('X-Tenant') || $request->hasHeader('X-Tenant-Id'))) {
                $slug = $request->header('X-Tenant') ?: $request->header('X-Tenant-Id');
            }

            // Fallback 3: parse Origin host (browser requests to api.* keep tenant in Origin, not Host)
            if (!$slug && $request->headers->has('Origin')) {
                $originHost = parse_url((string) $request->header('Origin'), PHP_URL_HOST);
                $slug = $parseTenantSlugFromHost($originHost);
            }

            // Fallback 4: use authenticated user's tenant (works when API host is api.*)
            if (!$slug && $request->user() && !$request->user()->is_super_admin && $request->user()->tenant_id) {
                $slug = Tenant::whereKey($request->user()->tenant_id)->value('slug');
            }

            // Fallback 5: parse request host (for actual tenant subdomains)
            if (!$slug) {
                $slug = $parseTenantSlugFromHost($request->getHost());
            }
        }

        if (!$slug) {
            // No subdomain found
            return $next($request); 
            // Or abort if strict? User says "The system must dynamically resolve... Abort if not found"
            // But main domain (www) might not have a tenant.
            // If this middleware is applied to the tenant route group, it MUST have a slug.
        }

        // 2. Fetch tenant record (with caching)
        $cacheKey = "tenant_{$slug}";
        try {
            $tenant = Cache::remember($cacheKey, 3600, function () use ($slug) {
                return Tenant::with(['modules' => function ($query) {
                    $query->wherePivot('is_enabled', true);
                }])->where('slug', $slug)->first();
            });
        } catch (\Throwable $e) {
            // Never 500 the whole app because Redis / cache is temporarily unavailable.
            $tenant = Tenant::with(['modules' => function ($query) {
                $query->wherePivot('is_enabled', true);
            }])->where('slug', $slug)->first();
        }

        // 3. Validate tenant
        if (!$tenant) {
            abort(404, 'Tenant not found.');
        }

        if ($tenant->status !== 'active' && $tenant->status !== 'trial') {
            abort(403, 'Tenant is ' . $tenant->status);
        }

        // 4. Bind tenant globally
        app()->instance('tenant', $tenant);
        app()->instance('current_tenant_id', $tenant->id);
        
        // Laravel 11/12 Context
        Context::add('tenant_id', $tenant->id);

        // Spatie Permissions
        setPermissionsTeamId($tenant->id);

        // Optional: Set database connection if using multi-database (User chose Shared Database)
        // Since it's shared database with Scope, we just need the ID binding.

        // 5. Remove tenant param from route so controllers don't need to accept it
        $request->route()->forgetParameter('tenant');

        return $next($request);
    }
}
