<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\LeadAction;
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
}
