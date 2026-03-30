<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('meta:webhook-sign {path? : File path to raw JSON payload (defaults to STDIN)} {--algo=sha256 : sha256 or sha1}', function () {
    $algo = strtolower((string) $this->option('algo'));
    if (!in_array($algo, ['sha256', 'sha1'], true)) {
        $this->error('Invalid --algo. Use sha256 or sha1.');
        return 2;
    }

    $path = $this->argument('path');
    if ($path) {
        if (!is_string($path) || !file_exists($path)) {
            $this->error("File not found: {$path}");
            return 2;
        }
        $payload = file_get_contents($path);
    } else {
        $payload = file_get_contents('php://stdin');
    }

    if ($payload === false) {
        $this->error('Failed to read payload.');
        return 2;
    }

    $appSecret = env('META_APP_SECRET')
        ?: config('services.meta.app_secret')
        ?: config('services.facebook.client_secret');

    if (!$appSecret) {
        try {
            $appSecret = \App\Models\SystemSetting::where('key', 'meta_app_secret')->value('value');
        } catch (\Throwable $e) {
            // Ignore DB failures and fall through to error.
        }
    }

    $appSecret = is_string($appSecret) ? trim($appSecret) : $appSecret;
    if (!$appSecret) {
        $this->error('META app secret not configured (META_APP_SECRET / services.meta.app_secret / meta_app_secret system setting).');
        return 2;
    }

    $hash = hash_hmac($algo, $payload, $appSecret);
    $headerValue = "{$algo}={$hash}";

    $headerName = $algo === 'sha256' ? 'X-Hub-Signature-256' : 'X-Hub-Signature';
    $this->line($headerName . ': ' . $headerValue);
    $this->line('Content-Type: application/json');

    return 0;
})->purpose('Compute Meta webhook signature header for a raw payload');

Schedule::command('actions:check-upcoming')->everyFiveMinutes();
Schedule::command('actions:check-delayed')->everyFiveMinutes();
Schedule::command('tasks:check-expired')->hourly();
Schedule::command('tasks:check-reminders')->everyFiveMinutes();
Schedule::command('campaigns:check-expired')->daily();
Schedule::command('actions:check-rent-end')->daily();
Schedule::command('inventory:expire-reservations')->everyFiveMinutes();
Schedule::command('meta:sync-all')->hourly();
Schedule::command('google:sync-all')->hourly();
Schedule::command('meta:refresh-tokens')->daily();
Schedule::command('gmail:sync')->everyFiveMinutes();
Schedule::command('erp:sync')->everyFiveMinutes();
