<?php

namespace App\Http\Middleware;

use App\Models\CrmSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Auth;

class SetTenantTimezone
{
    public function handle(Request $request, Closure $next)
    {
        $tz = null;

        // Prefer tenant-bound context
        try {
            if (Schema::hasTable('crm_settings')) {
                if (app()->bound('tenant')) {
                    $settings = CrmSetting::first()?->settings ?? [];
                    $tz = $settings['timeZone'] ?? null;
                } else {
                    // Fallback: infer from user tenant if authenticated
                    if (Auth::check() && Auth::user()->tenant_id) {
                        $settings = CrmSetting::first()?->settings ?? [];
                        $tz = $settings['timeZone'] ?? null;
                    }
                }
            }
        } catch (\Throwable $e) {
            // Silently skip timezone override if table not ready
        }

        if (!$tz) {
            $tz = config('app.timezone', 'UTC');
        }

        if ($tz) {
            config(['app.timezone' => $tz]);
            @date_default_timezone_set($tz);
            @ini_set('date.timezone', $tz);
        }

        return $next($request);
    }
}
