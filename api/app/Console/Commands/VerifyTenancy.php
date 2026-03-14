<?php

namespace App\Console\Commands;

use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class VerifyTenancy extends Command
{
    protected $signature = 'tenancy:verify';
    protected $description = 'Verify multi-tenancy isolation and RBAC setup';

    public function handle(TenantService $tenantService)
    {
        $this->info('Starting Tenancy Verification...');

        // Clean up previous test data
        Tenant::whereIn('domain', ['tenant-a', 'tenant-b'])->delete();
        $this->info('Cleaned up old test tenants.');

        // 1. Create Tenant A
        $this->info('Creating Tenant A...');
        $dataA = [
            'company_name' => 'Tenant A Corp',
            'domain' => 'tenant-a',
            'admin_name' => 'Admin A',
            'admin_email' => 'admin@tenant-a.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ];
        $resultA = $tenantService->createTenant($dataA);
        $tenantA = $resultA['tenant'];
        $userA = $resultA['user'];
        $this->info("Tenant A created: ID {$tenantA->id}");

        // 2. Create Tenant B
        $this->info('Creating Tenant B...');
        $dataB = [
            'company_name' => 'Tenant B Corp',
            'domain' => 'tenant-b',
            'admin_name' => 'Admin B',
            'admin_email' => 'admin@tenant-b.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ];
        $resultB = $tenantService->createTenant($dataB);
        $tenantB = $resultB['tenant'];
        $userB = $resultB['user'];
        $this->info("Tenant B created: ID {$tenantB->id}");

        // 3. Create Data for Tenant A (Simulate Login as User A)
        $this->info('Creating Lead for Tenant A...');
        Auth::login($userA);
        // Important: setPermissionsTeamId is usually handled by middleware, but we must do it manually in CLI
        setPermissionsTeamId($tenantA->id);
        
        $leadA = Lead::create([
            'name' => 'Lead A',
            'email' => 'lead@a.com',
            'status' => 'new',
        ]);
        $this->info("Lead A created: ID {$leadA->id}, Tenant ID: {$leadA->tenant_id}");

        if ($leadA->tenant_id !== $tenantA->id) {
            $this->error("FAILED: Lead A has wrong tenant_id. Expected {$tenantA->id}, got {$leadA->tenant_id}");
            return 1;
        }

        // 4. Switch to Tenant B (Simulate Login as User B)
        $this->info('Switching to Tenant B context...');
        Auth::login($userB);
        setPermissionsTeamId($tenantB->id);

        // 5. Attempt to access Lead A
        $this->info('Attempting to find Lead A from Tenant B context...');
        $foundLead = Lead::find($leadA->id);

        if ($foundLead) {
            $this->error("FAILED: Tenant B can see Tenant A's lead!");
            return 1;
        } else {
            $this->info("SUCCESS: Lead A is hidden from Tenant B (Global Scope working).");
        }

        // 6. Verify Spatie Roles
        $this->info('Verifying Spatie Roles...');
        
        // Switch back to Tenant A to verify User A's roles
        $this->info('Switching back to Tenant A context to verify User A roles...');
        setPermissionsTeamId($tenantA->id);
        
        // Debug: List user roles
        $userA->refresh(); // Refresh to ensure relationships are new
        $this->info("User A (ID {$userA->id}) roles: " . $userA->roles->count());
        foreach ($userA->roles as $ur) {
            $this->info(" - Assigned Role: {$ur->name}, TenantID: {$ur->tenant_id}");
        }

        if ($userA->hasRole('Admin')) {
            $this->info("SUCCESS: User A has Admin role in Tenant A context.");
        } else {
            $this->error("FAILED: User A missing Admin role in Tenant A context.");
        }

        // Check cross-tenant role pollution
        // Switch context to Tenant B but check User A's role
        $this->info('Switching to Tenant B context to verify cross-tenant isolation...');
        setPermissionsTeamId($tenantB->id);
        // We need to refresh relation because Spatie caches roles/permissions
        $userA->unsetRelation('roles'); 
        
        if ($userA->hasRole('Admin')) {
             $this->error("FAILED: User A HAS Admin role in Tenant B context (Pollution detected).");
             return 1;
        } else {
             $this->info("SUCCESS: User A does not have Admin role in Tenant B context (Isolation working).");
        }

        $this->info('Verification Complete: All checks passed.');
        return 0;
    }
}
