<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('actions:check-upcoming')->everyFiveMinutes();
Schedule::command('actions:check-delayed')->everyFiveMinutes();
Schedule::command('tasks:check-expired')->hourly();
Schedule::command('campaigns:check-expired')->daily();
Schedule::command('actions:check-rent-end')->daily();
Schedule::command('meta:sync-all')->hourly();
Schedule::command('google:sync-all')->hourly();
Schedule::command('meta:refresh-tokens')->daily();
Schedule::command('gmail:sync')->everyFiveMinutes();

