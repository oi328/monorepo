<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\Lead;
use App\Models\LeadAction;
use App\Models\User;
use App\Models\Tenant;
use Carbon\Carbon;

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Set timezone to match app config
date_default_timezone_set('Africa/Cairo');

echo "Current Time: " . Carbon::now()->toDateTimeString() . "\n";
echo "App Timezone: " . config('app.timezone') . "\n";

// Ensure we have a tenant context
$tenant = Tenant::first();
if (!$tenant) {
    echo "No tenant found. Creating one...\n";
    $tenant = Tenant::create(['name' => 'Test Tenant', 'domain' => 'test']);
}
echo "Using Tenant: " . $tenant->id . "\n";

// Bind the current tenant ID to the container for the global scope
app()->instance('current_tenant_id', $tenant->id);

// Ensure we have a user
$user = User::where('tenant_id', $tenant->id)->first();
if (!$user) {
    echo "No user found. Creating one...\n";
    $user = User::create([
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'tenant_id' => $tenant->id
    ]);
}
echo "Using User: " . $user->id . "\n";

// Authenticate user to pass policies if needed (though we are running raw queries mostly)
Auth::login($user);

// Cleanup previous test data
echo "Cleaning up previous test data...\n";
$leads = Lead::where('name', 'Test Delayed Lead')->get();
foreach ($leads as $l) {
    $l->actions()->delete();
    $l->delete();
}

// Create a Lead
echo "Creating new lead...\n";
$lead = Lead::create([
    'name' => 'Test Delayed Lead',
    'status' => 'new',
    'source_id' => 1, // assuming 1 exists or is nullable, adjust if needed
    'added_by' => $user->id,
    'tenant_id' => $tenant->id
]);

// Create a PAST action (e.g., 5 minutes ago)
$pastDate = Carbon::now()->subMinutes(5);
echo "Creating action scheduled for: " . $pastDate->toDateTimeString() . "\n";

$action = LeadAction::create([
    'lead_id' => $lead->id,
    'action_type' => 'call',
    'details' => [
        'status' => 'pending',
        'date' => $pastDate->toDateString(),
        'time' => $pastDate->toTimeString(),
        'notes' => 'This should be delayed'
    ],
    'created_by' => $user->id,
    'tenant_id' => $tenant->id
]);

// Verify the action was created correctly
$createdAction = LeadAction::find($action->id);
echo "Action created with details: " . json_encode($createdAction->details) . "\n";

// Test the Query Logic
$date = Carbon::now()->toDateString();
$time = Carbon::now()->toTimeString();

echo "Querying for delayed leads (Date: $date, Time: $time)...\n";

$results = Lead::where('id', $lead->id)
    ->whereHas('actions', function ($q) use ($date, $time) {
        $q->whereIn('details->status', ['pending', 'in-progress'])
          ->where(function ($sub) use ($date, $time) {
              $sub->where('details->date', '<', $date)
                  ->orWhere(function ($s) use ($date, $time) {
                      $s->where('details->date', '=', $date)
                        ->where('details->time', '<', $time);
                  });
          });
    })->get();

if ($results->count() > 0) {
    echo "SUCCESS: Lead found in delayed query.\n";
} else {
    echo "FAILURE: Lead NOT found in delayed query.\n";
    
    // Debugging: Check why
    $check = Lead::where('id', $lead->id)->first();
    echo "Lead exists: " . ($check ? 'Yes' : 'No') . "\n";
    
    $actions = $check->actions;
    foreach($actions as $a) {
        echo "Action ID: " . $a->id . "\n";
        echo "Details Status: " . ($a->details['status'] ?? 'N/A') . "\n";
        echo "Details Date: " . ($a->details['date'] ?? 'N/A') . " (Compare with < $date)\n";
        echo "Details Time: " . ($a->details['time'] ?? 'N/A') . " (Compare with < $time)\n";
    }
}
