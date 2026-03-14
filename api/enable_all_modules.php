<?php

use App\Models\Tenant;
use App\Models\Module;

// 1. Ensure Modules Exist
$modules = [
    ['name' => 'Leads Management', 'slug' => 'leads', 'description' => 'Manage sales leads and pipelines'],
    ['name' => 'Marketing Campaigns', 'slug' => 'campaigns', 'description' => 'Email and SMS marketing campaigns'],
    ['name' => 'System Settings', 'slug' => 'settings', 'description' => 'Global system configuration'],
    ['name' => 'Customer Management', 'slug' => 'customers', 'description' => 'Manage customer relationships'],
    ['name' => 'Item Management', 'slug' => 'items', 'description' => 'Inventory and product items'],
    ['name' => 'Property Management', 'slug' => 'properties', 'description' => 'Real estate property listings'],
    ['name' => 'Broker Management', 'slug' => 'brokers', 'description' => 'External broker management'],
    ['name' => 'Order Management', 'slug' => 'orders', 'description' => 'Sales orders and processing'],
    ['name' => 'Inventory Management', 'slug' => 'inventory', 'description' => 'Warehouse and stock management'],
    ['name' => 'Support Tickets', 'slug' => 'support', 'description' => 'Customer support and ticketing'],
    ['name' => 'Sales Management', 'slug' => 'sales', 'description' => 'Sales team and performance'],
    ['name' => 'Reports & Analytics', 'slug' => 'reports', 'description' => 'Detailed reporting and analytics'],
];

echo "Checking Modules...\n";
foreach ($modules as $mod) {
    $m = Module::firstOrCreate(
        ['slug' => $mod['slug']],
        array_merge($mod, ['is_active' => true])
    );
    echo " - Module {$m->name} ({$m->slug}): OK\n";
}

// 2. Get Tenant
$tenant = Tenant::first();
if (!$tenant) {
    echo "No tenant found! Creating demo tenant...\n";
    $tenant = Tenant::create([
        'slug' => 'demo',
        'name' => 'Demo Corp',
        'domain' => 'demo.localhost',
        'status' => 'active',
        'subscription_plan' => 'pro',
    ]);
}
echo "Tenant: {$tenant->name}\n";

// 3. Attach Modules
echo "Attaching modules to tenant...\n";
$allModules = Module::all();
$syncData = $allModules->pluck('id')->mapWithKeys(function ($id) {
    return [$id => ['is_enabled' => true, 'config' => null]];
});
$tenant->modules()->syncWithoutDetaching($syncData);

echo "Done. All modules enabled for tenant.\n";
