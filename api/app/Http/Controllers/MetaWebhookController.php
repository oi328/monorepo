<?php

namespace App\Http\Controllers;

use App\Services\MetaWebhookService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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
        
        $mode = $request->query('hub_mode')
            ?? $request->query('hub.mode')
            ?? $request->input('hub.mode')
            ?? $request->input('hub_mode');
        $token = $request->query('hub_verify_token')
            ?? $request->query('hub.verify_token')
            ?? $request->input('hub.verify_token')
            ?? $request->input('hub_verify_token');
        $challenge = $request->query('hub_challenge')
            ?? $request->query('hub.challenge')
            ?? $request->input('hub.challenge')
            ?? $request->input('hub_challenge');
        
        $tokenMatches = $verifyToken !== null && hash_equals((string) $verifyToken, (string) $token);
        Log::info('Meta Webhook Verify', [
            'mode' => $mode,
            'token_present' => $token !== null && $token !== '',
            'token_matches' => $tokenMatches,
            'challenge_present' => $challenge !== null && $challenge !== '',
            'query_keys' => array_keys($request->query()),
        ]);

        if ($mode === 'subscribe' && $tokenMatches) {
            if ($challenge === null || $challenge === '') {
                return response()->json(['error' => 'Missing challenge'], 400);
            }
            return response((string) $challenge, 200)->header('Content-Type', 'text/plain');
        }
        
        return response()->json(['error' => 'Verification failed'], 403);
    }

    public function receive(Request $request)
    {
        try {
            $payload = $request->all();
            $entryCount = is_array($payload['entry'] ?? null) ? count($payload['entry']) : 0;
            Log::info('Meta Webhook Receive', [
                'object' => $payload['object'] ?? null,
                'entry_count' => $entryCount,
                'top_level_keys' => is_array($payload) ? array_keys($payload) : [],
            ]);

            $this->webhookService->handleWebhook($request);
            return response()->json(['ok' => true], 200);
        } catch (\Throwable $e) {
            Log::error('Meta Webhook Receive Error', [
                'message' => $e->getMessage(),
                'object' => $request->input('object'),
            ]);
            return response()->json(['ok' => false, 'error' => 'Webhook processing failed'], 500);
        }
    }
}
