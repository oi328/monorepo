<?php

namespace App\Http\Controllers;

use App\Models\SmsSetting;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class SmsSettingController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        if (!$user->tenant_id) {
            return response()->json(['message' => 'User does not belong to a tenant'], 403);
        }

        $settings = SmsSetting::firstOrCreate(
            ['tenant_id' => $user->tenant_id],
            [
                'provider' => 'twilio', // Default
                'status' => false
            ]
        );

        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $user = Auth::user();
        if (!$user->tenant_id) {
            return response()->json(['message' => 'User does not belong to a tenant'], 403);
        }

        $settings = SmsSetting::firstOrCreate(['tenant_id' => $user->tenant_id]);

        $validated = $request->validate([
            'provider' => 'required|string',
            'api_key' => 'nullable|string',
            'api_secret' => 'nullable|string',
            'sender_id' => 'nullable|string',
            'status' => 'boolean',
            'triggers' => 'nullable|array',
        ]);

        $settings->update($validated);

        return response()->json($settings);
    }

    public function test(Request $request)
    {
        $request->validate([
            'provider' => 'required|string',
            'api_key' => 'required|string',
            'api_secret' => 'required|string',
            'sender_id' => 'nullable|string',
        ]);

        $provider = strtolower($request->provider);

        if ($provider === 'twilio') {
            $sid = $request->api_key;
            $token = $request->api_secret;

            try {
                /** @var Response $resp */
                $resp = Http::withBasicAuth($sid, $token)
                    ->timeout(10)
                    ->get("https://api.twilio.com/2010-04-01/Accounts/{$sid}.json");

                if ($resp->successful()) {
                    return response()->json([
                        'message' => 'Connection established successfully',
                    ]);
                }

                return response()->json([
                    'message' => 'Connection failed: ' . ($resp->json('message') ?? $resp->body()),
                ], 422);
            } catch (\Throwable $e) {
                return response()->json([
                    'message' => 'Connection failed: ' . $e->getMessage(),
                ], 422);
            }
        }

        return response()->json([
            'message' => 'Connection established successfully',
        ]);
    }
}
