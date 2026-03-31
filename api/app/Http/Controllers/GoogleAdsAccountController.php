<?php

namespace App\Http\Controllers;

use App\Models\GoogleAdsAccount;
use App\Models\GoogleConnectedAccount;
use App\Contracts\GoogleAdsServiceInterface;
use App\Services\GoogleAuthService;
use App\Services\GoogleCampaignService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GoogleAdsAccountController extends Controller
{
    protected $googleAdsService;
    protected $googleAuthService;
    protected $googleCampaignService;

    public function __construct(
        GoogleAdsServiceInterface $googleAdsService,
        GoogleAuthService $googleAuthService,
        GoogleCampaignService $googleCampaignService
    )
    {
        $this->googleAdsService = $googleAdsService;
        $this->googleAuthService = $googleAuthService;
        $this->googleCampaignService = $googleCampaignService;
    }

    /**
     * List all Google Ads accounts for a tenant.
     */
    public function index(Request $request, $tenantId = null)
    {
        if (!$tenantId) {
            $tenantId = $request->user()?->tenant_id;
        }
        if (!$tenantId) {
            return response()->json(['error' => 'Tenant not resolved'], 422);
        }
        $accounts = GoogleAdsAccount::where('tenant_id', $tenantId)->get();
        return response()->json($accounts);
    }

    /**
     * Connect a new Google Ads account.
     * In Mock Mode, this creates a mock account.
     * In Real Mode, this would exchange OAuth code (simplified here for now).
     */
    public function connect(Request $request, $tenantId)
    {
        $request->validate([
            'account_name' => 'required|string',
            'google_ads_id' => 'required|string',
            'email' => 'required|email',
            'access_token' => 'nullable|string',
            'refresh_token' => 'nullable|string',
        ]);

        $isMock = config('services.google.ads.mock_mode', false);

        // Check for existing account
        $existing = GoogleAdsAccount::where('tenant_id', $tenantId)
            ->where('google_ads_id', $request->google_ads_id)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Account already connected'], 400);
        }

        $account = GoogleAdsAccount::create([
            'tenant_id' => $tenantId,
            'account_name' => $request->account_name,
            'google_ads_id' => $request->google_ads_id,
            'email' => $request->email,
            'access_token' => $request->access_token ?? ($isMock ? 'mock_access_token' : null),
            'refresh_token' => $request->refresh_token ?? ($isMock ? 'mock_refresh_token' : null),
            'expires_at' => now()->addHour(),
            'is_mock' => $isMock,
        ]);

        return response()->json(['message' => 'Account connected successfully', 'account' => $account], 201);
    }

    /**
     * Disconnect a Google Ads account.
     */
    public function disconnect($tenantId, $accountId)
    {
        $account = GoogleAdsAccount::where('tenant_id', $tenantId)->where('id', $accountId)->first();

        if (!$account) {
            return response()->json(['error' => 'Account not found'], 404);
        }

        $account->delete();

        return response()->json(['message' => 'Account disconnected successfully']);
    }

    /**
     * Get campaigns for a specific account.
     */
    public function getCampaigns($tenantId, $accountId)
    {
        $account = GoogleAdsAccount::where('tenant_id', $tenantId)->where('id', $accountId)->first();

        if (!$account) {
            return response()->json(['error' => 'Account not found'], 404);
        }

        try {
            $campaigns = $this->googleAdsService->getCampaigns($accountId);
            return response()->json(['campaigns' => $campaigns]);
        } catch (\Exception $e) {
            Log::error("Failed to fetch campaigns for account {$accountId}: " . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch campaigns'], 500);
        }
    }

    /**
     * Get leads for a specific account.
     */
    public function getLeads($tenantId, $accountId)
    {
        $account = GoogleAdsAccount::where('tenant_id', $tenantId)->where('id', $accountId)->first();

        if (!$account) {
            return response()->json(['error' => 'Account not found'], 404);
        }

        try {
            $leads = $this->googleAdsService->getLeads($accountId);
            return response()->json(['leads' => $leads]);
        } catch (\Exception $e) {
            Log::error("Failed to fetch leads for account {$accountId}: " . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch leads'], 500);
        }
    }

    /**
     * List all Google connected identities for a tenant.
     */
    public function connectedAccounts(Request $request)
    {
        $tenantId = $request->user()?->tenant_id;
        if (!$tenantId) {
            return response()->json(['error' => 'Tenant not resolved'], 422);
        }

        $connectedAccounts = GoogleConnectedAccount::where('tenant_id', $tenantId)->get();
        return response()->json($connectedAccounts);
    }

    /**
     * Discover Google Ads accounts for a connected identity.
     */
    public function discover(Request $request, $connectedAccountId)
    {
        $tenantId = $request->user()?->tenant_id;
        if (!$tenantId) {
            return response()->json(['error' => 'Tenant not resolved'], 422);
        }

        $connected = GoogleConnectedAccount::where('tenant_id', $tenantId)->where('id', $connectedAccountId)->first();
        if (!$connected) {
            return response()->json(['error' => 'Connected account not found'], 404);
        }

        try {
            $this->googleAuthService->discoverAccounts($tenantId, $connected);
            return response()->json(['message' => 'Discovery triggered successfully']);
        } catch (\Exception $e) {
            Log::error("Failed to discover Google Ads accounts for connected account {$connectedAccountId}: " . $e->getMessage());
            return response()->json(['error' => 'Failed to discover accounts', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update a Google Ads account settings.
     */
    public function update(Request $request, $accountId)
    {
        $tenantId = $request->user()?->tenant_id;
        if (!$tenantId) {
            return response()->json(['error' => 'Tenant not resolved'], 422);
        }

        $account = GoogleAdsAccount::where('tenant_id', $tenantId)->where('id', $accountId)->first();
        if (!$account) {
            return response()->json(['error' => 'Account not found'], 404);
        }

        $validated = $request->validate([
            'is_primary' => 'sometimes|boolean',
            'is_default_for_sync' => 'sometimes|boolean',
            'is_default_for_conversion' => 'sometimes|boolean',
            'webhook_enabled' => 'sometimes|boolean',
            'connection_status' => 'sometimes|string',
        ]);

        $account->update($validated);

        return response()->json(['message' => 'Account updated successfully', 'account' => $account]);
    }

    /**
     * Sync a specific Google Ads account.
     */
    public function sync(Request $request, $accountId)
    {
        $tenantId = $request->user()?->tenant_id;
        if (!$tenantId) {
            return response()->json(['error' => 'Tenant not resolved'], 422);
        }

        $account = GoogleAdsAccount::where('tenant_id', $tenantId)->where('id', $accountId)->first();
        if (!$account) {
            return response()->json(['error' => 'Account not found'], 404);
        }

        try {
            $this->googleCampaignService->syncAccount($account);
            return response()->json(['message' => 'Account sync started successfully']);
        } catch (\Exception $e) {
            Log::error("Failed to sync account {$accountId}: " . $e->getMessage());
            return response()->json(['error' => 'Failed to sync account', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Regenerate webhook key for a Google Ads account.
     */
    public function regenerateWebhookKey(Request $request, $accountId)
    {
        $tenantId = $request->user()?->tenant_id;
        if (!$tenantId) {
            return response()->json(['error' => 'Tenant not resolved'], 422);
        }

        $account = GoogleAdsAccount::where('tenant_id', $tenantId)->where('id', $accountId)->first();
        if (!$account) {
            return response()->json(['error' => 'Account not found'], 404);
        }

        $account->webhook_key = (string) Str::uuid();
        $account->save();

        return response()->json(['message' => 'Webhook key regenerated', 'webhook_key' => $account->webhook_key]);
    }
}

