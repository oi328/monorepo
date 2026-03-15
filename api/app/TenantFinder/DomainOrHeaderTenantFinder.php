<?php

namespace App\TenantFinder;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Spatie\Multitenancy\Contracts\IsTenant;
use Spatie\Multitenancy\TenantFinder\TenantFinder;

class DomainOrHeaderTenantFinder extends TenantFinder
{
    public function findForRequest(Request $request): ?IsTenant
    {
        $host = rtrim($request->getHost(), '.');
        $rootDomain = config('app.root_domain')
            ?: env('ROOT_DOMAIN')
            ?: (parse_url((string) config('app.frontend_url'), PHP_URL_HOST) ?: null)
            ?: (parse_url((string) config('app.url'), PHP_URL_HOST) ?: null);

        if ($rootDomain) {
            $centralHosts = [
                $rootDomain,
                'www.' . $rootDomain,
                'api.' . $rootDomain,
            ];

            if (in_array($host, $centralHosts, true)) {
                return null;
            }
        }

        $parts = explode('.', $host);
        $isLocal = str_contains($host, 'localhost');

        $subdomain = null;

        if (count($parts) > 0 && $parts[0] === 'www') {
            array_shift($parts);
        }

        if ($isLocal) {
            if (count($parts) > 1) {
                $subdomain = $parts[0];
            }
        } else {
            if (count($parts) > 2) {
                $subdomain = $parts[0];
            }
        }

        if (! $subdomain && ($request->hasHeader('X-Tenant') || $request->hasHeader('X-Tenant-Id'))) {
            $subdomain = $request->header('X-Tenant') ?: $request->header('X-Tenant-Id');
        }

        $tenant = null;

        if ($host) {
            $tenant = Tenant::where('domain', $host)->first();
        }

        if (! $tenant && $subdomain) {
            $tenant = Tenant::where('slug', $subdomain)->first();
        }

        if (! $tenant) {
            return null;
        }

        if ($tenant->status !== 'active' && $tenant->status !== 'trial') {
            return null;
        }

        return $tenant;
    }
}
