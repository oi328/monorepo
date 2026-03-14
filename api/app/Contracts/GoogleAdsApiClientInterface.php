<?php

namespace App\Contracts;

interface GoogleAdsApiClientInterface
{
    /**
     * Get campaigns with metrics for a tenant.
     *
     * @param string $tenantId
     * @return array Array of campaign data with metrics
     */
    public function getCampaigns(string $tenantId);

    /**
     * Get ad groups for a campaign.
     *
     * @param string $tenantId
     * @param string $campaignId Google Campaign ID
     * @return array Array of ad group data
     */
    public function getAdGroups(string $tenantId, string $campaignId);

    /**
     * Get ads for an ad group.
     *
     * @param string $tenantId
     * @param string $adGroupId Google AdGroup ID
     * @return array Array of ad data
     */
    public function getAds(string $tenantId, string $adGroupId);

    /**
     * Upload click conversions.
     * 
     * @param string $tenantId
     * @param array $data
     * @return array
     */
    public function uploadClickConversions(string $tenantId, array $data);
}
