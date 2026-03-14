<?php

namespace App\Http\Controllers;

use App\Models\LeadAction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    /**
     * Get top users by lead actions count in the current tenant.
     */
    public function topUsers(Request $request)
    {
        // Date filters
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $query = LeadAction::query()
            ->select('user_id', DB::raw('count(*) as total_actions'))
            ->whereNotNull('user_id');

        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // The BelongsToTenant trait on LeadAction automatically handles tenant_id filtering

        $topUsers = $query->groupBy('user_id')
            ->orderByDesc('total_actions')
            ->limit(5)
            ->with('user:id,name,email') // Eager load user details (relation is 'user' now)
            ->get();

        // Format the response
        $data = $topUsers->map(function ($action) {
            return [
                'user_id' => $action->user_id,
                'name' => $action->user ? $action->user->name : 'Unknown User',
                'email' => $action->user ? $action->user->email : '',
                'total_actions' => $action->total_actions,
            ];
        });

        return response()->json($data);
    }
}
