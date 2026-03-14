<?php

use App\Models\Revenue;
use App\Models\LeadAction;
use App\Models\User;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Revenue Count: " . Revenue::count() . PHP_EOL;
echo "Closed Deals Count: " . LeadAction::where('action_type', 'closing_deals')->orWhere('next_action_type', 'closing_deals')->count() . PHP_EOL;

$users = User::all();
echo "Total Users: " . $users->count() . PHP_EOL;
foreach($users as $user) {
    if ($user->monthly_target > 0) {
        echo "User {$user->name} has target: {$user->monthly_target}" . PHP_EOL;
    }
}
