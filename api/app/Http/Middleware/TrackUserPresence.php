<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TrackUserPresence
{
    // Consider the user continuously "online" if there was activity within this window.
    // This matches the frontend's 15 minutes online threshold.
    private const CONTINUOUS_WINDOW_SECONDS = 15 * 60;

    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        $user = $request->user();
        if (!$user || !$user->tenant_id) {
            return $response;
        }
        if (!Schema::hasTable('user_presence_daily')) {
            return $response;
        }

        $tenantId = (int) $user->tenant_id;
        $userId = (int) $user->id;

        $now = now();
        $date = $now->toDateString();

        // Low-impact tracking: we only add time when requests are reasonably close together.
        // If the gap is larger than the window, we treat it as a new session and don't add the whole gap.
        $attempts = 0;
        while ($attempts < 2) {
            $attempts++;
            try {
                DB::transaction(function () use ($tenantId, $userId, $date, $now) {
                    $row = DB::table('user_presence_daily')
                        ->where('tenant_id', $tenantId)
                        ->where('user_id', $userId)
                        ->where('date', $date)
                        ->lockForUpdate()
                        ->first();

                    if (!$row) {
                        DB::table('user_presence_daily')->insert([
                            'tenant_id' => $tenantId,
                            'user_id' => $userId,
                            'date' => $date,
                            'total_seconds' => 0,
                            'last_tick_at' => $now,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                        return;
                    }

                    $addSeconds = 0;
                    if (!empty($row->last_tick_at)) {
                        try {
                            $last = \Carbon\Carbon::parse($row->last_tick_at);
                            $delta = $last->diffInSeconds($now, false);
                            if ($delta > 0 && $delta <= self::CONTINUOUS_WINDOW_SECONDS) {
                                $addSeconds = $delta;
                            }
                        } catch (\Throwable $e) {
                            // Ignore malformed timestamps; just reset the tick below.
                        }
                    }

                    $update = [
                        'last_tick_at' => $now,
                        'updated_at' => $now,
                    ];
                    if ($addSeconds > 0) {
                        $update['total_seconds'] = DB::raw('total_seconds + ' . (int) $addSeconds);
                    }

                    DB::table('user_presence_daily')
                        ->where('id', (int) $row->id)
                        ->update($update);
                }, 3);

                break;
            } catch (QueryException $e) {
                // If we raced on the unique key insert, retry once.
                $msg = strtolower($e->getMessage());
                $isDuplicate = str_contains($msg, 'duplicate') || str_contains($msg, 'unique');
                if ($attempts < 2 && $isDuplicate) {
                    continue;
                }
                // Never break the request flow because of presence tracking.
                break;
            } catch (\Throwable $e) {
                // Never break the request flow because of presence tracking.
                break;
            }
        }

        return $response;
    }
}
