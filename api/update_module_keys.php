$map = [
    'Leads Management' => 'leads',
    'Marketing Campaigns' => 'campaigns',
    'System Settings' => 'settings',
    'Customer Management' => 'customers',
    'Item Management' => 'items',
    'Property Management' => 'properties',
    'Broker Management' => 'brokers',
    'Order Management' => 'orders',
    'Inventory Management' => 'inventory',
    'Support & Tickets' => 'support',
    'Sales Management' => 'sales',
    'Reports & Analytics' => 'reports',
];

foreach ($map as $name => $key) {
    $module = App\Models\Module::where('name', $name)->first();
    if ($module) {
        $module->key = $key;
        $module->save();
        echo "Updated {$name} to key: {$key}\n";
    } else {
        echo "Module {$name} not found.\n";
    }
}
