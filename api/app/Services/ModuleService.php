<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Collection;

class ModuleService
{
    public function enabledForTenant(Tenant $tenant): Collection
    {
        return Cache::remember("tenant_modules_enabled_{$tenant->id}", 600, function () use ($tenant) {
            return $tenant->modules()->wherePivot('is_enabled', true)->get();
        });
    }
}
