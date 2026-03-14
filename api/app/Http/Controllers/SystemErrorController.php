<?php

namespace App\Http\Controllers;

use App\Models\SystemError;
use Illuminate\Http\Request;
use Carbon\Carbon;

class SystemErrorController extends Controller
{
    public function index(Request $request)
    {
        // Only allow super admins or system admins to see this
        // Assuming middleware handles auth, but we might want to check role here
        // For now, return all errors

        $errors = SystemError::with('tenant')
            ->orderBy('last_seen_at', 'desc')
            ->limit(100)
            ->get();

        $formatted = $errors->map(function ($error) {
            return [
                'id' => $error->id,
                'time' => $error->created_at->format('Y-m-d H:i'),
                'tenant' => $error->tenant ? $error->tenant->name : 'System',
                'service' => $error->service,
                'endpoint' => $error->endpoint,
                'status' => $error->status,
                'level' => $error->level,
                'count' => $error->count,
                'lastSeen' => $error->last_seen_at->diffForHumans(null, true, true), // "2m", "1h" style
            ];
        });

        return response()->json($formatted);
    }
}
