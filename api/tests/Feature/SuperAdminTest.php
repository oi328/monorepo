<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuperAdminTest extends TestCase
{
    use RefreshDatabase;

    protected $superAdmin;
    protected $tenantA;
    protected $userA;
    protected $tenantB;
    protected $userB;

    protected function setUp(): void
    {
        parent::setUp();

        // Create Tenant A and User A
        $this->tenantA = Tenant::create(['name' => 'Tenant A', 'domain' => 'a.localhost']);
        $this->userA = User::factory()->create(['tenant_id' => $this->tenantA->id]);

        // Create Tenant B and User B
        $this->tenantB = Tenant::create(['name' => 'Tenant B', 'domain' => 'b.localhost']);
        $this->userB = User::factory()->create(['tenant_id' => $this->tenantB->id]);

        // Create Super Admin (belongs to Tenant A, but has is_super_admin flag)
        $this->superAdmin = User::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'is_super_admin' => true
        ]);
    }

    public function test_super_admin_can_access_super_admin_routes()
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->getJson('/api/super-admin/tenants');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'tenants'); // Should see both tenants
    }

    public function test_normal_user_cannot_access_super_admin_routes()
    {
        Sanctum::actingAs($this->userA);

        $response = $this->getJson('/api/super-admin/tenants');

        $response->assertStatus(403);
    }

    public function test_super_admin_can_see_all_users_bypassing_scope()
    {
        Sanctum::actingAs($this->superAdmin);

        $response = $this->getJson('/api/super-admin/users');

        $response->assertStatus(200);
        
        // Should see userA, userB, and superAdmin (3 users total)
        $data = $response->json('users.data');
        $this->assertCount(3, $data);
        
        // Verify userB (from different tenant) is present
        $userBId = $this->userB->id;
        $found = collect($data)->contains('id', $userBId);
        $this->assertTrue($found, 'Super Admin should see User B from Tenant B');
    }

    public function test_super_admin_bypasses_global_scope_on_models()
    {
        Sanctum::actingAs($this->superAdmin);
        
        // Direct model access check
        $allUsers = User::all();
        $this->assertCount(3, $allUsers);
        
        // Verify can find User B
        $fetchedUserB = User::find($this->userB->id);
        $this->assertNotNull($fetchedUserB, 'Super Admin should be able to find User B directly');
    }
}
