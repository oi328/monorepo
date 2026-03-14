<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Order;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    protected $tenantA;
    protected $userA;
    protected $tenantB;
    protected $userB;
    protected $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create(['name' => 'Tenant A', 'domain' => 'a.localhost']);
        $this->userA = User::factory()->create(['tenant_id' => $this->tenantA->id]);

        $this->tenantB = Tenant::create(['name' => 'Tenant B', 'domain' => 'b.localhost']);
        $this->userB = User::factory()->create(['tenant_id' => $this->tenantB->id]);

        $this->superAdmin = User::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'is_super_admin' => true
        ]);
    }

    public function test_activity_is_logged_with_tenant_id()
    {
        Sanctum::actingAs($this->userA);

        $order = Order::create([
            'uuid' => Str::uuid(),
            'status' => 'pending',
            'amount' => 100,
            'tenant_id' => $this->tenantA->id
        ]);

        $this->assertDatabaseHas('activity_log', [
            'subject_type' => Order::class,
            'subject_id' => $order->id,
            'causer_id' => $this->userA->id,
            'tenant_id' => $this->tenantA->id, // Critical check
            'description' => 'Order has been created',
        ]);
    }

    public function test_tenant_activity_scope_filters_logs()
    {
        // 1. Create logs for Tenant A
        Sanctum::actingAs($this->userA);
        Order::create(['uuid' => Str::uuid(), 'status' => 'pending', 'amount' => 100, 'tenant_id' => $this->tenantA->id]);

        // 2. Create logs for Tenant B
        Sanctum::actingAs($this->userB);
        Order::create(['uuid' => Str::uuid(), 'status' => 'pending', 'amount' => 200, 'tenant_id' => $this->tenantB->id]);

        // 3. Act as User A and query logs
        Sanctum::actingAs($this->userA);
        $logsA = Activity::all();
        
        // Should only see Tenant A logs
        $this->assertCount(1, $logsA);
        $this->assertEquals($this->tenantA->id, $logsA->first()->tenant_id);

        // 4. Act as User B and query logs
        Sanctum::actingAs($this->userB);
        $logsB = Activity::all();
        
        // Should only see Tenant B logs
        $this->assertCount(1, $logsB);
        $this->assertEquals($this->tenantB->id, $logsB->first()->tenant_id);
    }

    public function test_super_admin_can_see_all_logs_via_api()
    {
        // Generate logs for both tenants
        Sanctum::actingAs($this->userA);
        Order::create(['uuid' => Str::uuid(), 'status' => 'pending', 'amount' => 100, 'tenant_id' => $this->tenantA->id]);
        
        Sanctum::actingAs($this->userB);
        Order::create(['uuid' => Str::uuid(), 'status' => 'pending', 'amount' => 200, 'tenant_id' => $this->tenantB->id]);

        // Act as Super Admin
        Sanctum::actingAs($this->superAdmin);

        $response = $this->getJson('/api/super-admin/logs');

        $response->assertStatus(200);
        // We expect 4 logs: 2 Tenants created in setUp, 2 Orders created in test
        $this->assertCount(4, $response->json('data')); 
    }

    public function test_super_admin_api_filtering()
    {
        Sanctum::actingAs($this->userA);
        Order::create(['uuid' => Str::uuid(), 'status' => 'pending', 'amount' => 100, 'tenant_id' => $this->tenantA->id]);
        
        Sanctum::actingAs($this->userB);
        Order::create(['uuid' => Str::uuid(), 'status' => 'pending', 'amount' => 200, 'tenant_id' => $this->tenantB->id]);

        Sanctum::actingAs($this->superAdmin);

        // Filter by Tenant A
        $response = $this->getJson('/api/super-admin/logs?tenant_id=' . $this->tenantA->id);
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($this->tenantA->id, $response->json('data.0.tenant_id'));
    }

    public function test_regular_user_cannot_access_super_admin_logs_api()
    {
        Sanctum::actingAs($this->userA);
        
        $response = $this->getJson('/api/super-admin/logs');
        
        $response->assertStatus(403);
    }
}
