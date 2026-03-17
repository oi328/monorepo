<?php

namespace App\Services;

use App\Contracts\MetaApiClientInterface;
use App\Models\Campaign;
use App\Models\AdSet;
use App\Models\Ad;
use App\Models\MetaAdAccount;
use Illuminate\Support\Facades\Log;

class MetaCampaignService
{
    protected $apiClient;

    public function __construct(MetaApiClientInterface $apiClient)
    {
        $this->apiClient = $apiClient;
    }

    public function syncAll($tenantId)
    {
        // Get all active ad accounts for this tenant
        $adAccounts = MetaAdAccount::with(['business.connection'])
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get();

        if ($adAccounts->isEmpty()) {
            Log::info("No active Meta ad accounts found for tenant: {$tenantId}");
            return;
        }

        foreach ($adAccounts as $adAccount) {
            $this->syncAccount($tenantId, $adAccount);
        }
    }

    protected function getAccessToken(MetaAdAccount $adAccount)
    {
        if ($adAccount->access_token) {
            return $adAccount->access_token;
        }
        
        $token = $adAccount->business?->connection?->user_access_token;
        
        if (!$token && config('services.meta.mock_mode')) {
            return 'mock_access_token_campaign_sync';
        }
        
        return $token;
    }

    public function syncAccount($tenantId, MetaAdAccount $adAccount)
    {
        $accessToken = $this->getAccessToken($adAccount);
        
        if (!$accessToken) {
            Log::warning("No access token found for ad account {$adAccount->ad_account_id} (Tenant: {$tenantId})");
            return;
        }

        $this->syncCampaigns($tenantId, $adAccount, $accessToken);
        $this->syncAdSets($tenantId, $adAccount, $accessToken);
        $this->syncAds($tenantId, $adAccount, $accessToken);
    }

    public function syncCampaigns($tenantId, MetaAdAccount $adAccount, $accessToken)
    {
        $adAccountId = $adAccount->ad_account_id;
        $apiAdAccountId = MetaAdAccount::normalizeAdAccountId((string) $adAccountId);

        $endpoint = "/{$apiAdAccountId}/campaigns";
        
        $params = [
            'fields' => 'id,name,status,objective,budget_remaining,daily_budget,lifetime_budget,created_time,updated_time,insights.date_preset(lifetime){impressions,clicks,spend,reach,actions,action_values}',
            'limit' => 100,
            'access_token' => $accessToken,
        ];

        do {
            try {
                $data = $this->apiClient->get($endpoint, $params);
            } catch (\Exception $e) {
                Log::error("Failed to fetch campaigns for ad account {$adAccountId} (Tenant {$tenantId}): " . $e->getMessage());
                break;
            }

            $campaigns = $data['data'] ?? [];

            foreach ($campaigns as $campaignData) {
                $this->processCampaign($tenantId, $campaignData, $adAccountId);
            }

            // Pagination
            $nextUrl = $data['paging']['next'] ?? null;
            if ($nextUrl) {
                // Parse next URL to extract endpoint and params
                // But wait, our apiClient expects endpoint and params separately.
                // The next URL is a full URL.
                // We can parse it or just support full URL in apiClient (which we did).
                $endpoint = $nextUrl;
                $params = []; 
            } else {
                $endpoint = null;
            }

        } while ($endpoint);
    }

    protected function processCampaign($tenantId, $data, $adAccountId)
    {
        $insights = $data['insights']['data'][0] ?? [];
        
        $dailyBudget = isset($data['daily_budget']) ? $data['daily_budget'] / 100 : null; // Meta returns in cents
        $lifetimeBudget = isset($data['lifetime_budget']) ? $data['lifetime_budget'] / 100 : null;

        // Calculate leads from actions
        $leads = 0;
        if (isset($insights['actions'])) {
            foreach ($insights['actions'] as $action) {
                if ($action['action_type'] === 'lead' || $action['action_type'] === 'onsite_conversion.lead_grouped') {
                    $leads += $action['value'];
                }
            }
        }

        // Calculate revenue from purchase value if available
        $revenue = 0;
        if (isset($insights['action_values'])) {
             foreach ($insights['action_values'] as $action) {
                 if ($action['action_type'] === 'purchase' || $action['action_type'] === 'onsite_conversion.purchase') {
                     $revenue += $action['value'];
                 }
             }
        }

        $spend = $insights['spend'] ?? 0;
        $profit = $revenue - $spend;
        $roi = $spend > 0 ? round(($revenue - $spend) / $spend, 2) : 0;

        Campaign::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'meta_id' => $data['id'],
            ],
            [
                'name' => $data['name'],
                'status' => $data['status'], // ACTIVE, PAUSED, ARCHIVED
                'objective' => $data['objective'] ?? null,
                'daily_budget' => $dailyBudget,
                'lifetime_budget' => $lifetimeBudget,
                'provider' => 'meta',
                'ad_account_id' => $adAccountId,
                'start_date' => $data['created_time'] ?? now(), // Approximate
                'end_date' => null, // Meta doesn't always return end_date easily here without more fields
                'impressions' => $insights['impressions'] ?? 0,
                'clicks' => $insights['clicks'] ?? 0,
                'spend' => $spend,
                'revenue' => $revenue,
                'leads' => $leads,
                'profit' => $profit,
                'roi' => $roi,
                'meta_data' => ['raw' => $data],
            ]
        );
    }

    public function syncAdSets($tenantId, MetaAdAccount $adAccount, $accessToken)
    {
        $adAccountId = $adAccount->ad_account_id;
        $apiAdAccountId = MetaAdAccount::normalizeAdAccountId((string) $adAccountId);

        $endpoint = "/{$apiAdAccountId}/adsets";
        
        $params = [
            'fields' => 'id,name,status,campaign_id,billing_event,optimization_goal,daily_budget,lifetime_budget,start_time,end_time,insights.date_preset(lifetime){impressions,clicks,spend}',
            'limit' => 100,
            'access_token' => $accessToken,
        ];

        do {
            try {
                $data = $this->apiClient->get($endpoint, $params);
            } catch (\Exception $e) {
                Log::error("Failed to fetch adsets for ad account {$adAccountId} (Tenant {$tenantId}): " . $e->getMessage());
                break;
            }

            $adSets = $data['data'] ?? [];

            foreach ($adSets as $adSetData) {
                $this->processAdSet($tenantId, $adSetData, $adAccountId);
            }

            $nextUrl = $data['paging']['next'] ?? null;
            if ($nextUrl) {
                $endpoint = $nextUrl;
                $params = [];
            } else {
                $endpoint = null;
            }

        } while ($endpoint);
    }

    protected function processAdSet($tenantId, $data, $adAccountId)
    {
        $insights = $data['insights']['data'][0] ?? [];
        
        $dailyBudget = isset($data['daily_budget']) ? $data['daily_budget'] / 100 : null;
        $lifetimeBudget = isset($data['lifetime_budget']) ? $data['lifetime_budget'] / 100 : null;
        $spend = isset($insights['spend']) ? $insights['spend'] : 0;

        // Find parent campaign
        $campaign = Campaign::where('meta_id', $data['campaign_id'])
            ->where('tenant_id', $tenantId)
            ->first();

        AdSet::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'meta_id' => $data['id'],
            ],
            [
                'name' => $data['name'],
                'status' => $data['status'],
                'campaign_id' => $campaign?->id,
                'billing_event' => $data['billing_event'] ?? null,
                'optimization_goal' => $data['optimization_goal'] ?? null,
                'daily_budget' => $dailyBudget,
                'lifetime_budget' => $lifetimeBudget,
                'start_time' => isset($data['start_time']) ? \Carbon\Carbon::parse($data['start_time']) : null,
                'end_time' => isset($data['end_time']) ? \Carbon\Carbon::parse($data['end_time']) : null,
                'impressions' => $insights['impressions'] ?? 0,
                'clicks' => $insights['clicks'] ?? 0,
                'spend' => $spend,
                'meta_data' => ['raw' => $data],
            ]
        );
    }

    public function syncAds($tenantId, MetaAdAccount $adAccount, $accessToken)
    {
        $adAccountId = $adAccount->ad_account_id;
        $apiAdAccountId = MetaAdAccount::normalizeAdAccountId((string) $adAccountId);

        $endpoint = "/{$apiAdAccountId}/ads";
        
        $params = [
            'fields' => 'id,name,status,adset_id,campaign_id,creative{thumbnail_url,image_url,title,body},insights.date_preset(lifetime){impressions,clicks,spend}',
            'limit' => 100,
            'access_token' => $accessToken,
        ];

        do {
            try {
                $data = $this->apiClient->get($endpoint, $params);
            } catch (\Exception $e) {
                Log::error("Failed to fetch ads for ad account {$adAccountId} (Tenant {$tenantId}): " . $e->getMessage());
                break;
            }

            $ads = $data['data'] ?? [];

            foreach ($ads as $adData) {
                $this->processAd($tenantId, $adData, $adAccountId);
            }

            $nextUrl = $data['paging']['next'] ?? null;
            if ($nextUrl) {
                $endpoint = $nextUrl;
                $params = [];
            } else {
                $endpoint = null;
            }

        } while ($endpoint);
    }

    protected function processAd($tenantId, $data, $adAccountId)
    {
        $insights = $data['insights']['data'][0] ?? [];
        $spend = isset($insights['spend']) ? $insights['spend'] : 0;

        // Find parents
        $campaign = Campaign::where('meta_id', $data['campaign_id'])
            ->where('tenant_id', $tenantId)
            ->first();
            
        $adSet = AdSet::where('meta_id', $data['adset_id'])
            ->where('tenant_id', $tenantId)
            ->first();

        Ad::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'meta_id' => $data['id'],
            ],
            [
                'name' => $data['name'],
                'status' => $data['status'],
                'campaign_id' => $campaign?->id,
                'ad_set_id' => $adSet?->id,
                'creative' => $data['creative'] ?? null,
                'impressions' => $insights['impressions'] ?? 0,
                'clicks' => $insights['clicks'] ?? 0,
                'spend' => $spend,
                'meta_data' => ['raw' => $data],
            ]
        );
    }
}
