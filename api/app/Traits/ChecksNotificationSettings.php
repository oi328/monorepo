<?php

namespace App\Traits;

use App\Models\NotificationSetting;
use Carbon\Carbon;

trait ChecksNotificationSettings
{
    /**
     * Determine which channels to send to based on user settings.
     *
     * @param object $notifiable
     * @param array $availableChannels The channels this notification supports (e.g. ['mail', 'database'])
     * @param string|null $securityKey The specific security setting key to check (e.g. 'password_change_alert')
     * @return array
     */
    public function determineChannels($notifiable, array $availableChannels, $securityKey = null)
    {
        // Default to all available if notifiable is not a User or has no settings
        if (!method_exists($notifiable, 'getAttribute')) {
            return $availableChannels;
        }

        $notifSettings = $notifiable->notification_settings ?? [];
        $secSettings = $notifiable->security_settings ?? [];

        // 1. Security Check (if applicable)
        if ($securityKey) {
            // If the specific security alert is disabled, return empty
            // We use strict comparison to false, assuming default is true if null
            if (isset($secSettings[$securityKey]) && $secSettings[$securityKey] === false) {
                return [];
            }
        }

        $selectedChannels = [];

        // 2. Filter available channels based on global toggles stored on User
        foreach ($availableChannels as $channel) {
            switch ($channel) {
                case 'mail':
                    // Check 'email' toggle. Default to true if not set.
                    if (($notifSettings['email'] ?? true) === true) {
                        $selectedChannels[] = 'mail';
                    }
                    break;

                case 'database':
                case 'broadcast':
                    // Check 'app' toggle. Default to true if not set.
                    if (($notifSettings['app'] ?? true) === true) {
                        $selectedChannels[] = $channel;
                    }
                    break;

                case 'nexmo':
                case 'twilio':
                case 'sms':
                    // Check 'sms' toggle. Default to false if not set.
                    if (($notifSettings['sms'] ?? false) === true) {
                        $selectedChannels[] = $channel;
                    }
                    break;
                
                default:
                    // For other channels, keep them by default
                    $selectedChannels[] = $channel;
                    break;
            }
        }

        // 3. Apply NotificationSetting (per-user) preferences: quiet hours and app toggle
        try {
            $ns = NotificationSetting::where('user_id', $notifiable->id)->first();
            if ($ns) {
                // Suppress app channels if user disabled app notifications
                if (($ns->app_notifications ?? true) === false) {
                    $selectedChannels = array_values(array_filter($selectedChannels, function ($ch) {
                        return !in_array($ch, ['database', 'broadcast']);
                    }));
                }
                // Quiet hours: suppress in-app channels within time window
                if (($ns->quiet_hours_enabled ?? false) === true && $ns->quiet_hours_start && $ns->quiet_hours_end) {
                    $now = Carbon::now($notifiable->timezone ?? config('app.timezone'))->format('H:i');
                    $start = $ns->quiet_hours_start;
                    $end = $ns->quiet_hours_end;
                    $inWindow = false;
                    if ($start <= $end) {
                        // Simple range within same day
                        $inWindow = ($now >= $start && $now <= $end);
                    } else {
                        // Wrap-around (e.g., 22:00 -> 06:00)
                        $inWindow = ($now >= $start || $now <= $end);
                    }
                    if ($inWindow) {
                        $selectedChannels = array_values(array_filter($selectedChannels, function ($ch) {
                            return !in_array($ch, ['database', 'broadcast']);
                        }));
                    }
                }
            }
        } catch (\Throwable $e) {
            // Fail-safe: ignore preference application errors
        }

        return $selectedChannels;
    }
}
