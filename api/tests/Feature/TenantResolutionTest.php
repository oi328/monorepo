<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Support\Facades\Config;

class TenantResolutionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure app.url is localhost for tests so route matching works
        Config::set('app.url', 'http://localhost');
    }

    public function test_tenant_resolved_by_subdomain()
    {
        $tenant = Tenant::create([
            'name' => 'Test Corp',
            'slug' => 'test',
            'domain' => 'test.localhost',
            'status' => 'active',
            'subscription_plan' => 'trial'
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@test.com',
            'password' => bcrypt('password')
        ]);

        // POST to test.localhost/api/auth/login
        $response = $this->postJson('http://test.localhost/api/auth/login', [
            'email' => 'admin@test.com',
            'password' => 'password'
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['token', 'tenant']);
        
        $this->assertEquals($tenant->id, $response->json('tenant.id'));
    }

    public function test_tenant_not_found_returns_404()
    {
        $response = $this->postJson('http://unknown.localhost/api/auth/login', [
            'email' => 'admin@test.com',
            'password' => 'password'
        ]);

        $response->assertStatus(404);
    }

    public function test_cross_tenant_login_fails()
    {
        $tenant1 = Tenant::create(['name' => 'T1', 'slug' => 't1', 'status' => 'active']);
        $tenant2 = Tenant::create(['name' => 'T2', 'slug' => 't2', 'status' => 'active']);

        $user1 = User::factory()->create(['tenant_id' => $tenant1->id, 'email' => 'u1@t1.com', 'password' => bcrypt('password')]);

        // Try logging into T2 with User1
        $response = $this->postJson('http://t2.localhost/api/auth/login', [
            'email' => 'u1@t1.com',
            'password' => 'password'
        ]);

        // Expect 401 because Global Scope filters out user from T1 when context is T2
        // This confirms data isolation is working even during login lookup
        $response->assertStatus(401); 
    }

    public function test_central_route_works_without_subdomain()
    {
        $response = $this->postJson('http://localhost/api/tenants/register', []);
        // Should hit controller (validation error 422 usually), not 404
        $response->assertStatus(422); // Validation error
    }
}
