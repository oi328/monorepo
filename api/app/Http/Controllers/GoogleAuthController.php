<?php

namespace App\Http\Controllers;

use App\Services\GoogleAuthService;
use App\Jobs\SyncGoogleCampaigns;
use App\Services\GoogleCampaignService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use App\Models\GoogleIntegration;

class GoogleAuthController extends Controller
{
    protected $googleAuthService;
    protected $googleCampaignService;

    public function __construct(GoogleAuthService $googleAuthService, GoogleCampaignService $googleCampaignService)
    {
        $this->googleAuthService = $googleAuthService;
        $this->googleCampaignService = $googleCampaignService;
    }

    public function redirect(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $source = $request->input('source');
            $url = $this->googleAuthService->getRedirectUrl($user->tenant_id, $source);
            return response()->json(['url' => $url]);
        } catch (\Exception $e) {
            Log::error("Google Auth Redirect Error: " . $e->getMessage());
            return response()->json(['message' => 'Failed to generate redirect URL. Please ensure Google Credentials are configured in .env or System Settings.'], 500);
        }
    }

    public function callback(Request $request)
    {
        try {
            $state = $request->input('state');
            
            // Fix: Restore '+' characters that might have been converted to spaces during URL decoding
            if ($state) {
                $state = str_replace(' ', '+', $state);
            }

            Log::error('Google Auth Callback Hit', [
                'state_raw' => $state,
                'request_all' => $request->all()
            ]);

            $tenantId = null;
            $source = null;

            if ($state) {
                $decoded = json_decode(base64_decode($state), true);
                Log::error('Google Auth State Decoded', [
                    'decoded' => $decoded,
                    'json_error' => json_last_error_msg()
                ]);
                if (is_array($decoded)) {
                    $tenantId = $decoded['tenant_id'] ?? null;
                    $source = $decoded['source'] ?? null;
                } else {
                    $tenantId = $state;
                }
            } else {
                Log::error('Google Auth State Missing');
            }
            
            if (!$tenantId) {
                // Try to get user if state is missing (fallback for direct API calls)
                $user = $request->user();
                if ($user) {
                    $tenantId = $user->tenant_id;
                    Log::error('Google Auth Tenant Resolved via User', ['tenant_id' => $tenantId]);
                } else {
                    Log::error('Google Auth Tenant Not Found - User not authenticated and state missing');
                }
            }

            // 1. Resolve Tenant and build base redirect URL
            $tenant = \App\Models\Tenant::find($tenantId);
            $rootDomain = config('app.root_domain', 'besouholacrm.net');
            
            if ($tenant && $tenant->slug) {
                // If we have a tenant slug, use it as the subdomain
                $baseUrl = "https://{$tenant->slug}.{$rootDomain}";
            } else {
                // Fallback to main domain if tenant not found or has no slug
                $baseUrl = config('app.frontend_url');
            }

            Log::error('Google Auth Redirecting Back', [
                'tenant_id' => $tenantId,
                'slug' => $tenant?->slug,
                'base_url' => $baseUrl
            ]);

            // Default redirect to Marketing -> Google Ads interface as requested
            $redirectUrl = $baseUrl . '/#/marketing/google-ads';
            
            if ($source === 'email_settings') {
                $redirectUrl = $baseUrl . '/#/settings/email';
            } elseif ($source === 'settings_integration') {
                // Keep option to redirect to settings if explicitly requested
                $redirectUrl = $baseUrl . '/#/settings/integrations/google-slack';
            }

            if (!$tenantId) {
                return redirect($redirectUrl . '?status=error&message=Unauthorized');
            }

            // GoogleAuthService handles the stateless user retrieval and storage
            $integration = $this->googleAuthService->handleCallback($tenantId);

            return redirect($redirectUrl . '?status=success');

        } catch (\Exception $e) {
            Log::error("Google Auth Callback Error: " . $e->getMessage());
            $redirectUrl = isset($source) && $source === 'email_settings' 
                ? config('app.frontend_url') . '/settings/email'
                : config('app.frontend_url') . '/settings/integrations/google-slack';
                
            return redirect($redirectUrl . '?status=error&message=' . urlencode('Failed to connect Google account: ' . $e->getMessage()));
        }
    }

    public function sync(Request $request)
    {
        $user = $request->user();
        
        try {
            // Dispatch job for background processing
            SyncGoogleCampaigns::dispatch($user->tenant_id);
            
            return response()->json(['message' => 'Sync started successfully']);
        } catch (\Exception $e) {
            Log::error("Google Ads Sync Error: " . $e->getMessage());
            return response()->json(['error' => 'Failed to start sync'], 500);
        }
    }

    public function status(Request $request)
    {
        $user = $request->user();
        $integration = GoogleIntegration::where('tenant_id', $user->tenant_id)->first();

        // Ensure webhook key exists for active integrations
        if ($integration && !$integration->webhook_key) {
            $integration->webhook_key = (string) \Illuminate\Support\Str::uuid();
            $integration->save();
        }

        return response()->json([
            'connected' => !!($integration && $integration->refresh_token),
            'google_id' => $integration?->google_id,
            'customer_id' => $integration?->customer_id,
            'google_email' => $integration?->google_email,
            'webhook_key' => $integration?->webhook_key,
            'status' => $integration?->status,
            'conversion_action_id' => $integration?->conversion_action_id,
            'conversion_currency_code' => $integration?->conversion_currency_code,
            'conversion_value' => $integration?->conversion_value,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'customer_id' => 'nullable|string',
            'webhook_key' => 'nullable|string',
            'status' => 'boolean',
            'conversion_action_id' => 'nullable|string',
            'conversion_currency_code' => 'nullable|string|size:3',
            'conversion_value' => 'nullable|numeric',
        ]);

        $integration = GoogleIntegration::updateOrCreate(
            ['tenant_id' => $user->tenant_id],
            $validated
        );

        return response()->json(['message' => 'Settings updated', 'integration' => $integration]);
    }

    public function testConversion(Request $request)
    {
        $user = $request->user();
        $integration = GoogleIntegration::where('tenant_id', $user->tenant_id)->first();

        if (!$integration || !$integration->customer_id || !$integration->conversion_action_id) {
            return response()->json(['error' => 'Google Ads not configured correctly. Missing Customer ID or Conversion Action ID.'], 400);
        }

        // Validate payload
        $validated = $request->validate([
            'gclid' => 'required|string',
            'conversion_time' => 'nullable|string',
            'conversion_value' => 'nullable|numeric',
            'currency_code' => 'nullable|string|size:3',
        ]);

        // Simulation Logic (since google-ads-php is not installed)
        // In a real implementation, we would use the Google Ads API here.
        // For now, we log the attempt and return success to verify the flow.
        
        Log::info("Google Ads Conversion Test: Tenant {$user->tenant_id}", [
            'customer_id' => $integration->customer_id,
            'conversion_action_id' => $integration->conversion_action_id,
            'gclid' => $validated['gclid'],
            'value' => $validated['conversion_value'] ?? $integration->conversion_value,
            'currency' => $validated['currency_code'] ?? $integration->conversion_currency_code,
        ]);

        // Mock success response
        return response()->json([
            'message' => 'Conversion test simulated successfully',
            'data' => [
                'customer_id' => $integration->customer_id,
                'conversion_action_id' => $integration->conversion_action_id,
                'status' => 'UPLOADED'
            ]
        ]);
    }

    public function disconnect(Request $request)
    {
        $user = $request->user();
        $this->googleAuthService->disconnect($user->tenant_id);
        return response()->json(['message' => 'Disconnected successfully']);
    }

    public function uploadConversion(Request $request)
    {
        $validated = $request->validate([
            'conversionActionId' => 'required',
            'conversionTime' => 'required',
            'conversionValue' => 'required',
            'currencyCode' => 'required',
            'gclid' => 'required',
        ]);

        $user = $request->user();
        
        try {
            $result = $this->googleCampaignService->uploadConversion($user->tenant_id, $validated);
            return response()->json(['message' => 'Conversion uploaded successfully', 'data' => $result]);
        } catch (\Exception $e) {
            Log::error("Google Ads Conversion Upload Error: " . $e->getMessage());
            return response()->json(['error' => 'Failed to upload conversion: ' . $e->getMessage()], 500);
        }
    }
}
