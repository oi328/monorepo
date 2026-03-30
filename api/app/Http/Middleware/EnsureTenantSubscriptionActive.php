<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureTenantSubscriptionActive
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if ($user && ($user->is_super_admin ?? false)) {
            return $next($request);
        }

        $tenant = app()->bound('tenant') ? app('tenant') : null;
        if (!$tenant) {
            return $next($request);
        }

        // If end_date is a DATE (no time), treat it as inclusive until end of day.
        try {
            $end = $tenant->end_date ? $tenant->end_date->copy()->endOfDay() : null;
        } catch (\Throwable $e) {
            $end = null;
        }

        if ($end && now()->greaterThan($end)) {
            return response()->json([
                'code' => 'subscription_expired',
                'message' => 'Subscription expired. Please renew your subscription to continue.',
                'message_ar' => 'انتهى الاشتراك. برجاء تجديد الاشتراك للمتابعة.',
                'end_date' => optional($tenant->end_date)->toDateString(),
            ], 403);
        }

        return $next($request);
    }
}

