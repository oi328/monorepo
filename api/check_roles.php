<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$roles = Spatie\Permission\Models\Role::all();
echo "Roles:\n";
foreach ($roles as $role) {
    echo $role->name . " (Guard: " . $role->guard_name . ", Tenant: " . $role->tenant_id . ")\n";
}

$user = App\Models\User::first();
echo "\nUser: " . $user->name . "\n";
$userRoles = $user->roles;
echo "User Roles: " . ($userRoles->count() > 0 ? $userRoles->pluck('name')->implode(', ') : 'None') . "\n";
