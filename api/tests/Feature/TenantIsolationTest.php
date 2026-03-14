<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected $tenantA;
    protected $tenantB;
    protected $userA;
    protected $userB;
    protected $orderA;
    protected $orderB;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Clear cached permissions
        $this->app->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // 1. Create Tenants
        $this->tenantA = Tenant::create([
            'name' => 'Tenant A',
            'domain' => 'tenant-a',
            'status' => 'active',
        ]);

        $this->tenantB = Tenant::create([
            'name' => 'Tenant B',
            'domain' => 'tenant-b',
            'status' => 'active',
        ]);

        // 2. Create Users
        $this->userA = User::factory()->create([
            'name' => 'User A',
            'email' => 'user_a@example.com',
            'tenant_id' => $this->tenantA->id,
        ]);

        $this->userB = User::factory()->create([
            'name' => 'User B',
            'email' => 'user_b@example.com',
            'tenant_id' => $this->tenantB->id,
        ]);

        // 3. Create Orders (Manually setting tenant_id to simulate database state)
        $this->orderA = Order::create([
            'tenant_id' => $this->tenantA->id,
            'amount' => 100.00,
            'status' => 'pending',
            'uuid' => (string) Str::uuid(),
        ]);

        $this->orderB = Order::create([
            'tenant_id' => $this->tenantB->id,
            'amount' => 200.00,
            'status' => 'completed',
            'uuid' => (string) Str::uuid(),
        ]);
    }

    /**
     * Scenario 1 & 2: Direct order retrieval/update attempts via API endpoints 
     * using Tenant B's Order ID while authenticated as Tenant A's user.
     */
    public function test_user_cannot_access_other_tenant_order_via_api()
    {
        Sanctum::actingAs($this->userA);

        // Attempt to view Order B
        $response = $this->getJson("/api/orders/{$this->orderB->id}");
        
        // Should be 404 because Global Scope filters it out
        $response->assertStatus(404);

        // Attempt to update Order B
        $response = $this->putJson("/api/orders/{$this->orderB->id}", [
            'amount' => 999.99
        ]);

        $response->assertStatus(404);
    }

    /**
     * Scenario 3: Attempts to access Tenant B's orders through list endpoint.
     */
    public function test_user_cannot_see_other_tenant_orders_in_list()
    {
        Sanctum::actingAs($this->userA);

        $response = $this->getJson('/api/orders');

        $response->assertStatus(200)
            ->assertJsonFragment(['id' => $this->orderA->id])
            ->assertJsonMissing(['id' => $this->orderB->id]);
    }

    /**
     * Scenario 4: Testing with various Order ID formats including valid UUIDs, numeric IDs, and malformed IDs.
     */
    public function test_various_id_formats_rejection()
    {
        Sanctum::actingAs($this->userA);

        // Numeric ID of other tenant
        $this->getJson("/api/orders/{$this->orderB->id}")->assertStatus(404);

        // Malformed ID
        $this->getJson('/api/orders/invalid-id-format')->assertStatus(404);

        // Non-existent ID
        $this->getJson('/api/orders/999999')->assertStatus(404);
    }

    /**
     * Scenario 5: Validation that tenant scoping is applied at the database query level.
     */
    public function test_tenant_scoping_at_database_level()
    {
        // Authenticate as User A
        $this->actingAs($this->userA);

        // Verify that global scope is applied to Model queries
        $visibleOrders = Order::all();
        
        $this->assertTrue($visibleOrders->contains($this->orderA));
        $this->assertFalse($visibleOrders->contains($this->orderB));
        $this->assertCount(1, $visibleOrders); // Should only see 1 order (User A's)

        // Verify direct database query (Eloquent) with scope
        $count = Order::where('status', 'completed')->count();
        $this->assertEquals(0, $count); // User A has no completed orders (Order B is completed)
    }

    /**
     * Scenario 6: Edge cases such as soft deleted orders (simulated as accessing deleted).
     */
    public function test_accessing_deleted_order_returns_404()
    {
        Sanctum::actingAs($this->userA);

        $order = Order::create([
            'tenant_id' => $this->tenantA->id,
            'amount' => 50.00,
            'status' => 'pending',
        ]);

        $this->deleteJson("/api/orders/{$order->id}")->assertStatus(204);

        // Try to access it again
        $this->getJson("/api/orders/{$order->id}")->assertStatus(404);
    }

    /**
     * Scenario 7: Verify that creating an order automatically assigns the correct tenant_id.
     */
    public function test_create_order_auto_assigns_tenant_id()
    {
        Sanctum::actingAs($this->userA);

        $response = $this->postJson('/api/orders', [
            'amount' => 300.00,
            'status' => 'new',
        ]);

        $response->assertStatus(201);
        $orderId = $response->json('id');
        
        $order = Order::find($orderId);
        $this->assertEquals($this->tenantA->id, $order->tenant_id);
    }

    /**
     * Scenario 8: Ensure Tenant B cannot access Tenant A's order (Symmetry).
     */
    public function test_symmetry_tenant_b_cannot_access_tenant_a()
    {
        Sanctum::actingAs($this->userB);

        $this->getJson("/api/orders/{$this->orderA->id}")->assertStatus(404);
        
        $response = $this->getJson('/api/orders');
        $response->assertJsonFragment(['id' => $this->orderB->id])
                 ->assertJsonMissing(['id' => $this->orderA->id]);
    }

    /**
     * Scenario 9: Application level authorization check.
     */
    public function test_global_scope_is_always_applied_by_default()
    {
        Sanctum::actingAs($this->userA);
        
        // This should fail to find the model
        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        
        // Using findOrFail on Order B should fail for User A
        Order::findOrFail($this->orderB->id);
    }

    /**
     * Scenario 10: Verify Spatie Permissions are Tenant-Aware.
     * User with "Admin" role in Tenant A cannot perform "Admin" actions in Tenant B.
     */
    public function test_roles_and_permissions_are_tenant_scoped()
    {
        // 1. Setup Permissions and Roles for Tenant A
        setPermissionsTeamId($this->tenantA->id);
        $permission = Permission::firstOrCreate(['name' => 'view-reports', 'guard_name' => 'web']);
        $roleA = Role::firstOrCreate(['name' => 'Admin', 'tenant_id' => $this->tenantA->id]);
        $roleA->givePermissionTo($permission);
        
        $this->userA->assignRole($roleA);

        // 2. Setup Roles for Tenant B (User A has NO role here)
        setPermissionsTeamId($this->tenantB->id);
        $roleB = Role::firstOrCreate(['name' => 'Admin', 'tenant_id' => $this->tenantB->id]);
        $roleB->givePermissionTo($permission); // Same permission name, but via different role context
        
        // 3. Act as User A (Tenant A context)
        Sanctum::actingAs($this->userA);
        
        // MANUALLY set context to Tenant A for the unit-level check
        // (Middleware only runs during HTTP requests, so $this->userA->can() needs manual context here)
        setPermissionsTeamId($this->tenantA->id);
        
        // 4. Verify Access in Tenant A (Should pass)
        $this->assertTrue($this->userA->can('view-reports'), 'User A should have view-reports in Tenant A');
        
        // Verify via API (Middleware runs here, so it should work automatically)
        $this->getJson('/api/dashboard/widgets')->assertStatus(200);

        // 5. Verify Access in Tenant B (Should fail)
        // We simulate a check against Tenant B context manually
        setPermissionsTeamId($this->tenantB->id);
        
        // Reload user to ensure relations are refreshed
        $this->userA->unsetRelation('roles');
        $this->userA->unsetRelation('permissions');
        
        $this->assertFalse($this->userA->can('view-reports'), 'User A should NOT have view-reports in Tenant B context');
        
        // NOTE: We cannot easily test the API endpoint for Tenant B context while authenticated as User A 
        // because the middleware forces the context back to User A's tenant_id.
        // But the unit test above proves the underlying mechanism (can() check) respects the team id.
    }
}
