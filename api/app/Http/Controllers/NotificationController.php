<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use NotificationChannels\WebPush\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Notification;
use App\Notifications\TestNotification;
use App\Models\NotificationSetting;
use App\Models\Project;
use App\Models\Property;
use App\Models\Developer;
use App\Models\Broker;
use App\Models\RealEstateRequest;
use Carbon\Carbon;

class NotificationController extends Controller
{
    // List Notifications with Unread Count
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $notifications = $user->notifications()
                ->latest()
                ->paginate(20);
            $unreadCount = $user->unreadNotifications()->count();

            return response()->json([
                'notifications' => $notifications,
                'unread_count' => $unreadCount
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Notifications Index Error: ' . $e->getMessage());
            return response()->json([
                'notifications' => ['data' => []],
                'unread_count' => 0,
                'message' => 'Failed to fetch notifications',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    // Unread Count
    public function unreadCount(Request $request)
    {
        return response()->json([
            'count' => $request->user()->unreadNotifications()->count()
        ]);
    }

    // Mark All as Read
    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->noContent();
    }

    // Mark Single as Read
    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();
        return response()->noContent();
    }

    // Archive Notification
    public function archive(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        if (is_null($notification->read_at)) {
            $notification->read_at = now();
        }
        $notification->archived_at = now();
        $notification->save();
        return response()->noContent();
    }

    // Unarchive Notification
    public function unarchive(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->archived_at = null;
        $notification->save();
        return response()->noContent();
    }

    // Delete Notification
    public function destroy(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->delete();
        return response()->noContent();
    }

    // Store Web Push Subscription
    public function subscribe(Request $request)
    {
        $request->validate([
            'endpoint'    => 'required',
            'keys.auth'   => 'required',
            'keys.p256dh' => 'required',
        ]);

        $user = $request->user();

        if ($user) {
            $user->updatePushSubscription(
                $request->endpoint,
                $request->keys['p256dh'],
                $request->keys['auth']
            );
        }

        return response()->json(['success' => true]);
    }

    // Trigger Notification
    public function trigger(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $user = $request->user();
        
        if ($user) {
            $user->notify(new TestNotification($request->message));
        }

        return response()->json(['success' => true]);
    }

    public function inventoryCounts(Request $request)
    {
        $user = $request->user();

        $settings = NotificationSetting::firstOrCreate(
            ['user_id' => $user->id],
            []
        );

        $meta = $settings->meta_data ?? [];
        if (!is_array($meta)) {
            $meta = [];
        }

        $lastSeen = $meta['inventory_last_seen'] ?? [];
        if (!is_array($lastSeen)) {
            $lastSeen = [];
        }

        $keys = ['projects', 'properties', 'developers', 'brokers', 'requests'];
        $counts = [];

        foreach ($keys as $key) {
            $sinceRaw = $lastSeen[$key] ?? null;
            $since = null;
            if ($sinceRaw) {
                try {
                    $since = Carbon::parse($sinceRaw);
                } catch (\Throwable $e) {
                    $since = null;
                }
            }

            switch ($key) {
                case 'projects':
                    $query = Project::query();
                    break;
                case 'properties':
                    $query = Property::query();
                    break;
                case 'developers':
                    $query = Developer::query();
                    break;
                case 'brokers':
                    $query = Broker::query();
                    break;
                case 'requests':
                    $query = RealEstateRequest::query();
                    break;
                default:
                    $query = null;
                    break;
            }

            if (!$query) {
                $counts[$key] = 0;
                continue;
            }

            if ($since) {
                $query->where('created_at', '>', $since);
            }

            $counts[$key] = $query->count();
        }

        return response()->json(['data' => $counts]);
    }

    public function markInventorySeen(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'page' => 'required|string|in:projects,properties,developers,brokers,requests',
        ]);

        $settings = NotificationSetting::firstOrCreate(
            ['user_id' => $user->id],
            []
        );

        $meta = $settings->meta_data ?? [];
        if (!is_array($meta)) {
            $meta = [];
        }

        $lastSeen = $meta['inventory_last_seen'] ?? [];
        if (!is_array($lastSeen)) {
            $lastSeen = [];
        }

        $lastSeen[$data['page']] = now()->toDateTimeString();
        $meta['inventory_last_seen'] = $lastSeen;
        $settings->meta_data = $meta;
        $settings->save();

        return response()->json(['success' => true]);
    }
}
