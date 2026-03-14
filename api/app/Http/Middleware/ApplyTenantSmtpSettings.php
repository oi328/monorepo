<?php

namespace App\Http\Middleware;

use App\Models\SmtpSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;

class ApplyTenantSmtpSettings
{
    public function handle(Request $request, Closure $next)
    {
        $tenantId = null;
        $user = Auth::user();
        if ($user && $user->tenant_id) {
            $tenantId = (int) $user->tenant_id;
        } elseif (app()->bound('tenant')) {
            $tenant = app('tenant');
            $tenantId = (int) ($tenant->id ?? 0);
        }

        if ($tenantId) {
            $settings = SmtpSetting::where('tenant_id', $tenantId)->first();
            if ($settings && $settings->host) {
                Config::set('mail.default', 'smtp');
                Config::set('mail.mailers.smtp', [
                    'transport' => 'smtp',
                    'host' => $settings->host,
                    'port' => $settings->port ?: 587,
                    'encryption' => strtolower((string)$settings->encryption) === 'none' ? null : strtolower((string)$settings->encryption),
                    'username' => $settings->username,
                    'password' => $settings->password,
                    'timeout' => 10,
                ]);
                if ($settings->from_email) {
                    Config::set('mail.from.address', $settings->from_email);
                }
                if ($settings->from_name) {
                    Config::set('mail.from.name', $settings->from_name);
                }
            } else {
                Config::set('mail.default', 'log');
            }
        }

        return $next($request);
    }
}
