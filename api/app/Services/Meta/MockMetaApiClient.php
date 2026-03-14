<?php

namespace App\Services\Meta;

use App\Contracts\MetaApiClientInterface;
use Illuminate\Support\Facades\Log;

class MockMetaApiClient implements MetaApiClientInterface
{
    protected $rateLimit = 50; // Mock rate limit
    protected $requestCount = 0;
    protected $failureProbability = 0.1;

    public function __construct()
    {
        $this->rateLimit = config('services.meta.mock_rate_limit', 50);
        $this->failureProbability = config('services.meta.mock_failure_probability', 0.1);
    }

    public function get(string $endpoint, array $params = []): array
    {
        $this->simulateNetworkConditions();
        
        Log::channel('meta_mock')->info("Mock GET Request: {$endpoint}", $params);

        return $this->mockResponse('GET', $endpoint, $params);
    }

    public function post(string $endpoint, array $data = []): array
    {
        $this->simulateNetworkConditions();
        
        Log::channel('meta_mock')->info("Mock POST Request: {$endpoint}", $data);

        return $this->mockResponse('POST', $endpoint, $data);
    }

    protected function simulateNetworkConditions()
    {
        $this->requestCount++;

        // Rate Limit Check
        if ($this->requestCount > $this->rateLimit) {
            $this->throwMockError('Application request limit reached', 4, 17);
        }

        // Random Failure
        if (rand(1, 100) / 100 <= $this->failureProbability) {
            $this->throwMockError('Simulated Network Error', 500, 0);
        }

        // Token Expiration (Simulated if token contains 'expired')
        // We can inspect params/data for 'access_token'
        // For now, let's keep it simple or check if token is explicitly 'expired_token'
    }

    protected function throwMockError($message, $code, $subcode = null)
    {
        $error = [
            'message' => $message,
            'code' => $code,
            'type' => 'OAuthException',
            'fbtrace_id' => 'mock_trace_' . uniqid(),
        ];
        if ($subcode) {
            $error['error_subcode'] = $subcode;
        }

        Log::channel('meta_mock')->error("Mock Error: {$message} ({$code})");

        throw new \Exception("Meta API Error: {$message} (Code: {$code})");
    }

    protected function mockResponse($method, $endpoint, $input)
    {
        // Remove leading slash
        $endpoint = ltrim($endpoint, '/');

        // Route matching
        if (str_contains($endpoint, '/businesses')) {
            return [
                'data' => [
                    ['id' => 'mock_biz_1', 'name' => 'Mock Business 1'],
                    ['id' => 'mock_biz_2', 'name' => 'Mock Business 2'],
                ]
            ];
        }

        if (str_contains($endpoint, '/owned_ad_accounts')) {
            return [
                'data' => [
                    ['account_id' => '123456789', 'id' => 'act_123456789', 'name' => 'Mock Ad Account 1', 'currency' => 'USD', 'timezone' => 'UTC'],
                    ['account_id' => '987654321', 'id' => 'act_987654321', 'name' => 'Mock Ad Account 2', 'currency' => 'EUR', 'timezone' => 'CET'],
                ],
                'paging' => ['cursors' => ['before' => 'xxx', 'after' => 'yyy']]
            ];
        }

        if (str_contains($endpoint, '/accounts')) { // Pages
            return [
                'data' => [
                    ['id' => 'mock_page_1', 'name' => 'Mock Page 1', 'access_token' => 'mock_page_token_1', 'instagram_business_account' => ['id' => 'mock_ig_1']],
                    ['id' => 'mock_page_2', 'name' => 'Mock Page 2', 'access_token' => 'mock_page_token_2'],
                ],
                'paging' => ['cursors' => ['before' => 'xxx', 'after' => 'yyy']]
            ];
        }

        if (str_contains($endpoint, '/campaigns')) {
            return [
                'data' => [
                    [
                        'id' => 'mock_campaign_1', 
                        'name' => 'Mock Campaign 1', 
                        'status' => 'ACTIVE', 
                        'objective' => 'OUTCOME_LEADS',
                        'insights' => ['data' => [['impressions' => 1000, 'clicks' => 50, 'spend' => 100.00, 'actions' => [['action_type' => 'lead', 'value' => 5]]]]]
                    ]
                ],
                'paging' => ['cursors' => ['before' => 'xxx', 'after' => 'yyy']]
            ];
        }

        if (str_contains($endpoint, '/adsets')) {
            return [
                'data' => [
                    [
                        'id' => 'mock_adset_1',
                        'name' => 'Mock AdSet 1',
                        'status' => 'ACTIVE',
                        'campaign_id' => 'mock_campaign_1',
                        'daily_budget' => 5000, // 50.00
                        'insights' => ['data' => [['impressions' => 500, 'clicks' => 25, 'spend' => 25.00]]]
                    ]
                ],
                'paging' => ['cursors' => ['before' => 'xxx', 'after' => 'yyy']]
            ];
        }

        if (str_contains($endpoint, '/ads')) {
            return [
                'data' => [
                    [
                        'id' => 'mock_ad_1',
                        'name' => 'Mock Ad 1',
                        'status' => 'ACTIVE',
                        'adset_id' => 'mock_adset_1',
                        'campaign_id' => 'mock_campaign_1',
                        'creative' => ['title' => 'Mock Ad Creative'],
                        'insights' => ['data' => [['impressions' => 500, 'clicks' => 25, 'spend' => 25.00]]]
                    ]
                ],
                'paging' => ['cursors' => ['before' => 'xxx', 'after' => 'yyy']]
            ];
        }

        if (str_contains($endpoint, '/insights')) {
            return [
                'data' => [
                    [
                        'campaign_id' => 'mock_campaign_1',
                        'campaign_name' => 'Mock Campaign 1',
                        'spend' => 150.00,
                        'impressions' => 2000,
                        'clicks' => 100,
                        'ctr' => 5.0,
                        'cpc' => 1.50,
                        'cpm' => 75.00,
                        'reach' => 1800,
                        'date_start' => now()->subDays(1)->format('Y-m-d'),
                        'date_stop' => now()->subDays(1)->format('Y-m-d'),
                    ]
                ],
                'paging' => ['cursors' => ['before' => 'xxx', 'after' => 'yyy']]
            ];
        }
        
        // Single Lead details
        if (preg_match('/^\d+$/', $endpoint) || str_contains($endpoint, 'mock_lead_')) {
            // It's likely a lead ID
            return [
                'id' => $endpoint,
                'created_time' => now()->toIso8601String(),
                'ad_id' => 'mock_ad_1',
                'ad_name' => 'Mock Ad 1',
                'adset_id' => 'mock_adset_1',
                'adset_name' => 'Mock AdSet 1',
                'campaign_id' => 'mock_campaign_1',
                'campaign_name' => 'Mock Campaign 1',
                'form_id' => 'mock_form_1',
                'field_data' => [
                    ['name' => 'full_name', 'values' => ['Mock User']],
                    ['name' => 'email', 'values' => ['mock@example.com']],
                    ['name' => 'phone_number', 'values' => ['+1234567890']],
                ]
            ];
        }

        // OAuth Token Exchange
        if (str_contains($endpoint, 'oauth/access_token')) {
            return [
                'access_token' => 'mock_long_lived_token_' . uniqid(),
                'token_type' => 'bearer',
                'expires_in' => 5184000, // 60 days
            ];
        }

        // Default empty response
        return ['data' => []];
    }
}
