<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Collection;

class ModuleService
{
    public function enabledForTenant(Tenant $tenant): Collection
    {
        $key = "tenant_modules_enabled_{$tenant->id}";

        try {
            return Cache::remember($key, 600, function () use ($tenant) {
                return $tenant->modules()->wherePivot('is_enabled', true)->get();
            });
        } catch (\Throwable $e) {
            // Never break login / critical flows if the cache store (often Redis) is unavailable.
            Log::warning('ModuleService cache failed; falling back to DB query.', [
                'tenant_id' => $tenant->id,
                'cache_key' => $key,
                'error' => $e->getMessage(),
            ]);

            return $tenant->modules()->wherePivot('is_enabled', true)->get();
        }
    }
}
