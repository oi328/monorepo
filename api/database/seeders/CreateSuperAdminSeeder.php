<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CreateSuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // Deactivate and demote any existing super admins
        User::where('is_super_admin', true)->update([
            'is_super_admin' => false,
            'status' => 'Inactive',
        ]);

        $tenant = Tenant::firstOrCreate(
            ['slug' => 'owner'],
            [
                'name' => 'Owner Tenant',
                'domain' => 'owner.localhost',
                'status' => 'active',
                'subscription_plan' => 'pro',
            ]
        );

        // Create or Update Super Admin
        $user = User::updateOrCreate(
            ['email' => 'system@besouhoula.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('SystemAdmin123!'),
                'tenant_id' => $tenant->id,
                'is_super_admin' => true,
            ]
        );

        $this->command->info('Super Admin created: system@besouhoula.com / SystemAdmin123!');
    }
}
