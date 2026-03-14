<?php

namespace App\Http\Controllers;

use App\Models\NotificationSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationSettingController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        $settings = NotificationSetting::firstOrCreate(
            ['user_id' => $user->id],
            [] // Defaults are handled by database migration
        );

        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $user = Auth::user();
        $settings = NotificationSetting::firstOrCreate(['user_id' => $user->id]);

        $validated = $request->validate([
            'system_notifications' => 'boolean',
            'app_notifications' => 'boolean',
            'quiet_hours_enabled' => 'boolean',
            'quiet_hours_start' => 'nullable|date_format:H:i',
            'quiet_hours_end' => 'nullable|date_format:H:i',
            'notify_assigned_leads' => 'boolean',
            'notify_delay_leads' => 'boolean',
            'notify_requests' => 'boolean',
            'notify_rent_end_date' => 'boolean',
            'notify_add_customer' => 'boolean',
            'notify_create_invoice' => 'boolean',
            'notify_open_ticket' => 'boolean',
            'notify_campaign_expired' => 'boolean',
            'notify_task_assigned' => 'boolean',
            'notify_task_expired' => 'boolean',
            'meta_data' => 'nullable|array',
        ]);

        $settings->update($validated);

        return response()->json($settings);
    }
}
