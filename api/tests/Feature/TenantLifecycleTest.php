<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\Tenant;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TenantLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_tenant_can_access_api()
    {
        $tenant = Tenant::factory()->create(['slug' => 'active-tenant', 'status' => 'active']);
        
        $response = $this->getJson("http://active-tenant.localhost/api/auth/login");
        // Should be 405 (Method Not Allowed) or 422 (Validation Error) if route exists, 
        // but definitely NOT 403 or 404.
        // Actually, let's just hit a route that returns something simple if possible, 
        // or check that we get validation error for login.
        
        $response->assertStatus(405); // GET login not allowed, but means we passed middleware
    }

    public function test_suspended_tenant_is_blocked()
    {
        $tenant = Tenant::factory()->create(['slug' => 'suspended-tenant', 'status' => 'suspended']);

        $response = $this->postJson("http://suspended-tenant.localhost/api/auth/login", [
            'email' => 'test@example.com',
            'password' => 'password'
        ]);

        $response->assertStatus(403)
                 ->assertJson(['message' => 'Tenant is suspended']);
    }

    public function test_tenant_caching_in_middleware()
    {
        $slug = 'cache-test';
        $tenant = Tenant::factory()->create(['slug' => $slug, 'status' => 'active']);
        
        Cache::forget("tenant_{$slug}");
        DB::enableQueryLog();

        // 1. First Request
        $this->postJson("http://{$slug}.localhost/api/auth/login", ['email' => 'dummy', 'password' => 'dummy']);
        
        $queries = DB::getQueryLog();
        $hasTenantQuery = collect($queries)->contains(function ($query) use ($slug) {
            return str_contains($query['query'], 'tenants') && 
                   collect($query['bindings'])->contains($slug);
        });
        $this->assertTrue($hasTenantQuery, "First request should query DB");

        DB::flushQueryLog();

        // 2. Second Request
        $this->postJson("http://{$slug}.localhost/api/auth/login", ['email' => 'dummy', 'password' => 'dummy']);
        
        $queries2 = DB::getQueryLog();
        $hasTenantQuery2 = collect($queries2)->contains(function ($query) use ($slug) {
             return str_contains($query['query'], 'tenants') && 
                    collect($query['bindings'])->contains($slug);
        });
        $this->assertFalse($hasTenantQuery2, "Second request should use cache");
    }

    public function test_login_returns_permissions()
    {
        $tenant = Tenant::factory()->create(['slug' => 'perm-test', 'status' => 'active']);
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        
        // Setup permissions
        setPermissionsTeamId($tenant->id); // Required for Spatie Teams/Multi-tenancy
        $role = Role::create(['name' => 'test-role', 'team_id' => $tenant->id]);
        $permission = Permission::create(['name' => 'view_leads', 'team_id' => $tenant->id]);
        $role->givePermissionTo($permission);
        $user->assignRole($role);

        $response = $this->postJson("http://perm-test.localhost/api/auth/login", [
            'email' => $user->email,
            'password' => 'password' // Factory default password is 'password' usually
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['user_permissions'])
                 ->assertJsonFragment(['user_permissions' => ['view_leads']]);
    }
}
