<?php

use App\Models\User;
use App\Models\Lead;
use App\Models\LeadAction;
use Carbon\Carbon;

// Ensure we have a user
$user = User::first();
if (!$user) {
    echo "No user found. Creating one.\n";
    $user = User::create([
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
    ]);
}
echo "User: {$user->id}\n";

// Ensure we have a lead
$lead = Lead::first();
if (!$lead) {
    echo "No lead found. Creating one.\n";
    $lead = Lead::create([
        'name' => 'Test Lead',
        'phone' => '+1234567890',
        'assigned_to' => $user->id,
        'creator_id' => $user->id,
    ]);
}
echo "Lead: {$lead->id}\n";

// Create Upcoming Action (15 mins from now)
$upcomingTime = Carbon::now()->addMinutes(15);
$upcomingAction = LeadAction::create([
    'lead_id' => $lead->id,
    'user_id' => $user->id,
    'action_type' => 'call',
    'description' => 'Test Upcoming Action',
    'details' => [
        'status' => 'pending',
        'date' => $upcomingTime->toDateString(),
        'time' => $upcomingTime->format('H:i'),
        'priority' => 'high'
    ]
]);
echo "Created Upcoming Action: {$upcomingAction->id} at {$upcomingTime->toDateTimeString()}\n";

// Create Delayed Action (5 mins ago)
$delayedTime = Carbon::now()->subMinutes(5);
$delayedAction = LeadAction::create([
    'lead_id' => $lead->id,
    'user_id' => $user->id, // If assigned_to is checked via lead, make sure lead is assigned
    'action_type' => 'call',
    'description' => 'Test Delayed Action',
    'details' => [
        'status' => 'pending',
        'date' => $delayedTime->toDateString(),
        'time' => $delayedTime->format('H:i'),
        'priority' => 'high'
    ]
]);
// Ensure lead is assigned to user for delayed notification logic
$lead->assigned_to = $user->id;
$lead->save();

echo "Created Delayed Action: {$delayedAction->id} at {$delayedTime->toDateTimeString()}\n";
