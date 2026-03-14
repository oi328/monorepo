<?php

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

// Simulate Tenant 2 context if possible, or just query directly.
// We'll search for a user in Tenant 2 first.

use App\Models\User;
use App\Models\Lead;
use App\Models\LeadAction;
use Illuminate\Support\Facades\DB;

echo "--- Debugging Tenant Actions ---\n";

// Find a user in Tenant 2
$user = User::where('tenant_id', 2)->first();

if (!$user) {
    echo "No user found for Tenant 2. Listing available tenants:\n";
    $tenants = DB::table('users')->select('tenant_id')->distinct()->get();
    foreach ($tenants as $t) {
        echo "Tenant ID: " . $t->tenant_id . "\n";
    }
    exit;
}

echo "User found: " . $user->name . " (ID: " . $user->id . ", Tenant: " . $user->tenant_id . ")\n";

// Login as this user
\Illuminate\Support\Facades\Auth::login($user);

// Fetch leads for this tenant
$leads = Lead::where('tenant_id', 2)->latest()->take(5)->get();

echo "Found " . $leads->count() . " leads for Tenant 2.\n";

foreach ($leads as $lead) {
    echo "\nLead ID: " . $lead->id . " (" . $lead->name . ")\n";
    
    // Check actions via raw SQL to ignore scopes
    $rawActions = DB::table('lead_actions')->where('lead_id', $lead->id)->get();
    echo "Raw DB Actions Count: " . $rawActions->count() . "\n";
    foreach ($rawActions as $ra) {
        $status = isset(json_decode($ra->details)->status) ? json_decode($ra->details)->status : 'N/A';
        echo " - Action ID: $ra->id, Tenant: $ra->tenant_id, Type: $ra->action_type, Status: $status\n";
    }

    // Check actions via Eloquent (Standard)
    $eloquentActions = $lead->actions;
    echo "Eloquent Actions Count (Standard): " . $eloquentActions->count() . "\n";

    // Check actions via Eloquent (Bypassed Scope) and simulate JSON serialization
    $leadWithBypass = Lead::with(['actions' => function($q) {
        $q->withoutGlobalScope('tenant');
    }])->find($lead->id);
    
    echo "Eloquent Actions Count (Bypassed): " . $leadWithBypass->actions->count() . "\n";
    
    if ($leadWithBypass->actions->count() > 0) {
        $firstAction = $leadWithBypass->actions->first();
        echo "First Action JSON structure:\n";
        echo json_encode($firstAction->toArray(), JSON_PRETTY_PRINT) . "\n";
    }
}
