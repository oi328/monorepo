<?php

namespace App\Http\Controllers;

use App\Models\WhatsappSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WhatsappSettingController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        if (!$user->tenant_id) {
            return response()->json(['message' => 'User does not belong to a tenant'], 403);
        }

        $settings = WhatsappSetting::firstOrCreate(
            ['tenant_id' => $user->tenant_id],
            [
                'provider' => 'meta', // Default
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

        $settings = WhatsappSetting::firstOrCreate(['tenant_id' => $user->tenant_id]);

        $validated = $request->validate([
            'provider' => 'required|string',
            'api_key' => 'nullable|string',
            'api_secret' => 'nullable|string',
            'business_number' => 'nullable|string',
            'business_id' => 'nullable|string',
            'phone_number_id' => 'nullable|string',
            'business_account_id' => 'nullable|string',
            'webhook_url' => 'nullable|url',
            'status' => 'boolean',
            'triggers' => 'nullable|array',
        ]);

        if (empty($validated['phone_number_id']) && !empty($validated['api_secret'])) {
            $validated['phone_number_id'] = $validated['api_secret'];
        }

        $settings->update($validated);

        return response()->json($settings);
    }
}
