<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Lead Statuses: " . json_encode(\App\Models\Lead::distinct()->pluck('status')) . "\n";
