<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\Tenant;
use App\Models\User;
use Spatie\Permission\Models\Role;
use App\Models\Module;
use App\Services\TenantService;

class AlIsraaTenantSeeder extends Seeder
{
    public function run(): void
    {
        $slug = 'alisraa';
        $tenant = Tenant::firstOrCreate(
            ['slug' => $slug],
            [
                'name' => 'شركة الاسراء',
                'subscription_plan' => 'enterprise',
                'status' => 'active',
                'domain' => $slug . '.localhost',
            ]
        );

        setPermissionsTeamId($tenant->id);

        $defaultRoles = ['Tenant Admin', 'Manager', 'Employee', 'Viewer'];
        $businessRoles = [
            'Director',
            'Operation Manager',
            'Sales Admin',
            'Branch Manager',
            'Sales Manager',
            'Team Leader',
            'Sales Person',
            'Customer Manager',
            'Customer Team Leader',
            'Customer Agent',
            'Marketing Manager',
            'Marketing Moderator',
            'Support Manager',
            'Support Team Leader',
            'Support Agent',
            'Custom',
        ];

        $allRoles = array_values(array_unique(array_merge($defaultRoles, $businessRoles)));
        $teamFk = config('permission.column_names.team_foreign_key', 'tenant_id');

        foreach ($allRoles as $roleName) {
            Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
                $teamFk => $tenant->id,
            ]);
        }

        $adminEmail = 'admin@' . $slug . '.test';
        $admin = User::firstOrCreate(
            ['email' => $adminEmail],
            [
                'name' => 'Al Israa Admin',
                'password' => Hash::make('Password123!'),
                'tenant_id' => $tenant->id,
            ]
        );
        $admin->assignRole('Tenant Admin');
        $this->command->info("Tenant admin created: {$adminEmail} / Password123!");

        foreach ($businessRoles as $roleName) {
            $localPart = Str::of($roleName)->lower()->replace(' ', '-')->replace('&', 'and')->replace('.', '');
            $email = $localPart . '@' . $slug . '.test';
            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $roleName . ' User',
                    'password' => Hash::make('Password123!'),
                    'tenant_id' => $tenant->id,
                ]
            );
            $user->syncRoles([$roleName]);
            $this->command->info("Created user for role {$roleName}: {$email}");
        }

        $requiredModules = [
            ['slug' => 'settings', 'name' => 'System Settings'],
            ['slug' => 'leads', 'name' => 'Leads Management'],
            ['slug' => 'campaigns', 'name' => 'Marketing Campaigns'],
            ['slug' => 'customers', 'name' => 'Customer Management'],
            ['slug' => 'support', 'name' => 'Support Tickets'],
            ['slug' => 'items', 'name' => 'Item Management'],
            ['slug' => 'orders', 'name' => 'Order Management'],
        ];
        foreach ($requiredModules as $mod) {
            Module::firstOrCreate(
                ['slug' => $mod['slug']],
                ['name' => $mod['name'], 'description' => null, 'is_active' => true]
            );
        }

        app(TenantService::class)->syncTenantModules($tenant, 'enterprise', []);
        $this->command->info("Enterprise modules enabled for tenant {$tenant->slug}");
    }
}
