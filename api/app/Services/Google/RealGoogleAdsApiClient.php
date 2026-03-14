<?php

namespace App\Services\Google;

use App\Contracts\GoogleAdsApiClientInterface;
use App\Services\GoogleAuthService;
use App\Models\GoogleIntegration;
use Google\Ads\GoogleAds\V20\Enums\CampaignStatusEnum\CampaignStatus;
use Google\Ads\GoogleAds\V20\Enums\AdGroupStatusEnum\AdGroupStatus;
use Google\Ads\GoogleAds\V20\Enums\AdGroupAdStatusEnum\AdGroupAdStatus;
use Google\Ads\GoogleAds\V20\Services\GoogleAdsRow;
use Google\Ads\GoogleAds\V20\Services\SearchGoogleAdsRequest;
use Google\Ads\GoogleAds\V20\Services\ClickConversion;
use Google\Ads\GoogleAds\V20\Services\UploadClickConversionsRequest;
use Google\ApiCore\ApiException;
use Illuminate\Support\Facades\Log;

class RealGoogleAdsApiClient implements GoogleAdsApiClientInterface
{
    protected $googleAuthService;

    public function __construct(GoogleAuthService $googleAuthService)
    {
        $this->googleAuthService = $googleAuthService;
    }

    protected function getClientAndIntegration($tenantId)
    {
        $integration = GoogleIntegration::where('tenant_id', $tenantId)->first();
        
        if (!$integration || !$integration->access_token) {
            throw new \Exception("Google Ads Sync: No integration found for tenant {$tenantId}");
        }

        // Ensure token is valid (updates DB)
        $this->googleAuthService->getValidAccessToken($integration);

        // Get the Google Ads Client
        $client = $this->googleAuthService->getGoogleAdsClient($tenantId);
        
        return [$client, $integration];
    }

    public function getCampaigns(string $tenantId)
    {
        list($googleAdsClient, $integration) = $this->getClientAndIntegration($tenantId);
        $customerId = str_replace('-', '', $integration->customer_id);

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
                    ]
                ];
            }
        } catch (ApiException $e) {
            Log::error("Google Ads Sync Campaigns Error: " . $e->getMessage());
            throw $e;
        }

        return $results;
    }

    public function getAdGroups(string $tenantId, string $campaignId)
    {
        list($googleAdsClient, $integration) = $this->getClientAndIntegration($tenantId);
        $customerId = str_replace('-', '', $integration->customer_id);

        $query = "SELECT ad_group.id, ad_group.name, ad_group.status FROM ad_group WHERE campaign.id = {$campaignId} AND ad_group.status != 'REMOVED'";

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
                $gAdGroup = $googleAdsRow->getAdGroup();
                
                $results[] = [
                    'id' => $gAdGroup->getId(),
                    'name' => $gAdGroup->getName(),
                    'status' => AdGroupStatus::name($gAdGroup->getStatus()),
                ];
            }
        } catch (ApiException $e) {
            Log::error("Google Ads Sync AdGroups Error: " . $e->getMessage());
            throw $e;
        }

        return $results;
    }

    public function getAds(string $tenantId, string $adGroupId)
    {
        list($googleAdsClient, $integration) = $this->getClientAndIntegration($tenantId);
        $customerId = str_replace('-', '', $integration->customer_id);

        $query = "SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status FROM ad_group_ad WHERE ad_group.id = {$adGroupId} AND ad_group_ad.status != 'REMOVED'";

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
                $gAdGroupAd = $googleAdsRow->getAdGroupAd();
                $gAd = $gAdGroupAd->getAd();
                
                $results[] = [
                    'id' => $gAd->getId(),
                    'name' => $gAd->getName() ?? 'Ad ' . $gAd->getId(),
                    'status' => AdGroupAdStatus::name($gAdGroupAd->getStatus()),
                ];
            }
        } catch (ApiException $e) {
            Log::error("Google Ads Sync Ads Error: " . $e->getMessage());
            throw $e;
        }

        return $results;
    }

    public function uploadClickConversions(string $tenantId, array $data)
    {
        list($googleAdsClient, $integration) = $this->getClientAndIntegration($tenantId);
        $customerId = str_replace('-', '', $integration->customer_id);
        
        $conversionTime = \Carbon\Carbon::parse($data['conversionTime'])->format('Y-m-d H:i:sP');

        $clickConversion = new ClickConversion([
            'conversion_action' => "customers/{$customerId}/conversionActions/{$data['conversionActionId']}",
            'conversion_date_time' => $conversionTime,
            'conversion_value' => (float) $data['conversionValue'],
            'currency_code' => $data['currencyCode'],
            'gclid' => $data['gclid'],
        ]);

        try {
            $conversionUploadServiceClient = $googleAdsClient->getConversionUploadServiceClient();
            
            $request = new UploadClickConversionsRequest([
                'customer_id' => $customerId,
                'conversions' => [$clickConversion],
                'partial_failure' => true,
            ]);

            $response = $conversionUploadServiceClient->uploadClickConversions($request);

            if ($response->getPartialFailureError()) {
                 Log::error("Google Ads Conversion Upload Partial Failure: " . $response->getPartialFailureError()->getMessage());
                 throw new \Exception("Partial Failure: " . $response->getPartialFailureError()->getMessage());
            }
            
            $results = [];
            foreach ($response->getResults() as $result) {
                $results[] = [
                    'conversionAction' => $result->getConversionAction(),
                    'gclid' => $result->getGclid(),
                ];
            }

            return ['results' => $results];

        } catch (ApiException $e) {
            Log::error("Google Ads Conversion Upload Error: " . $e->getMessage());
            throw $e;
        }
    }
}
