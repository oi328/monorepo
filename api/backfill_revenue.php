<?php

use App\Models\Revenue;
use App\Models\LeadAction;
use App\Models\User;
use App\Models\Lead;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Starting Revenue Backfill..." . PHP_EOL;

$actions = LeadAction::where(function($q) {
    $q->where('action_type', 'closing_deals')
      ->orWhere('next_action_type', 'closing_deals');
})->get();

$count = 0;

foreach ($actions as $action) {
    // Check if revenue already exists for this action
    $exists = Revenue::where('action_id', $action->id)->exists();
    if ($exists) {
        continue;
    }

    $lead = Lead::find($action->lead_id);
    if (!$lead) continue;

    $details = $action->details ?? [];
    $revenueAmount = $details['closingRevenue'] ?? $details['revenue'] ?? $action->revenue ?? $lead->estimated_value ?? 0;
    
    // Convert to float
    $amount = floatval($revenueAmount);

    // If amount is 0, maybe we should still record it or skip? 
    // User says "Closed Deal ... means Revenue exists". Even if 0, it's a record.
    // But usually revenue implies > 0. Let's assume > 0 or at least create it if found.
    // Let's create it even if 0 to show the deal happened? Or maybe default to some logic?
    // For now, let's create it.

    $revenue = Revenue::create([
        'tenant_id' => $lead->tenant_id ?? $action->user->tenant_id ?? 1, // Fallback
        'user_id' => $lead->assigned_to ?? $action->user_id, // Owner (Salesperson)
        'lead_id' => $lead->id,
        'action_id' => $action->id,
        'amount' => $amount,
        'currency' => $details['currency'] ?? 'EGP',
        'source' => $lead->source ?? 'Unknown',
        'meta_data' => [
            'created_by_id' => $action->user_id,
            'created_by_name' => $action->user->name ?? 'Unknown',
            'notes' => 'Backfilled from existing Closed Deal action',
            'backfilled_at' => now()->toDateTimeString()
        ],
        'created_at' => $action->created_at,
        'updated_at' => $action->updated_at
    ]);

    echo "Created Revenue for Action ID {$action->id}: Amount {$amount}" . PHP_EOL;
    $count++;
}

echo "Backfill completed. Created {$count} records." . PHP_EOL;
