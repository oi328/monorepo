<?php

namespace App\Http\Middleware;

use App\Models\SmtpSetting;
use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;

class ApplyTenantSmtpSettings
{
    public function handle(Request $request, Closure $next)
    {
        $tenantId = null;

        if (app()->bound('tenant')) {
            $tenant = app('tenant');
            $tenantId = (int) ($tenant->id ?? 0);
        }

        // Avoid calling Auth::user() here: the default guard is "web" (session),
        // which can hit the session store (often Redis) and turn public endpoints
        // like login into HTTP 500 if Redis is unavailable.
        if (! $tenantId) {
            $slug = null;

            if ($request->headers->has('X-Tenant') || $request->headers->has('X-Tenant-Id')) {
                $slug = (string) ($request->header('X-Tenant') ?: $request->header('X-Tenant-Id'));
            } elseif ($request->headers->has('Origin')) {
                $originHost = parse_url((string) $request->header('Origin'), PHP_URL_HOST);
                $originHost = strtolower(rtrim((string) $originHost, '.'));
                $parts = $originHost ? explode('.', $originHost) : [];
                if (count($parts) > 2 && ! in_array($parts[0], ['www', 'api'], true)) {
                    $slug = $parts[0];
                }
            }

            if ($slug && preg_match('/^[a-z0-9-]+$/i', $slug)) {
                $tenantId = (int) (Tenant::where('slug', $slug)->value('id') ?: 0);
            }
        }

        if ($tenantId) {
            try {
                $settings = SmtpSetting::where('tenant_id', $tenantId)->first();
                if ($settings && $settings->host) {
                    Config::set('mail.default', 'smtp');
                    Config::set('mail.mailers.smtp', [
                        'transport' => 'smtp',
                        'host' => $settings->host,
                        'port' => $settings->port ?: 587,
                        'encryption' => strtolower((string) $settings->encryption) === 'none' ? null : strtolower((string) $settings->encryption),
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
            } catch (\Throwable $e) {
                // Never block requests due to SMTP settings lookup / missing table.
                Config::set('mail.default', 'log');
            }
        }

        return $next($request);
    }
}
