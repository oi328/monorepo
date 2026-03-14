<?php

namespace App\Services\Google;

use App\Contracts\GoogleAdsServiceInterface;
use App\Models\GoogleAdsAccount;
use App\Services\GoogleAuthService;
use Google\Ads\GoogleAds\V20\Enums\CampaignStatusEnum\CampaignStatus;
use Google\Ads\GoogleAds\V20\Services\GoogleAdsRow;
use Google\Ads\GoogleAds\V20\Services\SearchGoogleAdsRequest;
use Google\ApiCore\ApiException;
use Illuminate\Support\Facades\Log;

class RealGoogleAdsService implements GoogleAdsServiceInterface
{
    protected $googleAuthService;

    public function __construct(GoogleAuthService $googleAuthService)
    {
        $this->googleAuthService = $googleAuthService;
    }

    protected function getClient(string $accountId)
    {
        // Assuming accountId is the database ID
        $account = GoogleAdsAccount::find($accountId);
        
        if (!$account) {
            // Try to find by Google Ads Customer ID
            $account = GoogleAdsAccount::where('google_ads_id', $accountId)->first();
        }

        if (!$account) {
            throw new \Exception("Google Ads Account not found: {$accountId}");
        }

        // Ensure token is valid (updates DB)
        $this->googleAuthService->getValidAccessTokenForAccount($account);

        return [$this->googleAuthService->getGoogleAdsClientForAccount($account), $account];
    }

    public function getCampaigns(string $accountId)
    {
        list($googleAdsClient, $account) = $this->getClient($accountId);
        $customerId = str_replace('-', '', $account->google_ads_id);

        $query = "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.all_conversions_value FROM campaign WHERE campaign.status != 'REMOVED'";

        $results = [];
        try {
            $googleAdsServiceClient = $googleAdsClient->getGoogleAdsServiceClient();
            
            $request = new SearchGoogleAdsRequest([
                'customer_id' => $customerId,
                'query' => $query
            ]);

            $stream = $googleAdsServiceClient->search($request);

            foreach ($stream->iterateAllElements() as $googleAdsRow) {
                /** @var GoogleAdsRow $googleAdsRow */
                $gCampaign = $googleAdsRow->getCampaign();
                $metrics = $googleAdsRow->getMetrics();
                
                $results[] = [
                    'id' => $gCampaign->getId(),
                    'name' => $gCampaign->getName(),
                    'status' => CampaignStatus::name($gCampaign->getStatus()),
                    'advertising_channel_type' => $gCampaign->getAdvertisingChannelType(),
                    'metrics' => [
                        'impressions' => $metrics->getImpressions(),
                        'clicks' => $metrics->getClicks(),
                        'cost_micros' => $metrics->getCostMicros(),
                        'conversions' => $metrics->getConversions(),
                        'all_conversions_value' => $metrics->getAllConversionsValue(),
                    ],
                    'account_id' => $account->id,
                    'tenant_id' => $account->tenant_id,
                ];
            }
        } catch (ApiException $e) {
            Log::error("Google Ads Sync Campaigns Error: " . $e->getMessage());
            throw $e;
        }

        return $results;
    }

    public function getLeads(string $accountId)
    {
        // Real implementation usually relies on Webhooks.
        // Returning empty for now as requested for the interface.
        return [];
    }

    public function uploadConversion(string $accountId, array $conversionData)
    {
        list($googleAdsClient, $account) = $this->getClient($accountId);
        $customerId = str_replace('-', '', $account->google_ads_id);

        Log::info("Uploading conversion to Google Ads Account: {$customerId}", $conversionData);

        // TODO: Implement actual API call using ConversionUploadServiceClient
        // This requires constructing ClickConversion objects and handling the response.
        // For now, we stub it to prevent errors.
        
        return [
            'partialFailureError' => null,
            'results' => []
        ];
    }
}
