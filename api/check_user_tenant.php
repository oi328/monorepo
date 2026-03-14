<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

$user = App\Models\User::first();
if ($user) {
    echo "User: " . $user->name . "\n";
    echo "User Tenant ID: " . $user->tenant_id . "\n";
    
    $tenants = App\Models\Tenant::all();
    echo "\nAll Tenants:\n";
    foreach ($tenants as $t) {
        echo "Tenant ID: " . $t->id . " - Name: " . $t->name . "\n";
    }
} else {
    echo "No user found.\n";
}
