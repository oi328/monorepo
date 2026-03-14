<?php

namespace App\Services\Google;

use Illuminate\Support\Str;
use Faker\Factory as Faker;
use Illuminate\Support\Facades\Log;

class GoogleAdsMockService
{
    protected $faker;

    public function __construct()
    {
        $this->faker = Faker::create();
    }

    public function generateCampaigns($count = 5)
    {
        $campaigns = [];
        for ($i = 0; $i < $count; $i++) {
            $campaigns[] = [
                'id' => (string) $this->faker->numberBetween(1000000000, 9999999999),
                'name' => 'Mock Campaign ' . $this->faker->words(3, true),
                'status' => 'ENABLED',
                'advertising_channel_type' => 'SEARCH',
                'metrics' => [
                    'impressions' => $this->faker->numberBetween(100, 10000),
                    'clicks' => $this->faker->numberBetween(10, 500),
                    'cost_micros' => $this->faker->numberBetween(1000000, 50000000),
                    'conversions' => $this->faker->numberBetween(0, 50),
                    'all_conversions_value' => $this->faker->randomFloat(2, 0, 1000),
                ]
            ];
        }
        return $campaigns;
    }

    public function generateAdGroups($campaignId, $count = 3)
    {
        $adGroups = [];
        for ($i = 0; $i < $count; $i++) {
            $adGroups[] = [
                'id' => (string) $this->faker->numberBetween(1000000000, 9999999999),
                'name' => 'Mock AdGroup ' . $this->faker->words(2, true),
                'status' => 'ENABLED',
            ];
        }
        return $adGroups;
    }

    public function generateAds($adGroupId, $count = 2)
    {
        $ads = [];
        for ($i = 0; $i < $count; $i++) {
            $ads[] = [
                'id' => (string) $this->faker->numberBetween(1000000000, 9999999999),
                'name' => 'Mock Ad ' . $this->faker->words(2, true),
                'status' => 'ENABLED',
            ];
        }
        return $ads;
    }

    public function generateLeadPayload($googleKey)
    {
        return [
            'google_key' => $googleKey,
            'lead_id' => $this->faker->uuid,
            'form_id' => (string) $this->faker->numberBetween(100000, 999999),
            'campaign_id' => (string) $this->faker->numberBetween(1000000000, 9999999999),
            'adgroup_id' => (string) $this->faker->numberBetween(1000000000, 9999999999),
            'creative_id' => (string) $this->faker->numberBetween(1000000000, 9999999999),
            'gcl_id' => $this->faker->uuid,
            'user_column_data' => [
                [
                    'column_id' => 'FULL_NAME',
                    'string_value' => $this->faker->name,
                    'column_name' => 'Full Name'
                ],
                [
                    'column_id' => 'PHONE_NUMBER',
                    'string_value' => $this->faker->phoneNumber,
                    'column_name' => 'Phone Number'
                ],
                [
                    'column_id' => 'EMAIL',
                    'string_value' => $this->faker->email,
                    'column_name' => 'Email'
                ],
                [
                    'column_id' => 'COMPANY_NAME',
                    'string_value' => $this->faker->company,
                    'column_name' => 'Company Name'
                ]
            ]
        ];
    }
}
