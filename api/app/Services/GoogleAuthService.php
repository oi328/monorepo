<?php

namespace App\Services;

use App\Models\GoogleIntegration;
use App\Models\GoogleAdsAccount;
use App\Models\GoogleConnectedAccount;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;
use Google\Ads\GoogleAds\Lib\V20\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\Lib\OAuth2TokenBuilder;
use Google\Ads\GoogleAds\V20\Services\SearchGoogleAdsRequest;
use Google\Ads\GoogleAds\V20\Services\ListAccessibleCustomersRequest;

class GoogleAuthService
{
    protected $clientId;
    protected $clientSecret;
    protected $developerToken;
    protected $redirectUri;

    public function __construct()
    {
        $this->clientId = SystemSetting::where('key', 'google_client_id')->value('value')
            ?? config('services.google.client_id');
        $this->clientSecret = SystemSetting::where('key', 'google_client_secret')->value('value')
            ?? config('services.google.client_secret');
        $this->developerToken = SystemSetting::where('key', 'google_developer_token')->value('value');
        $this->redirectUri = config('services.google.redirect');

        // Dynamically configure Socialite
        config([
            'services.google.client_id' => $this->clientId,
            'services.google.client_secret' => $this->clientSecret,
            'services.google.redirect' => $this->redirectUri,
        ]);
    }

    /**
     * Get the redirect URL for Google OAuth
     */
    public function getRedirectUrl($tenantId = null, $source = null)
    {
        $stateData = [
            'tenant_id' => $tenantId,
            'source' => $source,
            'timestamp' => now()->timestamp
        ];

        $state = base64_encode(json_encode($stateData));

        $query = http_build_query([
            'client_id' => $this->clientId,
            'redirect_uri' => $this->redirectUri,
            'response_type' => 'code',
            'scope' => implode(' ', [
                'https://www.googleapis.com/auth/adwords',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/userinfo.email'
            ]),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'include_granted_scopes' => 'true',
            'state' => $state,
        ]);

        return "https://accounts.google.com/o/oauth2/v2/auth?" . $query;
    }

    /**
     * Handle the OAuth callback
     */
    public function handleCallback($tenantId = null)
    {
        try {
            /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
            $driver = Socialite::driver('google');

            /** @var \Laravel\Socialite\Two\User $user */
            $user = $driver->stateless()->user();

            // Retrieve tenant ID from state if not provided
            if (!$tenantId) {
                $state = request()->input('state');
                if ($state) {
                    // Try to decode JSON state
                    $decoded = json_decode(base64_decode($state), true);
                    if (is_array($decoded) && isset($decoded['tenant_id'])) {
                        $tenantId = $decoded['tenant_id'];
                    } else {
                        // Fallback for legacy state (plain tenantId)
                        $tenantId = $state;
                    }
                }
            }

            if (!$tenantId) {
                throw new \Exception("Tenant ID not found in callback state.");
            }
            
            // Check for existing integration to preserve webhook_key and customer_id
            $existing = GoogleIntegration::where('tenant_id', $tenantId)->first();
            
            $data = [
                'google_id' => $user->getId(),
                'google_email' => $user->getEmail(),
                'access_token' => $user->token,
                'expires_at' => now()->addSeconds($user->expiresIn),
                'status' => true,
            ];

            // Only update refresh token if we got a new one (it's not always returned)
            if ($user->refreshToken) {
                $data['refresh_token'] = $user->refreshToken;
            }

            // Generate webhook key if not exists
            if (!$existing || !$existing->webhook_key) {
                $data['webhook_key'] = (string) Str::uuid();
            }

            $integration = GoogleIntegration::updateOrCreate(
                ['tenant_id' => $tenantId],
                $data
            );

            $connected = GoogleConnectedAccount::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'google_user_id' => (string) $user->getId(),
                ],
                [
                    'google_email' => $user->getEmail(),
                    'google_name' => $user->getName() ?? $user->getEmail(),
                    'access_token' => $user->token,
                    'refresh_token' => $user->refreshToken ?? $integration->refresh_token,
                    'expires_at' => now()->addSeconds($user->expiresIn),
                    'connection_status' => 'connected',
                    'is_primary' => true,
                ]
            );

            try {
                $this->discoverAndUpsertCustomerAccounts($tenantId, $connected);
            } catch (\Throwable $e) {
                Log::warning('Google Ads account discovery failed: ' . $e->getMessage());
            }
            
            return $integration;

        } catch (\Exception $e) {
            Log::error("Google Auth Callback Error: " . $e->getMessage());
            throw $e;
        }
    }

    private function discoverAndUpsertCustomerAccounts(int|string $tenantId, GoogleConnectedAccount $connected): void
    {
        $client = $this->getGoogleAdsClient($tenantId);
        $customerService = $client->getCustomerServiceClient();
        $resourceNames = $customerService
            ->listAccessibleCustomers(new ListAccessibleCustomersRequest())
            ->getResourceNames();

        $customerIds = [];
        foreach ($resourceNames as $rn) {
            $id = str_replace('customers/', '', (string) $rn);
            $id = preg_replace('/\D+/', '', $id);
            if ($id) {
                $customerIds[] = $id;
            }
        }

        $customerIds = array_values(array_unique($customerIds));

        $primaryAssigned = false;
        foreach ($customerIds as $customerIdDigits) {
            $customerId = $this->formatCustomerId($customerIdDigits);

            $details = $this->tryFetchCustomerDetails($client, $customerIdDigits);

            $account = GoogleAdsAccount::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'google_ads_id' => $customerId,
                ],
                [
                    'connected_account_id' => $connected->id,
                    'account_name' => $details['account_name'] ?? ('Google Ads ' . $customerId),
                    'email' => $connected->google_email,
                    'access_token' => $connected->access_token,
                    'refresh_token' => $connected->refresh_token,
                    'expires_at' => $connected->expires_at,
                    'is_mock' => false,
                    'is_active' => true,
                    'is_primary' => false,
                    'connection_status' => 'connected',
                    'currency_code' => $details['currency_code'] ?? null,
                    'timezone' => $details['timezone'] ?? null,
                    'is_manager' => $details['is_manager'] ?? false,
                    'webhook_key' => null,
                ]
            );

            if (!$account->webhook_key) {
                $account->webhook_key = (string) Str::uuid();
                $account->save();
            }

            if (!$primaryAssigned && !$account->is_primary) {
                $account->is_primary = true;
                $account->save();
                $primaryAssigned = true;
            }
        }
    }

    private function formatCustomerId(string $digits): string
    {
        $d = preg_replace('/\D+/', '', $digits) ?? '';
        if (strlen($d) === 10) {
            return substr($d, 0, 3) . '-' . substr($d, 3, 3) . '-' . substr($d, 6);
        }
        return $d;
    }

    private function tryFetchCustomerDetails($client, string $customerIdDigits): array
    {
        try {
            $googleAdsServiceClient = $client->getGoogleAdsServiceClient();
            $query = 'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager FROM customer LIMIT 1';
            $request = new SearchGoogleAdsRequest([
                'customer_id' => $customerIdDigits,
                'query' => $query,
            ]);
            $stream = $googleAdsServiceClient->search($request);

            foreach ($stream->iterateAllElements() as $row) {
                $c = $row->getCustomer();
                return [
                    'account_name' => $c->getDescriptiveName() ?: null,
                    'currency_code' => $c->getCurrencyCode() ?: null,
                    'timezone' => $c->getTimeZone() ?: null,
                    'is_manager' => (bool) $c->getManager(),
                ];
            }
        } catch (\Throwable $e) {
            return [];
        }

        return [];
    }

    /**
     * Disconnect the integration
     */
    public function disconnect($tenantId)
    {
        $integration = GoogleIntegration::where('tenant_id', $tenantId)->first();
        if ($integration) {
            // Optional: Revoke token from Google
            if ($integration->access_token) {
                // $this->revokeToken($integration->access_token);
            }
            $integration->delete();
            return true;
        }
        return false;
    }

    /**
     * Get a configured Google Ads Client for a specific GoogleIntegration (Legacy)
     */
    public function getGoogleAdsClient($tenantId)
    {
        $integration = GoogleIntegration::where('tenant_id', $tenantId)->first();
        
        if (!$integration || !$integration->refresh_token) {
            throw new \Exception("Google Ads Integration not found or missing refresh token for tenant {$tenantId}");
        }

        if (!$this->developerToken) {
            throw new \Exception("Google Developer Token is not configured in System Settings.");
        }

        $oAuth2Credential = (new \Google\Auth\OAuth2([
            'clientId' => $this->clientId,
            'clientSecret' => $this->clientSecret,
            'refreshToken' => $integration->refresh_token,
        ]));

        $builder = (new GoogleAdsClientBuilder())
            ->withDeveloperToken($this->developerToken)
            ->withOAuth2Credential($oAuth2Credential);

        return $builder->build();
    }

    /**
     * Get a configured Google Ads Client for a specific GoogleAdsAccount
     */
    public function getGoogleAdsClientForAccount(\App\Models\GoogleAdsAccount $account)
    {
        if (!$account->refresh_token) {
            throw new \Exception("Google Ads Account has no refresh token.");
        }

        if (!$this->developerToken) {
            throw new \Exception("Google Developer Token is not configured in System Settings.");
        }

        $oAuth2Credential = (new \Google\Auth\OAuth2([
            'clientId' => $this->clientId,
            'clientSecret' => $this->clientSecret,
            'refreshToken' => $account->refresh_token,
        ]));

        $builder = (new GoogleAdsClientBuilder())
            ->withDeveloperToken($this->developerToken)
            ->withOAuth2Credential($oAuth2Credential);

        // If we are operating on a client account directly, we don't strictly need loginCustomerId unless we are accessing via MCC.
        // For now, we leave it optional.
        // if ($account->login_customer_id) {
        //    $builder->withLoginCustomerId($account->login_customer_id);
        // }

        return $builder->build();
    }

    /**
     * Get a valid access token for GoogleAdsAccount (refresh if needed)
     */
    public function getValidAccessTokenForAccount(\App\Models\GoogleAdsAccount $account)
    {
        // If token is valid for at least another minute, return it
        if ($account->expires_at && $account->expires_at->isFuture() && $account->expires_at->diffInSeconds(now()) > 60) {
            return $account->access_token;
        }

        try {
            $oauth2 = new \Google\Auth\OAuth2([
                'clientId' => $this->clientId,
                'clientSecret' => $this->clientSecret,
                'refreshToken' => $account->refresh_token,
            ]);

            $token = $oauth2->fetchAuthToken();
            
            if (isset($token['access_token'])) {
                $account->access_token = $token['access_token'];
                $account->expires_at = now()->addSeconds($token['expires_in']);
                $account->save();
                return $token['access_token'];
            }
        } catch (\Exception $e) {
            Log::error("Failed to refresh Google Ads Account token: " . $e->getMessage());
        }

        return null;
    }



    /**
     * Get a valid access token (refresh if needed)
     * This is a helper for other services
     */
    public function getValidAccessToken(GoogleIntegration $integration)
    {
        // If token is valid for at least another minute, return it
        if ($integration->expires_at && $integration->expires_at->isFuture() && $integration->expires_at->diffInSeconds(now()) > 60) {
            return $integration->access_token;
        }

        if (!$integration->refresh_token) {
            Log::error("Google Auth: No refresh token available for tenant {$integration->tenant_id}");
            return null;
        }

        $newToken = $this->refreshAccessToken($integration->refresh_token);
        
        if ($newToken) {
            $integration->update([
                'access_token' => $newToken['access_token'],
                'expires_at' => now()->addSeconds($newToken['expires_in']),
            ]);
            return $newToken['access_token'];
        }

        return null;
    }

    /**
     * Get a valid access token for OauthToken (user-specific)
     */
    public function getValidOauthToken(\App\Models\OauthToken $token)
    {
        // If token is valid for at least another minute, return it
        if ($token->expires_at && $token->expires_at->isFuture() && $token->expires_at->diffInSeconds(now()) > 60) {
            return $token->access_token;
        }

        if (!$token->refresh_token) {
            Log::error("Google Auth: No refresh token available for user {$token->user_id}");
            return null;
        }

        $newToken = $this->refreshAccessToken($token->refresh_token);
        
        if ($newToken) {
            $token->update([
                'access_token' => $newToken['access_token'],
                'expires_at' => now()->addSeconds($newToken['expires_in']),
            ]);
            return $newToken['access_token'];
        }

        return null;
    }

    /**
     * Refresh access token using refresh token
     */
    protected function refreshAccessToken($refreshToken)
    {
        try {
            $response = \Illuminate\Support\Facades\Http::post('https://oauth2.googleapis.com/token', [
                'client_id' => $this->clientId,
                'client_secret' => $this->clientSecret,
                'refresh_token' => $refreshToken,
                'grant_type' => 'refresh_token',
            ]);

            if ($response->successful()) {
                return $response->json();
            } else {
                Log::error("Google Auth: Failed to refresh token. " . $response->body());
                return null;
            }
        } catch (\Exception $e) {
            Log::error("Google Auth: Exception refreshing token: " . $e->getMessage());
            return null;
        }
    }
}
