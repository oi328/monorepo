<?php

namespace App\Services;

use App\Contracts\TenantResolverInterface;
use App\Models\Tenant;
use Illuminate\Http\Request;

class TenantResolverService implements TenantResolverInterface
{
    public function resolveFromRequest(Request $request): ?Tenant
    {
        // 1. Try to resolve from Header (X-Tenant-Id)
        if ($request->hasHeader('X-Tenant-Id')) {
            $tenantId = $request->header('X-Tenant-Id');
            if ($tenantId && preg_match('/^[a-z0-9-]+$/', $tenantId)) {
                $tenant = Tenant::where('slug', $tenantId)->first();
                if ($tenant) {
                    return $tenant;
                }
            }
        }

        // 2. Fallback to Hostname resolution
        $host = rtrim($request->getHost(), '.');
        $rootDomain = config('app.root_domain', 'besouholacrm.net');
        if ($host === $rootDomain) {
            return null;
        }
        if (!str_ends_with($host, '.' . $rootDomain)) {
            return null;
        }
        $subdomain = substr($host, 0, -strlen('.' . $rootDomain));
        if (!$subdomain) {
            return null;
        }
        if (!preg_match('/^[a-z0-9-]+$/', $subdomain)) {
            return null;
        }
        return Tenant::where('slug', $subdomain)->first();
    }
}
