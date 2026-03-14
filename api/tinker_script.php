$action = App\Models\LeadAction::whereRaw("JSON_EXTRACT(details, '$.date') IS NOT NULL")->first();
if ($action) {
    echo "Details: " . json_encode($action->details) . "\n";
} else {
    echo "No scheduled LeadAction found.\n";
}
exit;
