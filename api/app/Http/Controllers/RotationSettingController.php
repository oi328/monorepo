<?php

namespace App\Http\Controllers;

use App\Models\RotationSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RotationSettingController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        $settings = RotationSetting::firstOrCreate(
            ['tenant_id' => $user->tenant_id],
            [
                'allow_assign_rotation' => true,
                'delay_assign_rotation' => false,
                'work_from' => '00:00',
                'work_to' => '23:59',
                'reshuffle_cold_leads' => false,
                'reshuffle_cold_leads_number' => 0,
            ]
        );
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $user = Auth::user();
        $settings = RotationSetting::firstOrCreate(['tenant_id' => $user->tenant_id]);

        $validated = $request->validate([
            'allow_assign_rotation' => 'boolean',
            'delay_assign_rotation' => 'boolean',
            'work_from' => 'string',
            'work_to' => 'string',
            'reshuffle_cold_leads' => 'boolean',
            'reshuffle_cold_leads_number' => 'integer|min:0',
        ]);

        $settings->update($validated);
        return response()->json($settings);
    }
}
