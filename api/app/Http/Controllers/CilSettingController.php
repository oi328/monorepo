<?php

namespace App\Http\Controllers;

use App\Models\CilSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CilSettingController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        if (!$user->tenant_id) {
            return response()->json(['message' => 'User does not belong to a tenant'], 403);
        }

        $settings = CilSetting::firstOrCreate(
            ['tenant_id' => $user->tenant_id],
            [
                'driver' => 'default', // Default value
                'port' => '8080',
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

        $settings = CilSetting::firstOrCreate(['tenant_id' => $user->tenant_id]);

        $validated = $request->validate([
            'driver' => 'nullable|string',
            'host_name' => 'nullable|string',
            'port' => 'nullable|string',
            'email' => 'nullable|email',
            'password' => 'nullable|string',
            'encryption' => 'nullable|string',
            'name' => 'nullable|string',
            'cil_signature' => 'nullable|string',
        ]);

        // Don't overwrite password with null/empty if not provided
        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $settings->update($validated);

        return response()->json($settings);
    }
}
