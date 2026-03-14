<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

// Manually initialize tenancy for tenant 1
$tenant = App\Models\Tenant::find(1);
if (!$tenant) {
    die("Tenant not found.\n");
}
echo "Initializing tenant: " . $tenant->id . "\n";
$tenant->makeCurrent();

$settings = App\Models\CrmSetting::first();
if ($settings) {
    echo "Settings found.\n";
    print_r($settings->settings);
} else {
    echo "No settings found.\n";
}
