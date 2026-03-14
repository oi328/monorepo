<?php

use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\Request;

// Simulate Login
$user = User::find(1);
Auth::login($user);
echo "Logged in as User: " . $user->name . " (Tenant: " . $user->tenant_id . ")\n";

// Mock Data from Frontend
$data = [
    'name' => 'Test Lead ' . time(),
    'source' => 'direct',
    'campaign' => 'Test Campaign', // This is what we added
    'status' => 'new',
    'stage' => 'New', // Frontend sends 'New' usually
    'priority' => 'medium',
    'type' => 'Individual',
    'assigned_to' => 'Unassigned',
    'notes' => 'Test note',
    'estimated_value' => '1000'
];

// 1. Validation Logic
$validator = Validator::make($data, [
    'name' => 'required|string|max:255',
    'email' => 'nullable|email|max:255',
    'phone' => 'nullable|string|max:255',
    'company' => 'nullable|string|max:255',
    'campaign' => 'nullable|string|max:255',
]);

if ($validator->fails()) {
    echo "VALIDATION FAILED:\n";
    print_r($validator->errors()->all());
    exit(1);
}

// 2. Creation Logic
try {
    $createData = $data;
    $createData['created_by'] = $user->id;
    
    // Simulate BelongsToTenant scope - REMOVED manual assignment
    // if (!isset($createData['tenant_id'])) {
    //    $createData['tenant_id'] = $user->tenant_id;
    // }

    echo "Attempting to create Lead with data:\n";
    print_r($createData);

    $lead = Lead::create($createData);
    
    echo "SUCCESS: Lead Created ID: " . $lead->id . "\n";
    echo "Campaign: " . $lead->campaign . "\n";

} catch (\Exception $e) {
    echo "EXCEPTION:\n";
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
