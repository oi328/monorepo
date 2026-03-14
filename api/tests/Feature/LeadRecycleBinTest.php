<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LeadRecycleBinTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear cached permissions
        $this->app->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // Create Tenant
        $this->tenant = Tenant::create([
            'name' => 'Test Tenant',
            'domain' => 'test-tenant',
            'slug' => 'test-tenant',
            'status' => 'active',
        ]);

        // Create User
        $this->user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'tenant_id' => $this->tenant->id,
        ]);
    }

    public function test_deleted_lead_appears_in_recycle_bin()
    {
        Sanctum::actingAs($this->user);

        // Create a lead
        $lead = Lead::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'status' => 'new'
        ]);

        // Delete the lead via API
        $response = $this->deleteJson("/api/leads/{$lead->id}");
        $response->assertStatus(200);

        // Assert it's soft deleted
        $this->assertSoftDeleted('leads', ['id' => $lead->id]);

        // Check it appears in recycle bin
        $response = $this->getJson('/api/leads/trashed');
        $response->assertStatus(200);
        $response->assertJsonFragment(['id' => $lead->id, 'name' => 'John Doe']);
    }

    public function test_deleted_lead_has_deleted_by_set()
    {
        Sanctum::actingAs($this->user);

        $lead = Lead::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'status' => 'new'
        ]);

        $this->deleteJson("/api/leads/{$lead->id}");

        $lead->refresh();
        // Since it's soft deleted, we need to query withTrashed or check DB directly
        $deletedLead = Lead::withTrashed()->find($lead->id);

        $this->assertNotNull($deletedLead->deleted_by);
        $this->assertEquals($this->user->id, $deletedLead->deleted_by);
        $this->assertNotNull($deletedLead->deleted_at);
    }

    public function test_can_restore_lead()
    {
        Sanctum::actingAs($this->user);

        $lead = Lead::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Restorable Lead',
            'email' => 'restore@example.com',
            'status' => 'new'
        ]);

        $lead->delete(); // Soft delete directly or via API

        $response = $this->postJson("/api/leads/{$lead->id}/restore");
        $response->assertStatus(200);

        $this->assertNotSoftDeleted('leads', ['id' => $lead->id]);
    }

    public function test_can_force_delete_lead()
    {
        Sanctum::actingAs($this->user);

        $lead = Lead::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Delete Me',
            'email' => 'delete@example.com',
            'status' => 'new'
        ]);

        $lead->delete(); // Soft delete first

        $response = $this->deleteJson("/api/leads/{$lead->id}/force");
        $response->assertStatus(200);

        $this->assertDatabaseMissing('leads', ['id' => $lead->id]);
    }

    public function test_bulk_restore_leads()
    {
        Sanctum::actingAs($this->user);

        $lead1 = Lead::create(['tenant_id' => $this->tenant->id, 'name' => 'L1', 'status' => 'new']);
        $lead2 = Lead::create(['tenant_id' => $this->tenant->id, 'name' => 'L2', 'status' => 'new']);

        $lead1->delete();
        $lead2->delete();

        $response = $this->postJson('/api/leads/bulk-restore', [
            'ids' => [$lead1->id, $lead2->id]
        ]);

        $response->assertStatus(200);
        $this->assertNotSoftDeleted('leads', ['id' => $lead1->id]);
        $this->assertNotSoftDeleted('leads', ['id' => $lead2->id]);
    }

    public function test_bulk_force_delete_leads()
    {
        Sanctum::actingAs($this->user);

        $lead1 = Lead::create(['tenant_id' => $this->tenant->id, 'name' => 'L1', 'status' => 'new']);
        $lead2 = Lead::create(['tenant_id' => $this->tenant->id, 'name' => 'L2', 'status' => 'new']);

        $lead1->delete();
        $lead2->delete();

        $response = $this->postJson('/api/leads/bulk-force-delete', [
            'ids' => [$lead1->id, $lead2->id]
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('leads', ['id' => $lead1->id]);
        $this->assertDatabaseMissing('leads', ['id' => $lead2->id]);
    }
}
