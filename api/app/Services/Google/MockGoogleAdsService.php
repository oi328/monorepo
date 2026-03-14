<?php

namespace App\Services\Google;

use App\Contracts\GoogleAdsServiceInterface;
use App\Models\GoogleAdsAccount;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MockGoogleAdsService implements GoogleAdsServiceInterface
{
    protected function checkFailuresAndLimits(GoogleAdsAccount $account)
    {
        $mockMode = Config::get('services.google.ads.mock_mode', false);
        if (!$mockMode) {
            return; // Or throw error? But this service is only bound when mock mode is on.
        }

        // 1. Token Expiration Simulation
        $expireMin = Config::get('services.google.ads.mock_token_expire_min', 5);
        if ($account->updated_at && $account->updated_at->diffInMinutes(now()) > $expireMin) {
            Log::channel('google_ads_mock')->error("[Mock] Token Expired for Account: {$account->id}");
            throw new \Exception("Simulated Google Ads API Failure: UNAUTHENTICATED (Token Expired)");
        }

        // 2. Network Failure Simulation
        $failureProb = Config::get('services.google.ads.mock_failure_probability', 0.1);
        if (rand(1, 100) / 100 <= $failureProb) {
            $errors = ['TIMEOUT', 'INTERNAL_ERROR', 'UNAVAILABLE'];
            $error = $errors[array_rand($errors)];
            Log::channel('google_ads_mock')->error("[Mock] Network Failure: {$error} for Account: {$account->id}");
            throw new \Exception("Simulated Google Ads API Failure: {$error}");
        }

        // 3. Rate Limit Simulation
        // For simplicity, we just log a hit. Real rate limiting would require cache/redis.
        $rateLimit = Config::get('services.google.ads.mock_rate_limit', 50);
        // Here we could check cache key "google_ads_mock_rate_limit_{$account->id}"
        // But for now, we just log that we are checking it.
        Log::channel('google_ads_mock')->info("[Mock] Rate limit check passed for Account: {$account->id} (Limit: {$rateLimit})");
    }

    public function getCampaigns(string $accountId)
    {
        $account = GoogleAdsAccount::find($accountId);
        if (!$account) {
            $account = GoogleAdsAccount::where('google_ads_id', $accountId)->first();
        }
        if (!$account) {
            throw new \Exception("Google Ads Account not found: {$accountId}");
        }

        $this->checkFailuresAndLimits($account);

        Log::channel('google_ads_mock')->info("[Mock] Generating campaigns for Account: {$account->id} (Tenant: {$account->tenant_id})");

        // Generate mock campaigns
        $campaigns = [];
        $count = request()->input('count', 5); // Allow overriding via request if triggered via controller

        for ($i = 0; $i < $count; $i++) {
            $spend = rand(100, 10000);
            $conversions = rand(0, 50);
            $revenue = $conversions * rand(50, 200);

            $campaigns[] = [
                'id' => (string) rand(1000000000, 9999999999),
                'name' => "Mock Campaign " . Str::random(5),
                'status' => 'ENABLED',
                'advertising_channel_type' => 'SEARCH',
                'metrics' => [
                    'impressions' => rand(1000, 50000),
                    'clicks' => rand(100, 2000),
                    'cost_micros' => $spend * 1000000,
                    'conversions' => $conversions,
                    'all_conversions_value' => $revenue,
                ],
                'account_id' => $account->id,
                'tenant_id' => $account->tenant_id,
            ];
        }

        return $campaigns;
    }

    public function getLeads(string $accountId)
    {
        $account = GoogleAdsAccount::find($accountId);
        if (!$account) {
            $account = GoogleAdsAccount::where('google_ads_id', $accountId)->first();
        }
        if (!$account) {
            throw new \Exception("Google Ads Account not found: {$accountId}");
        }

        $this->checkFailuresAndLimits($account);

        Log::channel('google_ads_mock')->info("[Mock] Generating leads for Account: {$account->id} (Tenant: {$account->tenant_id})");

        $leads = [];
        $count = request()->input('count', 10);

        for ($i = 0; $i < $count; $i++) {
            $leads[] = [
                'lead_id' => Str::uuid()->toString(),
                'campaign_id' => (string) rand(1000000000, 9999999999),
                'ad_group_id' => (string) rand(1000000000, 9999999999),
                'creative_id' => (string) rand(1000000000, 9999999999),
                'form_id' => (string) rand(1000000000, 9999999999),
                'submitted_at' => now()->subMinutes(rand(1, 600))->toIso8601String(),
                'user_column_data' => [
                    ['column_id' => 'FULL_NAME', 'string_value' => 'Mock User ' . Str::random(3)],
                    ['column_id' => 'EMAIL', 'string_value' => 'mock.' . Str::random(5) . '@example.com'],
                    ['column_id' => 'PHONE_NUMBER', 'string_value' => '+1555' . rand(1000000, 9999999)],
                ],
                'account_id' => $account->id,
                'tenant_id' => $account->tenant_id,
            ];
        }

        return $leads;
    }

    public function uploadConversion(string $accountId, array $conversionData)
    {
        Log::channel('google_ads_mock')->info("[Mock] Uploading conversion for Account: {$accountId}", $conversionData);

        return [
            'partialFailureError' => null,
            'results' => [
                [
                    'gclid' => $conversionData['gclid'] ?? 'mock_gclid',
                    'conversionAction' => $conversionData['conversionActionId'] ?? 'mock_action_id',
                    'conversionDateTime' => $conversionData['conversionTime'] ?? now()->toIso8601String(),
                    'conversionValue' => $conversionData['conversionValue'] ?? 0,
                    'currencyCode' => $conversionData['currencyCode'] ?? 'USD',
                ]
            ]
        ];
    }
}
