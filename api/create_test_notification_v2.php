<?php

use App\Models\LeadAction;
use App\Models\Lead;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Set timezone explicitly to app timezone
date_default_timezone_set(config('app.timezone'));

$now = Carbon::now();
echo "Current Time (App Timezone): " . $now->format('Y-m-d H:i:s') . "\n";

// Get a user and lead
$user = User::first();
$lead = Lead::first();

if (!$user || !$lead) {
    echo "No user or lead found.\n";
    exit(1);
}

// Ensure lead is assigned to user for notification testing
$lead->assigned_to = $user->id;
$lead->save();

// 1. Create Upcoming Action (15 mins from now)
$upcomingTime = $now->copy()->addMinutes(15)->format('H:i');
$upcomingDate = $now->toDateString();

$upcomingAction = LeadAction::create([
    'lead_id' => $lead->id,
    'user_id' => $user->id,
    'type' => 'call',
    'action_type' => 'call',
    'description' => 'Upcoming test action v2',
    'status' => 'pending', // This is important for CheckUpcomingActions
    'date' => $upcomingDate,
    'time' => $upcomingTime,
    'details' => [
        'date' => $upcomingDate,
        'time' => $upcomingTime,
        'status' => 'pending',
        'priority' => 'high',
        'notes' => 'Upcoming test action v2'
    ],
    'created_by' => $user->id,
]);

echo "Created Upcoming Action #{$upcomingAction->id} at {$upcomingDate} {$upcomingTime}\n";

// 2. Create Delayed Action (5 mins ago)
$delayedTime = $now->copy()->subMinutes(5)->format('H:i');
$delayedDate = $now->toDateString();

$delayedAction = LeadAction::create([
    'lead_id' => $lead->id,
    'user_id' => $user->id,
    'type' => 'meeting',
    'action_type' => 'meeting',
    'description' => 'Delayed test action v2',
    'status' => 'pending',
    'date' => $delayedDate,
    'time' => $delayedTime,
    'details' => [
        'date' => $delayedDate,
        'time' => $delayedTime,
        'status' => 'pending',
        'priority' => 'high',
        'notes' => 'Delayed test action v2'
    ],
    'created_by' => $user->id,
]);

echo "Created Delayed Action #{$delayedAction->id} at {$delayedDate} {$delayedTime}\n";

// Clear cache for these actions if any
Cache::forget("notified_upcoming_{$upcomingAction->id}");
