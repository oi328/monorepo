<?php

use App\Models\Lead;
use App\Models\LeadAction;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

// Bootstrap Laravel
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Simulate a user login (needed for tenant scope if applicable, though we might need to manually set it)
$user = User::first();
if (!$user) {
    echo "No user found to simulate login.\n";
    exit(1);
}
Auth::login($user);
echo "Logged in as user: " . $user->name . " (Tenant ID: " . $user->tenant_id . ")\n";

// Find a lead with actions
$lead = Lead::whereHas('actions')->first();

if (!$lead) {
    echo "No lead found with actions. Creating a test lead and action.\n";
    $lead = Lead::create([
        'name' => 'Test Lead for Actions',
        'status' => 'New',
        'tenant_id' => $user->tenant_id
    ]);
    
    LeadAction::create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'action_type' => 'call',
        'description' => 'Test Call Description',
        'details' => ['notes' => 'Detailed notes here', 'duration' => '5 mins'],
        'tenant_id' => $user->tenant_id
    ]);
    
    echo "Created test lead and action.\n";
} else {
    echo "Found lead with ID: " . $lead->id . "\n";
}

// Fetch actions using the same logic as the controller
$actions = LeadAction::where('lead_id', $lead->id)
    ->with(['user', 'lead'])
    ->latest()
    ->get();

echo "Fetched " . $actions->count() . " actions.\n";

foreach ($actions as $action) {
    echo "--------------------------------------------------\n";
    echo "Action ID: " . $action->id . "\n";
    echo "Type: " . $action->action_type . "\n";
    echo "Description: " . $action->description . "\n";
    echo "User: " . ($action->user ? $action->user->name : 'N/A') . "\n";
    echo "Details (Raw): " . json_encode($action->details) . "\n";
    echo "Details (Type): " . gettype($action->details) . "\n";
    
    if (is_array($action->details)) {
        echo "Details is an array. Good.\n";
        if (isset($action->details['notes'])) {
            echo "Notes found in details: " . $action->details['notes'] . "\n";
        }
    } else {
        echo "WARNING: Details is NOT an array. It is " . gettype($action->details) . ".\n";
    }
}
