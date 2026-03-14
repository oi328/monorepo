<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\GoogleCampaignService;
use App\Models\GoogleAdsAccount;
use Illuminate\Support\Facades\Log;

class GoogleMockController extends Controller
{
    protected $campaignService;

    public function __construct(GoogleCampaignService $campaignService)
    {
        $this->campaignService = $campaignService;
    }

    public function triggerMockCampaigns(Request $request, $tenantId, $accountId = null)
    {
        if (!config('services.google.ads.mock_mode')) {
            return response()->json(['error' => 'Google Ads Mock Mode is disabled'], 403);
        }

        try {
            $count = $request->query('count', 5);
            
            if ($accountId) {
                // Sync specific account
                $account = GoogleAdsAccount::where('tenant_id', $tenantId)->where('id', $accountId)->first();
                if (!$account) {
                    return response()->json(['error' => 'Account not found'], 404);
                }
                $this->campaignService->syncAccount($account);
                $message = "Triggered mock campaign sync for Account {$accountId}";
            } else {
                // Sync all accounts for tenant
                $this->campaignService->syncAll($tenantId);
                $message = "Triggered mock campaign sync for all accounts of Tenant {$tenantId}";
            }

            return response()->json([
                'message' => $message,
                'count' => $count // Note: Count is controlled by request param but service consumes it if implemented
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to trigger mock campaigns: " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function triggerMockLeads(Request $request, $tenantId, $accountId)
    {
        if (!config('services.google.ads.mock_mode')) {
            return response()->json(['error' => 'Google Ads Mock Mode is disabled'], 403);
        }

        try {
            $count = $request->query('count', 10);
            
            $account = GoogleAdsAccount::where('tenant_id', $tenantId)->where('id', $accountId)->first();
            if (!$account) {
                return response()->json(['error' => 'Account not found'], 404);
            }

            // Get mock leads directly from service (bypassing sync if we want to just generate them)
            // But usually we want to "process" them.
            // GoogleCampaignService now calls getLeads() inside syncAccount() if implemented.
            // But syncAccount() doesn't return the leads to the controller.
            
            // If the user wants to SEE the leads generated in the response, we might need to call the MockService directly.
            // But dependency injection binds the interface.
            
            $service = app(\App\Contracts\GoogleAdsServiceInterface::class);
            $leads = $service->getLeads($account->id); // This respects mock mode binding

            // Here we would normally dispatch them to the queue or webhook handler.
            // For now, we return them.
            
            return response()->json([
                'message' => "Generated " . count($leads) . " mock leads for Account {$accountId}",
                'leads' => $leads
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to trigger mock leads: " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
