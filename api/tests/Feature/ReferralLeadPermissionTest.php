<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\LeadAction;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class ReferralLeadPermissionTest extends TestCase
{
    use RefreshDatabase;

    protected $tenantId;
    protected $salesUser;
    protected $referralUser;
    protected $lead;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Tenant
        $tenant = Tenant::factory()->create([
            'name' => 'Test Tenant',
            'domain' => 'test.example.com',
        ]);
        $this->tenantId = $tenant->id;
        
        // 2. Create Users
        $this->salesUser = User::factory()->create([
            'tenant_id' => $this->tenantId,
            'name' => 'Sales Person',
        ]);

        $this->referralUser = User::factory()->create([
            'tenant_id' => $this->tenantId,
            'name' => 'Referral Supervisor',
        ]);

        // 3. Create Lead assigned to Sales Person
        $this->lead = Lead::factory()->create([
            'tenant_id' => $this->tenantId,
            'name' => 'Test Lead',
            'phone' => '1234567890',
            'assigned_to' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        // 3. Attach Referral Supervisor
        $this->lead->referralUsers()->attach($this->referralUser->id, ['tenant_id' => $this->tenantId]);
    }

    /** @test */
    public function referral_supervisor_cannot_update_lead()
    {
        $response = $this->actingAs($this->referralUser)
                         ->putJson("/api/leads/{$this->lead->id}", [
                             'name' => 'Updated Name',
                             'status' => 'new_status'
                         ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function referral_supervisor_cannot_delete_lead()
    {
        $response = $this->actingAs($this->referralUser)
                         ->deleteJson("/api/leads/{$this->lead->id}");

        $response->assertStatus(403);
    }

    /** @test */
    public function referral_supervisor_cannot_add_regular_action()
    {
        $response = $this->actingAs($this->referralUser)
                         ->postJson("/api/lead-actions", [
                             'lead_id' => $this->lead->id,
                             'type' => 'call',
                             'status' => 'pending',
                             'description' => 'Trying to add a call'
                         ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function referral_supervisor_can_add_comment_action()
    {
        $response = $this->actingAs($this->referralUser)
                         ->postJson("/api/lead-actions", [
                             'lead_id' => $this->lead->id,
                             'type' => 'comment', // Allowed type
                             'status' => 'completed',
                             'description' => 'Adding a comment',
                             'details' => ['text' => 'This is a comment']
                         ]);

        $response->assertStatus(201);
    }

    /** @test */
    public function referral_supervisor_can_add_note_action()
    {
        $response = $this->actingAs($this->referralUser)
                         ->postJson("/api/lead-actions", [
                             'lead_id' => $this->lead->id,
                             'type' => 'note', // Allowed type
                             'status' => 'completed',
                             'description' => 'Adding a note'
                         ]);

        $response->assertStatus(201);
    }

    /** @test */
    public function referral_supervisor_cannot_update_action_details_except_comments()
    {
        // Create an action by sales user
        $action = LeadAction::create([
            'lead_id' => $this->lead->id,
            'user_id' => $this->salesUser->id,
            'action_type' => 'call',
            'details' => ['status' => 'pending', 'duration' => 10],
            'tenant_id' => $this->tenantId
        ]);

        // Try to update duration
        $response = $this->actingAs($this->referralUser)
                         ->putJson("/api/lead-actions/{$action->id}", [
                             'details' => ['duration' => 20]
                         ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function referral_supervisor_can_add_comments_to_existing_action()
    {
        // Create an action by sales user
        $action = LeadAction::create([
            'lead_id' => $this->lead->id,
            'user_id' => $this->salesUser->id,
            'action_type' => 'call',
            'details' => ['status' => 'pending', 'comments' => []],
            'tenant_id' => $this->tenantId
        ]);

        // Add a comment
        $newComment = [['text' => 'New Comment', 'user' => 'Ref User', 'userId' => $this->referralUser->id]];
        
        $response = $this->actingAs($this->referralUser)
                         ->putJson("/api/lead-actions/{$action->id}", [
                             'details' => ['comments' => $newComment]
                         ]);

        $response->assertStatus(200);
    }

    /** @test */
    public function referral_supervisor_cannot_delete_action()
    {
        // Create an action by sales user
        $action = LeadAction::create([
            'lead_id' => $this->lead->id,
            'user_id' => $this->salesUser->id,
            'action_type' => 'call',
            'details' => ['status' => 'pending'],
            'tenant_id' => $this->tenantId
        ]);

        $response = $this->actingAs($this->referralUser)
                         ->deleteJson("/api/lead-actions/{$action->id}");

        $response->assertStatus(403);
    }

    public function test_referral_index_returns_only_referral_leads()
    {
        // Create another lead NOT assigned to referral supervisor
        $otherLead = Lead::factory()->create([
            'tenant_id' => $this->tenantId,
            'name' => 'Other Lead',
            'assigned_to' => $this->salesUser->id,
            'created_by' => $this->salesUser->id,
        ]);

        $response = $this->actingAs($this->referralUser)
                         ->getJson('/api/referral-leads');

        $response->assertStatus(200)
                 ->assertJsonCount(1, 'data') // Only the one attached in setUp
                 ->assertJsonFragment(['id' => $this->lead->id]);
                 
        // Verify specifically that otherLead is not in the data array
        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertNotContains($otherLead->id, $ids);
    }

    public function test_referral_stats_and_filters()
    {
        $response = $this->actingAs($this->referralUser)
                         ->getJson('/api/leads/referral-stats');
        
        $response->assertStatus(200)
                 ->assertJsonStructure(['total', 'new', 'pending']);

        $response = $this->actingAs($this->referralUser)
                         ->getJson('/api/leads/referral-filters');

        $response->assertStatus(200)
                 ->assertJsonStructure(['campaigns', 'sources', 'users', 'stages', 'managers']);
    }
}
