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
        $host = $request->getHost();
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

        if (! $subdomain && $request->hasHeader('X-Tenant')) {
            $subdomain = $request->header('X-Tenant');
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

