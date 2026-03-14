<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = User::first(); // Assuming first user or specific user
if (!$user) {
    echo "No user found.\n";
    exit;
}

echo "Checking notifications for user: {$user->name} ({$user->id})\n";

$notifications = DB::table('notifications')
    ->where('notifiable_id', $user->id)
    ->where('notifiable_type', User::class)
    ->orderBy('created_at', 'desc')
    ->limit(5)
    ->get();

foreach ($notifications as $n) {
    echo "ID: {$n->id}\n";
    echo "Type: {$n->type}\n";
    echo "Data: " . $n->data . "\n";
    echo "Created: {$n->created_at}\n";
    echo "----------------------------------------\n";
}
