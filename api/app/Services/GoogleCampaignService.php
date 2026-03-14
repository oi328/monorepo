<?php

namespace App\Services;

use App\Contracts\GoogleAdsServiceInterface;
use App\Models\GoogleAdsAccount;
use App\Models\Campaign;
use App\Models\AdSet; // AdGroup maps to AdSet
use App\Models\Ad;
use Illuminate\Support\Facades\Log;

class GoogleCampaignService
{
    protected $apiClient;

    public function __construct(GoogleAdsServiceInterface $apiClient)
    {
        $this->apiClient = $apiClient;
    }

    public function syncAll($tenantId)
    {
        try {
            $accounts = GoogleAdsAccount::where('tenant_id', $tenantId)->get();

            if ($accounts->isEmpty()) {
                Log::warning("Google Ads Sync: No accounts found for tenant {$tenantId}");
                return;
            }

            foreach ($accounts as $account) {
                // Dispatch job for each account to allow parallel processing and individual retries
                \App\Jobs\SyncGoogleAccount::dispatch($account);
            }

        } catch (\Exception $e) {
            Log::error("Google Ads Sync Failed for Tenant {$tenantId}: " . $e->getMessage());
        }
    }

    public function syncAccount(GoogleAdsAccount $account)
    {
        // Removed try-catch to allow job retry mechanism to work
        Log::info("Syncing Google Ads Account: {$account->id} (Tenant: {$account->tenant_id})");

        // 1. Sync Campaigns
        $campaignsData = $this->apiClient->getCampaigns($account->id);
        
        foreach ($campaignsData as $campData) {
            $this->processCampaign($account, $campData);
        }

        // 2. Sync Leads (if applicable)
        // Note: Real API might return empty, Mock API returns mock leads
        $leadsData = $this->apiClient->getLeads($account->id);
        if (!empty($leadsData)) {
            // Process leads (dispatch to webhook handler or store directly)
            // For now, we just log count as there is no standardized Lead Service in this context yet
            Log::info("Synced " . count($leadsData) . " leads for Account {$account->id}");
            // In a real implementation, we would call a LeadService here
        }
    }

    protected function processCampaign(GoogleAdsAccount $account, array $campData)
    {
        try {
            $metrics = $campData['metrics'];
            
            $spend = $metrics['cost_micros'] / 1000000;
            $revenue = $metrics['all_conversions_value'];

            $profit = $revenue - $spend;
            $roi = $spend > 0 ? round(($revenue - $spend) / $spend, 2) : 0;
            
            $campaign = Campaign::updateOrCreate(
                [
                    'tenant_id' => $account->tenant_id,
                    'google_id' => $campData['id']
                ],
                [
                    'name' => $campData['name'],
                    'status' => $campData['status'],
                    'source' => 'Google Ads',
                    'budget_type' => 'daily',
                    'impressions' => $metrics['impressions'],
                    'clicks' => $metrics['clicks'],
                    'spend' => $spend,
                    'revenue' => $revenue,
                    'profit' => $profit,
                    'roi' => $roi,
                    'leads' => (int) $metrics['conversions'],
                    'ad_account_id' => $account->id, // Store the account relationship
                    'provider' => 'google_ads',
                ]
            );

            // Sync AdGroups (if supported by interface, currently getCampaigns returns basic info)
            // If we need AdGroups, we should add getAdGroups to interface or fetch nested
            // For now, Mock/Real implementations in this iteration only returning campaigns list
            // If we need deeper sync, we would add $this->apiClient->getAdGroups($account->id, $campaign->google_id)
            
        } catch (\Exception $e) {
            Log::error("Failed to process campaign {$campData['id']}: " . $e->getMessage());
        }
    }

    public function uploadConversion($tenantId, array $data)
    {
        // Find the account.
        // Ideally data should contain account_id, but for now we pick the first connected one
        $account = GoogleAdsAccount::where('tenant_id', $tenantId)->first();
        
        if (!$account) {
            throw new \Exception("No Google Ads account connected for this tenant.");
        }

        return $this->apiClient->uploadConversion($account->id, $data);
    }
}
