<?php

namespace App\Http\Controllers;

use App\Services\GoogleWebhookService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleWebhookController extends Controller
{
    protected $webhookService;

    public function __construct(GoogleWebhookService $webhookService)
    {
        $this->webhookService = $webhookService;
    }

    /**
     * Handle incoming Google Ads Lead Form webhook.
     * Google sends a POST request with the lead data.
     * Verification is done via the 'google-key' header or 'google_key' payload field matched against our database.
     */
    public function receive(Request $request)
    {
        // Google sometimes sends a test request when setting up the webhook.
        // We should log it and return 200 to confirm receipt.
        
        try {
            $this->webhookService->handleWebhook($request);
            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            Log::error("Google Webhook Controller Error: " . $e->getMessage());
            return response()->json(['error' => 'Internal Server Error'], 500);
        }
    }
}
