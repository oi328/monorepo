
$user = \App\Models\User::first();
echo "Using user: {$user->name} ({$user->id})\n";

// Create a dummy lead
$lead = \App\Models\Lead::create([
    'name' => 'Test Notification Lead ' . time(),
    'email' => 'test'.time().'@example.com',
    'phone' => '123456789'.rand(10,99),
    'status' => 'new',
    'assigned_to' => $user->id,
    'created_by' => $user->id,
]);

$now = \Carbon\Carbon::now();
$today = $now->toDateString();

// 1. Upcoming Action (15 mins from now)
$upcomingTime = $now->copy()->addMinutes(15)->format('H:i');
$upcomingAction = \App\Models\LeadAction::create([
    'lead_id' => $lead->id,
    'user_id' => $user->id,
    'type' => 'call',
    'action_type' => 'call',
    'description' => 'Upcoming test action',
    'status' => 'pending',
    'date' => $today,
    'time' => $upcomingTime,
    'details' => [
        'date' => $today,
        'time' => $upcomingTime,
        'status' => 'pending',
        'priority' => 'high',
        'notes' => 'Upcoming test action'
    ],
    'created_by' => $user->id,
]);
echo "Created Upcoming Action #{$upcomingAction->id} at {$today} {$upcomingTime}\n";

// 2. Delayed Action (5 mins ago)
$delayedTime = $now->copy()->subMinutes(5)->format('H:i');
$delayedAction = \App\Models\LeadAction::create([
    'lead_id' => $lead->id,
    'user_id' => $user->id,
    'type' => 'meeting',
    'action_type' => 'meeting',
    'description' => 'Delayed test action',
    'status' => 'pending',
    'date' => $today,
    'time' => $delayedTime,
    'details' => [
        'date' => $today,
        'time' => $delayedTime,
        'status' => 'pending', // Pending to trigger delayed
        'priority' => 'medium',
        'notes' => 'Delayed test action'
    ],
    'created_by' => $user->id,
]);
echo "Created Delayed Action #{$delayedAction->id} at {$today} {$delayedTime}\n";

// 3. Future Action (60 mins from now) - Should NOT trigger upcoming
$futureTime = $now->copy()->addMinutes(60)->format('H:i');
$futureAction = \App\Models\LeadAction::create([
    'lead_id' => $lead->id,
    'user_id' => $user->id,
    'type' => 'task',
    'action_type' => 'task',
    'description' => 'Future test action',
    'status' => 'pending',
    'date' => $today,
    'time' => $futureTime,
    'details' => [
        'date' => $today,
        'time' => $futureTime,
        'status' => 'pending',
        'priority' => 'low',
        'notes' => 'Future test action'
    ],
    'created_by' => $user->id,
]);
echo "Created Future Action #{$futureAction->id} at {$today} {$futureTime}\n";
exit;
