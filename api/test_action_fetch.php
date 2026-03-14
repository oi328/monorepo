<?php
use App\Models\Lead;
use App\Models\LeadAction;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

// Simulate Auth (Pick a user, e.g. first user)
$user = User::first();
Auth::login($user);
echo "User: " . $user->name . " (Tenant: " . $user->tenant_id . ")\n";

$leadId = 8;
$lead = Lead::find($leadId);
echo "Lead: " . $lead->id . " (Tenant: " . $lead->tenant_id . ")\n";

// Create Action
echo "Creating Action...\n";
$action = LeadAction::create([
    'lead_id' => $leadId,
    'type' => 'call',
    'status' => 'pending',
    'description' => 'Test Action from Tinker',
    'created_by' => $user->id,
    'tenant_id' => $user->tenant_id, // Explicitly set tenant_id to match user
]);
echo "Action Created: ID " . $action->id . " (Tenant: " . $action->tenant_id . ")\n";

// Fetch Actions
echo "Fetching Actions...\n";
// Emulate Controller Logic
$actions = LeadAction::where('lead_id', $leadId)->latest()->get();
echo "Found " . $actions->count() . " actions.\n";

foreach ($actions as $a) {
    echo "- Action ID: " . $a->id . " | Type: " . $a->type . " | Desc: " . $a->description . "\n";
}
