<?php

namespace App\Http\Controllers;

use App\Models\OauthToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GmailController extends Controller
{
    public function labels(Request $request)
    {
        $user = $request->user();
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $user->tenant_id;

        $token = OauthToken::where([
            'user_id' => $user->id,
            'tenant_id' => $tenantId,
            'provider' => 'gmail',
        ])->first();

        if (!$token || !$token->access_token) {
            return response()->json(['error' => 'not_connected'], 400);
        }

        $client = new \GuzzleHttp\Client();
        $resp = $client->request('GET', 'https://gmail.googleapis.com/gmail/v1/users/me/labels', [
            'headers' => [
                'Authorization' => 'Bearer '.$token->access_token,
                'Accept' => 'application/json',
            ],
            'http_errors' => false,
            'timeout' => 15,
        ]);
        $status = $resp->getStatusCode();
        $body = (string) $resp->getBody();
        $json = json_decode($body, true);
        if ($status < 200 || $status >= 300) {
            return response()->json(['error' => 'gmail_labels_failed', 'details' => $json], 400);
        }
        return response()->json(['labels' => $json['labels'] ?? []]);
    }
}
