<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\LeadAction;
use App\Models\CrmSetting;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LeadSearchNormalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_matches_last_comment_by_words_and_phone_variants(): void
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Tenant A',
            'domain' => 'tenant-a',
            'status' => 'active',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
        ]);

        Sanctum::actingAs($user);

        $leadEg = Lead::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Ahmed',
            'phone' => '01012345678',
            'notes' => null,
        ]);

        LeadAction::create([
            'lead_id' => $leadEg->id,
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'action_type' => 'call',
            'description' => 'Called Ahmed about contract',
            'next_action_type' => 'call',
            'details' => [
                'notes' => 'تم الاتفاق على عقد جديد',
            ],
        ]);

        // Phone normalization: +20... should match local Egypt format stored in DB.
        $this->getJson('/api/leads?search=%2B20%2010%201234%205678')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $leadEg->id]);

        // Word-based search: both terms must match somewhere (e.g. last comment).
        $this->getJson('/api/leads?search=Ahmed%20contract')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $leadEg->id]);

        $this->getJson('/api/leads?search=%D8%B9%D9%82%D8%AF%20%D8%AC%D8%AF%D9%8A%D8%AF')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $leadEg->id]);

        // Gulf normalization (KSA/UAE): +966/+971 should match local 05xxxxxxxx stored in DB.
        $leadGulf = Lead::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Gulf Lead',
            'phone' => '0501234567',
        ]);

        $this->getJson('/api/leads?search=%2B966%2050%20123%204567')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $leadGulf->id]);

        $this->getJson('/api/leads?search=%2B971501234567')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $leadGulf->id]);
    }

    public function test_store_marks_duplicate_and_links_to_original_by_normalized_phone(): void
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Tenant A',
            'domain' => 'tenant-a',
            'status' => 'active',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
        ]);

        Sanctum::actingAs($user);

        CrmSetting::create([
            'tenant_id' => null,
            'settings' => ['duplicationSystem' => true],
        ]);

        $original = Lead::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Original',
            'phone' => '01555143944',
            'status' => 'new',
        ]);

        $res = $this->postJson('/api/leads', [
            'name' => 'Dup',
            'phone' => '020 1555143944',
            'source' => 'web',
        ]);

        $res->assertStatus(201);
        $this->assertEquals('duplicate', strtolower((string) $res->json('status')));
        $this->assertEquals($original->id, (int) ($res->json('meta_data.duplicate_of') ?? 0));
    }

    public function test_update_clears_duplicate_link_when_phone_becomes_unique(): void
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Tenant A',
            'domain' => 'tenant-a',
            'status' => 'active',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
        ]);

        Sanctum::actingAs($user);

        CrmSetting::create([
            'tenant_id' => null,
            'settings' => ['duplicationSystem' => true],
        ]);

        $original = Lead::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Ahmed',
            'email' => 'ahmed@example.com',
            'phone' => '01000000011',
            'status' => 'new',
            'stage' => 'New Lead',
        ]);

        // Create a duplicate by the same phone (different formatting is fine).
        $dupRes = $this->postJson('/api/leads', [
            'name' => 'Ahmed',
            'email' => 'ahmed@example.com',
            'phone' => '020 1000000011',
            'source' => 'import',
        ]);

        $dupRes->assertStatus(201);
        $dupId = (int) ($dupRes->json('id') ?? 0);
        $this->assertGreaterThan(0, $dupId);
        $this->assertEquals($original->id, (int) ($dupRes->json('meta_data.duplicate_of') ?? 0));

        // Now change phone to a unique number; lead should no longer be considered a duplicate.
        $updateRes = $this->putJson("/api/leads/{$dupId}", [
            'phone' => '01000000012',
        ]);

        $updateRes->assertStatus(200);
        $this->assertNotEquals('duplicate', strtolower((string) $updateRes->json('status')));
        $this->assertNull($updateRes->json('meta_data.duplicate_of'));
    }
}
