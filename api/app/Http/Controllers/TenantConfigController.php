<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class TenantConfigController extends Controller
{
    public function show(Request $request)
    {
        $origin = $request->headers->get('Origin') ?: ($request->getSchemeAndHttpHost());
        $redirectBase = rtrim($origin ?: '', '/') . '/';

        $googleClientId = config('services.google.client_id') ?? env('GOOGLE_CLIENT_ID');

        return response()->json([
            'googleAdsClientId' => $googleClientId,
            'googleAdsRedirectUri' => $redirectBase,
            'gmailClientId' => $googleClientId,
            'gmailRedirectUri' => $redirectBase,
        ]);
    }
}
