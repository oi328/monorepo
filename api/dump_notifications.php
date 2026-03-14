<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$notifications = \Illuminate\Support\Facades\DB::table('notifications')
    ->orderBy('created_at', 'desc')
    ->limit(5)
    ->get();

foreach ($notifications as $n) {
    echo "ID: " . $n->id . "\n";
    echo "Type: " . $n->type . "\n";
    echo "Notifiable ID: " . $n->notifiable_id . "\n";
    echo "Data: " . $n->data . "\n";
    echo "-------------------\n";
}
