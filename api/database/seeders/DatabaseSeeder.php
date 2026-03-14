<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use App\Models\Tenant;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 0. Seed Entities
        $this->call(EntitySeeder::class);

        // 1. Seed Modules
        $modules = [
            ['name' => 'Dashboard', 'slug' => 'dashboard', 'description' => 'Main dashboard'],
            ['name' => 'Leads Management', 'slug' => 'leads', 'description' => 'Manage sales leads and pipelines'],
            ['name' => 'Marketing Campaigns', 'slug' => 'campaigns', 'description' => 'Email and SMS marketing campaigns'],
            ['name' => 'System Settings', 'slug' => 'settings', 'description' => 'Global system configuration'],
            ['name' => 'Customer Management', 'slug' => 'customers', 'description' => 'Manage customer relationships'],
            ['name' => 'Inventory', 'slug' => 'inventory', 'description' => 'Inventory and product items'],
            ['name' => 'Item Management', 'slug' => 'items', 'description' => 'Inventory and product items'], // Keep both for compatibility
            ['name' => 'Property Management', 'slug' => 'properties', 'description' => 'Real estate property listings'],
            ['name' => 'Broker Management', 'slug' => 'brokers', 'description' => 'External broker management'],
            ['name' => 'Order Management', 'slug' => 'orders', 'description' => 'Sales orders and processing'],
            ['name' => 'Support Tickets', 'slug' => 'support', 'description' => 'Customer support ticketing system'],
            ['name' => 'User Management', 'slug' => 'users', 'description' => 'Manage system users'],
            ['name' => 'Reports', 'slug' => 'reports', 'description' => 'System reports and analytics'],
            ['name' => 'Project Management', 'slug' => 'projects', 'description' => 'Real estate projects'],
            ['name' => 'Developer Management', 'slug' => 'developers', 'description' => 'Real estate developers'],
            ['name' => 'Request Management', 'slug' => 'requests', 'description' => 'Real estate requests'],
        ];

        foreach ($modules as $mod) {
            \App\Models\Module::firstOrCreate(
                ['slug' => $mod['slug']],
                array_merge($mod, ['is_active' => true])
            );
        }

        // 2. Create or Get Default Tenant
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'demo'],
            [
                'name' => 'Demo Corp',
                'domain' => 'demo.localhost',
                'status' => 'active',
                'subscription_plan' => 'pro',
            ]
        );

        // 3. Attach All Modules to Tenant
        // We use syncWithoutDetaching or just sync to ensure they are enabled
        $allModules = \App\Models\Module::all();
        $tenant->modules()->sync($allModules->pluck('id')->mapWithKeys(function ($id) {
            return [$id => ['is_enabled' => true, 'config' => null]];
        }));

        // 4. Create Test User if not exists
        if (!User::where('email', 'test@example.com')->exists()) {
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
                'tenant_id' => $tenant->id,
                'is_super_admin' => true, // Ensure they have access
            ]);
        }
    }
}
