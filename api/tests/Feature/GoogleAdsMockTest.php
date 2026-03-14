<?php

namespace Tests\Feature;

use App\Jobs\SyncGoogleAccount;
use App\Models\Campaign;
use App\Models\GoogleAdsAccount;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class GoogleAdsMockTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create Tenant and User
        $this->tenant = Tenant::factory()->create();
        $this->user = User::factory()->create(['tenant_id' => $this->tenant->id]);
        
        // Authenticate
        $this->actingAs($this->user);

        // Enable Mock Mode
        Config::set('services.google.ads.mock_mode', true);
        Config::set('services.google.ads.mock_on_local', true);
    }

    public function test_can_connect_mock_account()
    {
        $response = $this->postJson("/api/tenant/{$this->tenant->id}/google-ads/connect", [
            'account_name' => 'Mock Account 1',
            'google_ads_id' => '123-456-7890',
            'email' => 'mock@example.com',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('account.account_name', 'Mock Account 1')
            ->assertJsonPath('account.is_mock', true);

        $this->assertDatabaseHas('google_ads_accounts', [
            'tenant_id' => $this->tenant->id,
            'google_ads_id' => '123-456-7890',
            'is_mock' => true,
        ]);
    }

    public function test_mock_sync_dispatches_jobs()
    {
        Queue::fake();

        // 1. Create Account
        $account = GoogleAdsAccount::create([
            'tenant_id' => $this->tenant->id,
            'account_name' => 'Mock Account 1',
            'google_ads_id' => '123-456-7890',
            'email' => 'mock@example.com',
            'is_mock' => true,
        ]);

        // 2. Trigger Sync via Mock Controller (Tenant Level)
        $response = $this->postJson("/api/mock/tenant/{$this->tenant->id}/google-ads/123-456-7890/campaigns"); // This endpoint maps to triggerMockCampaigns

        // Actually the route is:
        // Route::post('/internal/mock/google-ads/campaigns/{tenant}', ...)
        // And account-specific:
        // Route::post('/mock/tenant/{tenant_id}/google-ads/{account_id}/campaigns', ...)

        $response = $this->postJson("/api/mock/tenant/{$this->tenant->id}/google-ads/{$account->id}/campaigns");

        $response->assertStatus(200);

        // Since we called account-specific sync, it calls syncAccount directly (synchronous in controller).
        // Wait, let's check the controller logic again.
        // Controller: $this->campaignService->syncAccount($account);
        // Service: syncAccount(...) -> NO JOB DISPATCH inside syncAccount.
        
        // So Queue::fake() won't catch anything here unless syncAccount dispatches something.
        // But syncAccount does the work inline.
        
        // However, if we call the TENANT level sync:
        // Controller: $this->campaignService->syncAll($tenantId);
        // Service: syncAll(...) -> Dispatch SyncGoogleAccount job.

        $response2 = $this->postJson("/api/internal/mock/google-ads/campaigns/{$this->tenant->id}");
        $response2->assertStatus(200);

        Queue::assertPushed(SyncGoogleAccount::class, function ($job) use ($account) {
            return $job->account->id === $account->id;
        });
    }

    public function test_mock_sync_generates_campaigns()
    {
        // 1. Create Account
        $account = GoogleAdsAccount::create([
            'tenant_id' => $this->tenant->id,
            'account_name' => 'Mock Account 1',
            'google_ads_id' => '123-456-7890',
            'email' => 'mock@example.com',
            'is_mock' => true,
        ]);

        // 2. Trigger Sync (Account Level - Synchronous)
        $response = $this->postJson("/api/mock/tenant/{$this->tenant->id}/google-ads/{$account->id}/campaigns?count=3");
        $response->assertStatus(200);

        // 3. Verify Campaigns in DB
        $this->assertDatabaseCount('campaigns', 3);
        $this->assertDatabaseHas('campaigns', [
            'tenant_id' => $this->tenant->id,
            'ad_account_id' => $account->id,
            'provider' => 'google_ads',
            'source' => 'Google Ads',
        ]);
    }

    public function test_tenant_isolation()
    {
        $tenant2 = Tenant::factory()->create();
        $account2 = GoogleAdsAccount::create([
            'tenant_id' => $tenant2->id,
            'account_name' => 'Tenant 2 Account',
            'google_ads_id' => '987-654-3210',
            'email' => 'tenant2@example.com',
            'is_mock' => true,
        ]);

        // Try to access Tenant 2's account as Tenant 1 User
        $response = $this->getJson("/api/tenant/{$this->tenant->id}/google-ads/{$account2->id}/campaigns");
        
        // Should be 404 because the controller filters by tenant_id
        $response->assertStatus(404);
    }

    public function test_mock_failure_simulation()
    {
        // 1. Create Account
        $account = GoogleAdsAccount::create([
            'tenant_id' => $this->tenant->id,
            'account_name' => 'Fail Account',
            'google_ads_id' => 'FAIL-123',
            'email' => 'fail@example.com',
            'is_mock' => true,
        ]);

        // 2. Force Failure Config
        Config::set('services.google.ads.mock_failure_probability', 1.0); // 100% failure

        // 3. Trigger Sync (Synchronous)
        $response = $this->postJson("/api/mock/tenant/{$this->tenant->id}/google-ads/{$account->id}/campaigns");
        
        // 4. Expect Error
        $response->assertStatus(500);
        $response->assertJsonStructure(['error']);
    }
}
