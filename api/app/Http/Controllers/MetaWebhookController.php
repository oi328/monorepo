<?php

namespace App\Http\Controllers;

use App\Services\MetaWebhookService;
use Illuminate\Http\Request;

class MetaWebhookController extends Controller
{
    protected $webhookService;

    public function __construct(MetaWebhookService $webhookService)
    {
        $this->webhookService = $webhookService;
    }

    public function verify(Request $request)
    {
        $verifyToken = \App\Models\SystemSetting::where('key', 'meta_verify_token')->value('value') 
            ?? config('services.facebook.verify_token') 
            ?? env('META_VERIFY_TOKEN');
        
        $mode = $request->query('hub_mode') ?? $request->input('hub.mode');
        $token = $request->query('hub_verify_token') ?? $request->input('hub.verify_token');
        $challenge = $request->query('hub_challenge') ?? $request->input('hub.challenge');
        
        \Illuminate\Support\Facades\Log::info('Meta Webhook Verify', [
            'mode' => $mode,
            'token' => $token,
            'expected' => $verifyToken
        ]);

        if ($mode === 'subscribe' && $token === $verifyToken) {
            return response($challenge, 200);
        }
        
        return response()->json(['error' => 'Verification failed'], 403);
    }

    public function receive(Request $request)
    {
        $this->webhookService->handleWebhook($request);
        return response()->json(['ok' => true]);
    }
}
