<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use App\Models\Module;

class TenantBootstrapper
{
    public function bootstrap(Tenant $tenant, ?array $adminData = null)
    {
        // Set context for Spatie
        setPermissionsTeamId($tenant->id);

        // 1. Create Default Roles for this Tenant
        $roles = ['Tenant Admin', 'Manager', 'Employee', 'Viewer'];
        
        $teamFk = config('permission.column_names.team_foreign_key', 'tenant_id');

        foreach ($roles as $roleName) {
            Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'web',
                $teamFk => $tenant->id
            ]);
        }

        // 2. Create Admin User if data provided
        $admin = null;
        if ($adminData) {
            $admin = User::create([
                'name' => $adminData['name'],
                'email' => $adminData['email'],
                'password' => Hash::make($adminData['password']),
                'tenant_id' => $tenant->id,
            ]);
            
            // Assign Admin Role
            $admin->assignRole('Tenant Admin');
        }

        // 3. Enable Default Modules
        // Logic moved to TenantService::syncTenantModules to respect subscription plans
        // $modules = Module::where('is_active', true)->get();
        // foreach ($modules as $module) {
        //    $tenant->modules()->attach($module->id, ['is_enabled' => true]);
        // }
        
        return $admin;
    }
}
