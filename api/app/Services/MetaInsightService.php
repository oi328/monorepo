<?php

namespace App\Services;

use App\Contracts\MetaApiClientInterface;
use App\Models\Campaign;
use App\Models\CampaignInsight;
use App\Models\MetaAdAccount;
use Illuminate\Support\Facades\Log;

class MetaInsightService
{
    protected $apiClient;

    public function __construct(MetaApiClientInterface $apiClient)
    {
        $this->apiClient = $apiClient;
    }

    public function syncInsights($tenantId, $days = 3)
    {
        $adAccounts = \App\Models\MetaAdAccount::with('business.connection')
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get();

        if ($adAccounts->isEmpty()) {
            return;
        }

        foreach ($adAccounts as $adAccount) {
            $accessToken = $adAccount->business?->connection?->user_access_token;
            
            if (!$accessToken) {
                 if (config('services.meta.mock_mode')) {
                     $accessToken = 'mock_access_token_insight_sync';
                 } else {
                     continue;
                 }
            }

            $this->syncAdAccountInsights($tenantId, $adAccount, $accessToken, $days);
        }
    }

    protected function syncAdAccountInsights($tenantId, $adAccount, $accessToken, $days)
    {
        $adAccountId = $adAccount->ad_account_id;
        $apiAdAccountId = MetaAdAccount::normalizeAdAccountId((string) $adAccountId);

        $endpoint = "/{$apiAdAccountId}/insights";
        
        $params = [
            'level' => 'campaign',
            'time_increment' => 1,
            'date_preset' => 'last_' . $days . 'd', // e.g. last_3d, last_7d
            'fields' => 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,cpm,reach,date_start,date_stop',
            'limit' => 500,
            'access_token' => $accessToken,
        ];

        do {
            try {
                $data = $this->apiClient->get($endpoint, $params);
            } catch (\Exception $e) {
                Log::error("Failed to fetch insights for ad account {$adAccountId} (Tenant {$tenantId}): " . $e->getMessage());
                break;
            }

            $insights = $data['data'] ?? [];

            foreach ($insights as $insight) {
                $this->storeInsight($tenantId, $insight);
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

    protected function storeInsight($tenantId, $data)
    {
        // Use manual lookup to handle date casting/timezone issues properly
        $insight = CampaignInsight::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->where('meta_campaign_id', $data['campaign_id'])
            ->whereDate('date', $data['date_start'])
            ->first();

        if (!$insight) {
            $insight = new CampaignInsight();
            $insight->tenant_id = $tenantId;
            $insight->meta_campaign_id = $data['campaign_id'];
            // Set time to noon to prevent date shift when converting to UTC
            $insight->date = $data['date_start'] . ' 12:00:00';
        }

        $insight->fill([
            'spend' => $data['spend'] ?? 0,
            'impressions' => $data['impressions'] ?? 0,
            'clicks' => $data['clicks'] ?? 0,
            'ctr' => $data['ctr'] ?? 0,
            'cpc' => $data['cpc'] ?? 0,
            'cpm' => $data['cpm'] ?? 0,
            'reach' => $data['reach'] ?? 0,
        ]);

        $insight->save();
    }
}
