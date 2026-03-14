<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Tenant;
use App\Models\Integration;
use App\Models\MetaConnection;
use App\Models\MetaBusiness;
use App\Models\MetaAdAccount;
use App\Models\MetaPage;
use App\Services\MetaCampaignService;
use Illuminate\Support\Facades\Config;

class LiveSimulationTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_mock_simulation()
    {
        // 1. Setup Configuration
        Config::set('services.meta.mock_mode', true);
        Config::set('services.meta.mock_rate_limit', 50);
        Config::set('services.meta.mock_failure_probability', 0.0);

        // 2. Setup Data
        $tenant = Tenant::create([
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
            'domain' => 'test.tenants.com',
            'database' => 'tenant_test'
        ]);
        
        // Integration
        Integration::create([
            'tenant_id' => $tenant->id,
            'provider' => 'meta',
            'status' => 'active',
            'settings' => []
        ]);

        // Connection
        $connection = MetaConnection::create([
            'tenant_id' => $tenant->id,
            'user_access_token' => 'mock_user_token_123',
            'fb_user_id' => 'mock_fb_user_123',
            'status' => 'active',
            'name' => 'Mock User'
        ]);

        // Business (Linked to Connection)
        $business = MetaBusiness::create([
            'tenant_id' => $tenant->id,
            'connection_id' => $connection->id,
            'fb_business_id' => 'biz_12345',
            'business_name' => 'Mock Business'
        ]);
        
        // Ad Account (Linked to Business)
        $adAccount = MetaAdAccount::create([
            'tenant_id' => $tenant->id,
            'business_id' => $business->id,
            'ad_account_id' => 'act_123456789',
            'name' => 'Mock Ad Account',
            'currency' => 'USD',
            'timezone' => 'America/Los_Angeles',
            'is_active' => true
        ]);

        // Page (Linked to Connection and Ad Account)
        $page = MetaPage::create([
            'tenant_id' => $tenant->id,
            'connection_id' => $connection->id,
            'ad_account_id' => $adAccount->id,
            'page_id' => 'page_987654321',
            'page_name' => 'Mock Page',
            'page_token' => 'mock_page_token_123',
            'is_active' => true
        ]);

        // 3. Step 1: Trigger Mock Webhook (5 leads)
        // POST /api/meta/mock/webhook/{page_id}?count=5
        $response = $this->postJson("/api/meta/mock/webhook/{$page->page_id}?count=5");
        
        $response->assertStatus(200);
        $response->assertJsonStructure(['results']);
        $json = $response->json();
        $this->assertCount(5, $json['results']);
        
        // Verify Leads Stored in DB
        $this->assertDatabaseCount('leads', 5);
        $this->assertDatabaseHas('leads', [
            'tenant_id' => $tenant->id,
            'platform' => 'facebook',
            // Mock service generates names like 'Mock User' usually, check if we can verify content
            // The default mock payload might not have specific name unless we check MockMetaApiClient usage
        ]);

        // 4. Step 2: Trigger Campaign Sync
        $campaignService = app(MetaCampaignService::class);
        $campaignService->syncAll($tenant->id);

        // Verify Campaigns Stored
        // MockMetaApiClient returns a campaign with id 'mock_campaign_1'
        $this->assertDatabaseHas('campaigns', [
            'tenant_id' => $tenant->id,
            'meta_id' => 'mock_campaign_1',
            'name' => 'Mock Campaign 1'
        ]);
        
        // Verify AdSets
        $this->assertDatabaseHas('ad_sets', [
            'tenant_id' => $tenant->id,
            'name' => 'Mock AdSet 1'
        ]);
    }
}
