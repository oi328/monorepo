<?php

use App\Models\Lead;
use App\Models\LeadAction;

// Create a dummy lead and action if needed, or find existing
$lead = Lead::first();
if (!$lead) {
    echo "No leads found.\n";
    exit;
}

// Ensure it has an action
$action = LeadAction::create([
    'lead_id' => $lead->id,
    'action_type' => 'note',
    'description' => 'Test Action Description',
    'details' => ['notes' => 'Test Details Note'],
    'created_by' => 1, // Assuming user 1 exists
    'tenant_id' => $lead->tenant_id ?? 1
]);

$leadWithAction = Lead::with('latestAction')->find($lead->id);

echo "JSON Output:\n";
echo json_encode($leadWithAction->toArray(), JSON_PRETTY_PRINT);
