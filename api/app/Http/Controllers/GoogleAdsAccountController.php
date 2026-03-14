<?php

namespace App\Http\Controllers;

use App\Models\GoogleAdsAccount;
use App\Contracts\GoogleAdsServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleAdsAccountController extends Controller
{
    protected $googleAdsService;

    public function __construct(GoogleAdsServiceInterface $googleAdsService)
    {
        $this->googleAdsService = $googleAdsService;
    }

    /**
     * List all Google Ads accounts for a tenant.
     */
    public function index($tenantId)
    {
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
}
