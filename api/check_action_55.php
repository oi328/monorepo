$a = App\Models\LeadAction::withoutGlobalScope('tenant')->find(55);
if ($a) {
    echo "Action 55: Date=" . ($a->details['date'] ?? 'null') . ", Time=" . ($a->details['time'] ?? 'null') . ", Status=" . ($a->details['status'] ?? 'null') . "\n";
    echo "Today: " . Carbon\Carbon::now()->toDateString() . "\n";
} else {
    echo "Action 55 not found\n";
}
exit;
