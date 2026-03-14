<?php

namespace App\Http\Controllers;

use App\Models\ErpSyncLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ErpSyncLogController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user->tenant_id) {
            return response()->json(['message' => 'User does not belong to a tenant'], 403);
        }

        $query = ErpSyncLog::where('tenant_id', $user->tenant_id)
            ->orderByDesc('synced_at')
            ->orderByDesc('id');

        if ($request->filled('entity')) {
            $query->where('entity', $request->string('entity'));
        }

        $logs = $query->limit(200)->get();

        return response()->json($logs);
    }
}

