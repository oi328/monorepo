<?php

namespace App\Http\Controllers;

use App\Models\ErpSetting;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class ErpSettingController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        if (!$user->tenant_id) {
            return response()->json(['message' => 'User does not belong to a tenant'], 403);
        }

        $settings = ErpSetting::firstOrCreate(
            ['tenant_id' => $user->tenant_id],
            [
                'provider' => 'Generic REST API',
                'auth_type' => 'Bearer Token',
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

        $settings = ErpSetting::firstOrCreate(['tenant_id' => $user->tenant_id]);

        $validated = $request->validate([
            'provider' => 'sometimes|required|string',
            'base_url' => 'sometimes|required|url',
            'auth_type' => 'sometimes|required|string|in:Bearer Token,Basic Auth,API Key',
            'api_key' => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
            'sync_settings' => 'sometimes|array',
            'field_mappings' => 'sometimes|array',
            'advanced_settings' => 'sometimes|array',
        ]);

        $settings->update($validated);

        return response()->json($settings);
    }

    public function test(Request $request)
    {
        $validated = $request->validate([
            'provider' => 'required|string',
            'base_url' => 'required|url',
            'auth_type' => 'required|string|in:Bearer Token,Basic Auth,API Key',
            'api_key' => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        $client = Http::timeout(10);

        if ($validated['auth_type'] === 'Bearer Token') {
            if (empty($validated['api_key'])) {
                return response()->json(['message' => 'Bearer token is required.'], 422);
            }
            $client = $client->withToken($validated['api_key']);
        } elseif ($validated['auth_type'] === 'Basic Auth') {
            if (empty($validated['username']) || empty($validated['password'])) {
                return response()->json(['message' => 'Username and password are required.'], 422);
            }
            $client = $client->withBasicAuth($validated['username'], $validated['password']);
        } elseif ($validated['auth_type'] === 'API Key') {
            if (empty($validated['api_key'])) {
                return response()->json(['message' => 'API key is required.'], 422);
            }
            $client = $client->withHeaders([
                'X-API-KEY' => $validated['api_key'],
            ]);
        }

        $url = rtrim($validated['base_url'], '/');

        try {
            /** @var Response $resp */
            $resp = $client->get($url);

            if ($resp->successful()) {
                return response()->json([
                    'message' => 'Connection established successfully',
                    'status' => $resp->status(),
                ]);
            }

            return response()->json([
                'message' => 'Connection failed: HTTP ' . $resp->status(),
                'status' => $resp->status(),
                'body' => $resp->body(),
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Connection failed: ' . $e->getMessage(),
            ], 422);
        }
    }
}
