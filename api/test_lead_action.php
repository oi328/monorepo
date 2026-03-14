<?php

use App\Models\Lead;
use App\Models\LeadAction;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

// Mock Auth
$user = User::first();
if (!$user) {
    echo "No user found.\n";
    exit;
}
Auth::login($user);

// Get a lead
$lead = Lead::first();
if (!$lead) {
    echo "No lead found.\n";
    exit;
}

echo "Testing LeadAction creation for Lead ID: " . $lead->id . "\n";

try {
    $action = LeadAction::create([
        'lead_id' => $lead->id,
        'type' => 'call',
        'status' => 'completed',
        'date' => date('Y-m-d'),
        'time' => date('H:i'),
        'description' => 'Test action from script',
        'outcome' => 'No Answer',
        'created_by' => $user->id,
        // tenant_id should be auto-set if BelongsToTenant is working and tenant is resolved
        // But in standalone script, we might need to set it manually if middleware isn't running
        'tenant_id' => 1 // Assuming tenant 1
    ]);

    echo "LeadAction created successfully. ID: " . $action->id . "\n";
    
    // Check relationship
    echo "Action belongs to lead: " . $action->lead->name . "\n";
    echo "Lead has " . $lead->actions()->count() . " actions.\n";

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
