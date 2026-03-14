<?php

use App\Models\User;
use App\Models\Lead;
use Illuminate\Support\Facades\Auth;

echo "--- Debugging Tenant 2 Data ---\n";

// 1. Find a Tenant 2 User
$user = User::where('tenant_id', 2)->first();
if (!$user) {
    echo "No user found for Tenant 2.\n";
    exit;
}
echo "User Found: ID {$user->id}, Tenant {$user->tenant_id}, Email {$user->email}\n";

// 2. Find a Tenant 2 Lead with Actions
$lead = Lead::where('tenant_id', 2)->has('actions')->first();
if (!$lead) {
    echo "No lead with actions found for Tenant 2.\n";
    // Try to find ANY lead in Tenant 2
    $lead = Lead::where('tenant_id', 2)->first();
    if ($lead) {
        echo "Found Lead ID {$lead->id} in Tenant 2, but it has NO actions.\n";
    } else {
        echo "No leads found for Tenant 2 at all.\n";
    }
    exit;
}
echo "Lead Found: ID {$lead->id}, Tenant {$lead->tenant_id}\n";

// 3. Login as User
Auth::login($user);
echo "Logged in as User {$user->id}\n";

// 4. Simulate Controller Logic
echo "Simulating LeadController@show for Lead {$lead->id}...\n";

try {
    // This replicates the EXACT logic currently in LeadController.php (after my recent edit)
    $result = Lead::with([
        'customFieldValues.field', 
        'assignedAgent:id,name', 
        'creator:id,name',
        'actions' => function($query) {
            // My recent change added this:
            $query->withoutGlobalScope('tenant')->with('creator:id,name');
        }
    ])->findOrFail($lead->id);

    echo "Query Successful.\n";
    echo "Actions Count: " . $result->actions->count() . "\n";
    
    foreach ($result->actions as $action) {
        echo " - Action ID: {$action->id}, Type: {$action->action_type}, Tenant: {$action->tenant_id}\n";
        echo "   Details: " . json_encode($action->details) . "\n";
        echo "   Status from Details: " . ($action->details['status'] ?? 'N/A') . "\n";
    }

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
