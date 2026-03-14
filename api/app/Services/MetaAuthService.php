<?php

namespace App\Services;

use App\Contracts\MetaApiClientInterface;
use App\Models\Integration;
use App\Models\MetaConnection;
use App\Models\MetaBusiness;
use App\Models\MetaAdAccount;
use App\Models\MetaPage;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class MetaAuthService
{
    protected $clientId;
    protected $clientSecret;
    protected $redirectUri;
    protected $apiVersion = 'v19.0';
    protected $apiClient;

    public function __construct(MetaApiClientInterface $apiClient)
    {
        $this->apiClient = $apiClient;

        $this->clientId = \App\Models\SystemSetting::where('key', 'meta_app_id')->value('value') 
            ?? config('services.facebook.client_id');
        $this->clientSecret = \App\Models\SystemSetting::where('key', 'meta_app_secret')->value('value') 
            ?? config('services.facebook.client_secret');
        $this->redirectUri = config('services.facebook.redirect');

        // Update config for Socialite
        config(['services.facebook.client_id' => $this->clientId]);
        config(['services.facebook.client_secret' => $this->clientSecret]);
    }

    public function getRedirectUrl()
    {
        // Mock Mode Check for Redirect URL
        if (config('services.meta.mock_mode')) {
            // Return a mock redirect URL that front-end can handle or just loop back
            return route('meta.callback', ['code' => 'mock_code_' . uniqid()]);
        }

        /** @var \Laravel\Socialite\Two\FacebookProvider $driver */
        $driver = Socialite::driver('facebook');

        return $driver
            ->stateless()
            ->scopes(['ads_management', 'leads_retrieval', 'pages_read_engagement', 'pages_manage_ads', 'pages_show_list', 'business_management'])
            ->redirect()
            ->getTargetUrl();
    }

    public function handleSocialUser($tenantId, $socialUser)
    {
        try {
            // Exchange short-lived token for long-lived token
            // In Mock Mode, socialUser might be a mock object or array
            $token = is_object($socialUser) ? $socialUser->token : ($socialUser['token'] ?? 'mock_token');
            $userId = is_object($socialUser) ? $socialUser->id : ($socialUser['id'] ?? 'mock_user_id');
            $userName = is_object($socialUser) ? $socialUser->name : ($socialUser['name'] ?? 'Mock User');
            $userEmail = is_object($socialUser) ? $socialUser->email : ($socialUser['email'] ?? 'mock@example.com');

            $longLivedTokenData = $this->exchangeForLongLivedToken($token);
            $longLivedToken = $longLivedTokenData['access_token'] ?? $token;
            $expiresIn = $longLivedTokenData['expires_in'] ?? null;
            $expiresAt = $expiresIn ? now()->addSeconds($expiresIn) : null;

            // 1. Create/Update Integration (Generic)
            $integration = Integration::firstOrCreate(
                ['tenant_id' => $tenantId, 'provider' => 'meta'],
                ['status' => 'active', 'settings' => []]
            );

            // 2. Store Meta Connection (OAuth User)
            $connection = MetaConnection::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'fb_user_id' => $userId,
                ],
                [
                    'user_access_token' => $longLivedToken,
                    'expires_at' => $expiresAt,
                    'name' => $userName,
                    'email' => $userEmail,
                ]
            );

            // 3. Fetch and Store Assets
            $this->syncAssets($connection);

            return $connection;

        } catch (\Exception $e) {
            Log::error("Meta Auth Error: " . $e->getMessage());
            throw $e;
        }
    }

    public function syncAssets(MetaConnection $connection)
    {
        $accessToken = $connection->user_access_token;
        $tenantId = $connection->tenant_id;

        // A. Fetch Businesses
        try {
            $businesses = $this->fetchGraphApi('/me/businesses', $accessToken);
        } catch (\Exception $e) {
             Log::error("Failed to fetch businesses: " . $e->getMessage());
             $businesses = [];
        }
        
        foreach ($businesses as $bizData) {
            $business = MetaBusiness::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'fb_business_id' => $bizData['id'],
                ],
                [
                    'connection_id' => $connection->id,
                    'business_name' => $bizData['name'],
                ]
            );

            // B. Fetch Ad Accounts for this Business
            try {
                $adAccounts = $this->fetchGraphApi("/{$business->fb_business_id}/owned_ad_accounts", $accessToken, ['fields' => 'account_id,name,currency,timezone']);
            } catch (\Exception $e) {
                Log::error("Failed to fetch ad accounts for business {$business->fb_business_id}: " . $e->getMessage());
                $adAccounts = [];
            }
            
            foreach ($adAccounts as $adData) {
                MetaAdAccount::updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'ad_account_id' => $adData['id'], // e.g., act_123456
                    ],
                    [
                        'business_id' => $business->id,
                        'name' => $adData['name'] ?? 'Unnamed Ad Account',
                        'currency' => $adData['currency'] ?? 'USD',
                        'timezone' => $adData['timezone'] ?? 'UTC',
                        'is_active' => true,
                    ]
                );
            }
        }

        // C. Fetch Pages (User's accounts)
        try {
            $pages = $this->fetchGraphApi('/me/accounts', $accessToken, ['fields' => 'id,name,access_token,instagram_business_account']);
        } catch (\Exception $e) {
             Log::error("Failed to fetch pages: " . $e->getMessage());
             $pages = [];
        }

        foreach ($pages as $pageData) {
            MetaPage::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'page_id' => $pageData['id'],
                ],
                [
                    'connection_id' => $connection->id,
                    'page_name' => $pageData['name'],
                    'page_token' => $pageData['access_token'], // Long-lived page token
                    'instagram_business_account_id' => $pageData['instagram_business_account']['id'] ?? null,
                    'is_active' => true,
                ]
            );
        }
    }

    protected function fetchGraphApi($endpoint, $token, $params = [])
    {
        $allData = [];
        $params['access_token'] = $token;
        $params['limit'] = 100;

        do {
            $data = $this->apiClient->get($endpoint, $params);

            if (isset($data['data'])) {
                $allData = array_merge($allData, $data['data']);
            }

            // Pagination
            $nextUrl = $data['paging']['next'] ?? null;
            if ($nextUrl) {
                $endpoint = $nextUrl;
                $params = [];
            } else {
                $endpoint = null;
            }

        } while ($endpoint);

        return $allData;
    }


    public function handleCallback($tenantId)
    {
        if (config('services.meta.mock_mode')) {
             $mockUser = (object) [
                'id' => 'mock_user_' . uniqid(),
                'name' => 'Mock User',
                'email' => 'mock@example.com',
                'token' => 'mock_access_token_' . uniqid(),
             ];
             return $this->handleSocialUser($tenantId, $mockUser);
        }

        /** @var \Laravel\Socialite\Two\AbstractProvider $driver */
        $driver = Socialite::driver('facebook');
        $user = $driver->stateless()->user();
        return $this->handleSocialUser($tenantId, $user);
    }

    public function refreshAllTokens($tenantId)
    {
        $connections = MetaConnection::where('tenant_id', $tenantId)->get();
        
        foreach ($connections as $connection) {
            $this->refreshToken($connection);
        }
        
        return true;
    }

    public function refreshToken(MetaConnection $connection)
    {
        try {
            // Refresh logic: Exchange current long-lived token for a new one
            $newTokenData = $this->exchangeForLongLivedToken($connection->user_access_token);
            
            if (empty($newTokenData) || !isset($newTokenData['access_token'])) {
                Log::warning("Failed to refresh token for connection {$connection->id}");
                return false;
            }

            $longLivedToken = $newTokenData['access_token'];
            $expiresIn = $newTokenData['expires_in'] ?? null; // seconds
            $expiresAt = $expiresIn ? now()->addSeconds($expiresIn) : null;

            $connection->update([
                'user_access_token' => $longLivedToken,
                'expires_at' => $expiresAt,
            ]);

            Log::info("Refreshed Meta token for connection {$connection->id}");
            return true;

        } catch (\Exception $e) {
            Log::error("Error refreshing token for connection {$connection->id}: " . $e->getMessage());
            return false;
        }
    }

    public function exchangeForLongLivedToken($shortLivedToken)
    {
        // Use apiClient instead of direct Http call to support mock mode
        try {
            return $this->apiClient->get('/oauth/access_token', [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'fb_exchange_token' => $shortLivedToken,
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to exchange token: " . $e->getMessage());
            return [];
        }
    }

    public function getAccessToken($tenantId)
    {
        // Get the first available valid connection for this tenant
        $connection = MetaConnection::where('tenant_id', $tenantId)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->first();

        if ($connection) {
            return $connection->user_access_token;
        }

        // If no valid token, try to find an expired one and refresh it
        $connection = MetaConnection::where('tenant_id', $tenantId)->first();
        
        if ($connection) {
            if ($this->refreshToken($connection)) {
                return $connection->fresh()->user_access_token;
            }
        }

        return null;
    }
}
