<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\MetaPage;
use App\Models\MetaBusiness;
use App\Models\MetaAdAccount;
use App\Models\MetaConnection;
use App\Models\Campaign;
use App\Services\MetaAuthService;
use App\Services\MetaCampaignService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use App\Jobs\ProcessMetaLead;

class MetaMockModeTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Setup Tenant and User
        $this->tenant = Tenant::create(['id' => 'test_tenant', 'name' => 'Test Tenant', 'slug' => 'test-tenant']);
        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@test.com',
        ]);
        
        // Enable Mock Mode
        config(['services.meta.mock_mode' => true]);
        config(['services.meta.mock_failure_probability' => 0]); // Disable random failures for tests
    }

    public function test_meta_mock_auth_flow()
    {
        $service = app(MetaAuthService::class);

        // 1. Test Redirect URL
        $redirectUrl = $service->getRedirectUrl();
        $this->assertStringContainsString('api/auth/meta/callback', $redirectUrl);
        $this->assertStringContainsString('code=', $redirectUrl);
        
        // 2. Test Callback Handling (Connect)
        $mockSocialUser = [
            'id' => 'mock_user_id',
            'token' => 'mock_token',
            'name' => 'Mock User',
            'email' => 'mock@example.com'
        ];
        $connection = $service->handleSocialUser($this->tenant->id, $mockSocialUser);
        
        $this->assertNotNull($connection);
        $this->assertEquals('Mock User', $connection->name);
        
        // 3. Assert Assets Synced
        $this->assertDatabaseHas('meta_businesses', [
            'tenant_id' => $this->tenant->id,
            'business_name' => 'Mock Business 1'
        ]);
        
        $this->assertDatabaseHas('meta_ad_accounts', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Mock Ad Account 1'
        ]);
        
        $this->assertDatabaseHas('meta_pages', [
            'tenant_id' => $this->tenant->id,
            'page_name' => 'Mock Page 1'
        ]);
    }

    public function test_meta_mock_webhook_flow()
    {
        // Setup: Create a Page first (simulating connection)
        $service = app(MetaAuthService::class);
        $mockSocialUser = [
            'id' => 'mock_user_id',
            'token' => 'mock_token',
            'name' => 'Mock User',
            'email' => 'mock@example.com'
        ];
        $service->handleSocialUser($this->tenant->id, $mockSocialUser);
        
        $page = MetaPage::where('tenant_id', $this->tenant->id)->first();
        $this->assertNotNull($page);

        // 1. Trigger Mock Webhook via Controller using Page ID
        $response = $this->actingAs($this->user)
            ->postJson("/api/meta/mock/webhook/{$page->page_id}?count=1");
            
        $response->assertStatus(200);
        $response->assertJsonStructure(['results']);

        // Assert Lead Created (Job should run synchronously in test environment)
        $this->assertDatabaseHas('leads', [
            'tenant_id' => $this->tenant->id,
            'platform' => 'facebook'
        ]);
    }

    public function test_meta_mock_lead_processing_end_to_end()
    {
        // Setup assets
        $authService = app(MetaAuthService::class);
        $mockSocialUser = [
            'id' => 'mock_user_id',
            'token' => 'mock_token',
            'name' => 'Mock User',
            'email' => 'mock@example.com'
        ];
        $authService->handleSocialUser($this->tenant->id, $mockSocialUser);
        
        $page = MetaPage::where('tenant_id', $this->tenant->id)->first();
        
        // Trigger webhook manually to capture payload
        $mockService = app(\App\Services\Meta\MetaMockService::class);
        $payload = $mockService->generateLeadWebhookPayload($page->page_id);
        
        // Dispatch Job Manually (simulating the queue worker picking it up)
        $leadGenId = $payload['entry'][0]['changes'][0]['value']['leadgen_id'];
        
        // Ensure job runs synchronously for this test
        $job = new ProcessMetaLead($this->tenant->id, $leadGenId, $page->page_id);
        $job->handle(app(\App\Services\MetaLeadService::class));
        
        // Assert Lead Created
        $this->assertDatabaseHas('leads', [
            'tenant_id' => $this->tenant->id,
            'email' => 'mock@example.com',
            'name' => 'Mock User',
            'platform' => 'facebook'
        ]);
    }

    public function test_meta_mock_campaign_sync()
    {
        // Setup assets
        $authService = app(MetaAuthService::class);
        $mockSocialUser = [
            'id' => 'mock_user_id',
            'token' => 'mock_token',
            'name' => 'Mock User',
            'email' => 'mock@example.com'
        ];
        $authService->handleSocialUser($this->tenant->id, $mockSocialUser);
        
        // Run Sync
        $campaignService = app(MetaCampaignService::class);
        $campaignService->syncAll($this->tenant->id);
        
        // Assert Campaign Created
        // MockMetaApiClient returns a campaign with id 'mock_campaign_1'
        $this->assertDatabaseHas('campaigns', [
            'tenant_id' => $this->tenant->id,
            'meta_id' => 'mock_campaign_1',
            'name' => 'Mock Campaign 1'
        ]);
        
        // Assert AdSet Created
        $this->assertDatabaseHas('ad_sets', [ 
            'tenant_id' => $this->tenant->id,
            'name' => 'Mock AdSet 1' 
        ]);
    }

    public function test_real_webhook_endpoint_with_mock_bypass()
    {
        // Setup: Create a Page first (simulating connection)
        $service = app(MetaAuthService::class);
        $mockSocialUser = [
            'id' => 'mock_user_id',
            'token' => 'mock_token',
            'name' => 'Mock User',
            'email' => 'mock@example.com'
        ];
        $service->handleSocialUser($this->tenant->id, $mockSocialUser);
        
        $page = MetaPage::where('tenant_id', $this->tenant->id)->first();
        $this->assertNotNull($page);

        // Generate mock payload using the helper
        $mockService = app(\App\Services\Meta\MetaMockService::class);
        $payload = $mockService->generateLeadWebhookPayload($page->page_id);

        // Send POST request to REAL webhook endpoint WITHOUT signature
        // This validates that mock mode bypasses signature verification
        $response = $this->postJson('/api/meta/webhook', $payload);

        $response->assertStatus(200);
        $response->assertJson(['ok' => true]);

        // Assert Lead Created (Job should run synchronously in test environment)
        $this->assertDatabaseHas('leads', [
            'tenant_id' => $this->tenant->id,
            'platform' => 'facebook'
        ]);
    }

    public function test_meta_mock_insight_sync()
    {
        // Setup assets
        $authService = app(MetaAuthService::class);
        $mockSocialUser = [
            'id' => 'mock_user_id',
            'token' => 'mock_token',
            'name' => 'Mock User',
            'email' => 'mock@example.com'
        ];
        $authService->handleSocialUser($this->tenant->id, $mockSocialUser);
        
        // Run Sync
        $insightService = app(\App\Services\MetaInsightService::class);
        $insightService->syncInsights($this->tenant->id, 3);
        
        // Assert Insight Created
        // MockMetaApiClient returns a campaign insight for 'mock_campaign_1'
        $this->assertDatabaseHas('campaign_insights', [
            'tenant_id' => $this->tenant->id,
            'meta_campaign_id' => 'mock_campaign_1',
            'impressions' => 2000,
            'clicks' => 100,
            'spend' => 150.00
        ]);
    }
}
