<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Tenant;
use Illuminate\Support\Facades\Hash;

class DefaultUserSeeder extends Seeder
{
    public function run()
    {
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'owner'],
            [
                'name' => 'Owner Tenant',
                'subscription_plan' => 'enterprise',
                'status' => 'active',
                'domain' => 'owner.localhost',
            ]
        );

        // Create User
        $user = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'tenant_id' => $tenant->id,
                'is_super_admin' => false
            ]
        );
        
        $this->command->info('Default tenant admin created: admin@example.com / password');
    }
}
