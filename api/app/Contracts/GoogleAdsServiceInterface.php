<?php

namespace App\Contracts;

interface GoogleAdsServiceInterface
{
    /**
     * Get campaigns for a specific Google Ads account.
     *
     * @param string $accountId The Google Ads Customer ID (or DB ID, depending on implementation)
     * @return array
     */
    public function getCampaigns(string $accountId);

    /**
     * Get leads for a specific Google Ads account.
     *
     * @param string $accountId The Google Ads Customer ID (or DB ID, depending on implementation)
     * @return array
     */
    public function getLeads(string $accountId);

    /**
     * Upload offline conversion to Google Ads.
     *
     * @param string $accountId
     * @param array $conversionData
     * @return array
     */
    public function uploadConversion(string $accountId, array $conversionData);
}
