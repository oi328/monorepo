<?php

namespace App\Services\Google;

use App\Contracts\GoogleAdsApiClientInterface;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

class MockGoogleAdsApiClient implements GoogleAdsApiClientInterface
{
    protected $mockService;

    public function __construct(GoogleAdsMockService $mockService)
    {
        $this->mockService = $mockService;
    }

    protected function checkMockConstraints($tenantId = null)
    {
        // Token Expiration Simulation
        if ($tenantId) {
            $this->checkTokenExpiration($tenantId);
        }

        // Rate Limit Simulation
        $rateLimit = Config::get('services.google.ads.mock_rate_limit', 50);
        // In a real implementation, we would track usage in cache/redis.
        // For simplicity, we just log it here.
        
        // Failure Simulation
        $failureProbability = Config::get('services.google.ads.mock_failure_probability', 0.0);
        if (rand(1, 100) / 100 <= $failureProbability) {
            $errors = ['TIMEOUT', 'INTERNAL_ERROR', 'RATE_LIMIT_EXCEEDED'];
            $error = $errors[array_rand($errors)];
            Log::channel('google_ads_mock')->error("Simulated Google Ads API Failure: {$error}");
            throw new \Exception("Simulated Google Ads API Failure: {$error}");
        }
    }

    protected function checkTokenExpiration($tenantId)
    {
        $expireMin = Config::get('services.google.ads.mock_token_expire_min', 60);
        
        // Check integration updated_at to simulate expiration
        $integration = \App\Models\GoogleIntegration::where('tenant_id', $tenantId)->first();
        if ($integration && $integration->updated_at && $integration->updated_at->diffInMinutes(now()) > $expireMin) {
             Log::channel('google_ads_mock')->error("Simulated Google Ads API Failure: UNAUTHENTICATED (Token Expired)");
             throw new \Exception("Simulated Google Ads API Failure: UNAUTHENTICATED");
        }
    }

    public function getCampaigns(string $tenantId)
    {
        $this->checkMockConstraints($tenantId);
        Log::channel('google_ads_mock')->info("Fetching Mock Campaigns for Tenant: {$tenantId}");
        
        // We could store mock data in cache or DB to make it persistent across calls if needed.
        // For now, we generate fresh mock data.
        return $this->mockService->generateCampaigns();
    }

    public function getAdGroups(string $tenantId, string $campaignId)
    {
        $this->checkMockConstraints($tenantId);
        Log::channel('google_ads_mock')->info("Fetching Mock AdGroups for Campaign: {$campaignId}");
        
        return $this->mockService->generateAdGroups($campaignId);
    }

    public function getAds(string $tenantId, string $adGroupId)
    {
        $this->checkMockConstraints($tenantId);
        Log::channel('google_ads_mock')->info("Fetching Mock Ads for AdGroup: {$adGroupId}");
        
        return $this->mockService->generateAds($adGroupId);
    }

    public function uploadClickConversions(string $tenantId, array $data)
    {
        $this->checkMockConstraints($tenantId);
        Log::channel('google_ads_mock')->info("Uploading Mock Conversion for Tenant: {$tenantId}", $data);

        return ['results' => [
            [
                'conversionAction' => $data['conversionActionId'],
                'gclid' => $data['gclid']
            ]
        ]];
    }
}
