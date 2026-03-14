<?php

namespace App\Http\Controllers;

use App\Models\OauthToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class OauthController extends Controller
{
    public function exchange(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'redirectUri' => 'required|string',
            'provider' => 'required|string|in:gmail,ads',
        ]);

        $clientId = config('services.google.client_id') ?? env('GOOGLE_CLIENT_ID');
        $clientSecret = config('services.google.client_secret') ?? env('GOOGLE_CLIENT_SECRET');

        $client = new \GuzzleHttp\Client(['http_errors' => false, 'timeout' => 20]);
        $resp = $client->request('POST', 'https://oauth2.googleapis.com/token', [
            'form_params' => [
                'code' => $request->code,
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri' => $request->redirectUri,
                'grant_type' => 'authorization_code',
            ],
            'headers' => ['Accept' => 'application/json'],
        ]);
        $status = $resp->getStatusCode();
        $json = json_decode((string) $resp->getBody(), true);
        if ($status < 200 || $status >= 300) {
            return response()->json(['error' => 'token_exchange_failed', 'details' => $json], 400);
        }
        $user = $request->user();
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $user->tenant_id;

        $data = [
            'access_token' => $json['access_token'] ?? null,
            'scope' => $json['scope'] ?? null,
            'expires_at' => isset($json['expires_in']) ? now()->addSeconds($json['expires_in']) : null,
        ];

        if (!empty($json['refresh_token'])) {
            $data['refresh_token'] = $json['refresh_token'];
        }

        OauthToken::updateOrCreate(
            ['user_id' => $user->id, 'tenant_id' => $tenantId, 'provider' => $request->provider],
            $data
        );

        $profile = null;
        if ($request->provider === 'gmail' && !empty($json['access_token'])) {
            $pr = $client->request('GET', 'https://www.googleapis.com/gmail/v1/users/me/profile', [
                'headers' => [
                    'Authorization' => 'Bearer '.$json['access_token'],
                    'Accept' => 'application/json',
                ],
            ]);
            if ($pr->getStatusCode() >= 200 && $pr->getStatusCode() < 300) {
                $profile = json_decode((string) $pr->getBody(), true);
            }
        }

        return response()->json([
            'provider' => $request->provider,
            'token_type' => $json['token_type'] ?? null,
            'scope' => $json['scope'] ?? null,
            'expires_in' => $json['expires_in'] ?? null,
            'access_token' => $json['access_token'] ?? null,
            'refresh_token' => $json['refresh_token'] ?? null,
            'profile' => $profile,
        ]);
    }

    public function revoke(Request $request)
    {
        $request->validate(['provider' => 'required|string|in:gmail,ads']);

        $user = $request->user();
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $user->tenant_id;

        $token = OauthToken::where([
            'user_id' => $user->id,
            'tenant_id' => $tenantId,
            'provider' => $request->provider,
        ])->first();

        if (!$token) {
            return response()->json(['ok' => true, 'message' => 'already_disconnected']);
        }

        $toRevoke = $token->refresh_token ?: $token->access_token;
        if ($toRevoke) {
            $client = new \GuzzleHttp\Client(['http_errors' => false, 'timeout' => 20]);
            $client->request('POST', 'https://oauth2.googleapis.com/revoke', [
                'form_params' => ['token' => $toRevoke],
                'headers' => ['Accept' => 'application/json'],
            ]);
        }

        $token->delete();

        return response()->json(['ok' => true]);
    }
}
