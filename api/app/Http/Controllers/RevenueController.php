<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Revenue;
use App\Models\User;
use App\Traits\UserHierarchyTrait;

class RevenueController extends Controller
{
    use UserHierarchyTrait;

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Revenue::query()
            ->with(['user.manager', 'lead'])
            ->where('tenant_id', $user->tenant_id);

        $roleLower = strtolower($user->role ?? '');
        $isAdminOrManager = $user->is_super_admin || 
                            in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

        if (!$isAdminOrManager) {
            $viewableUserIds = $this->getViewableUserIds($user);
            if ($viewableUserIds !== null) {
                $query->whereIn('user_id', $viewableUserIds);
            } else {
                $query->where('user_id', $user->id);
            }
        }

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $revenues = $query->latest()->get();

        return response()->json($revenues);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'lead_id' => 'nullable|exists:leads,id',
            'action_id' => 'nullable|exists:lead_actions,id',
            'amount' => 'required|numeric|min:0',
            'currency' => 'nullable|string|max:10',
            'source' => 'nullable|string|max:100',
            'meta_data' => 'nullable|array',
        ]);
        $payload = array_merge($validated, [
            'tenant_id' => $user->tenant_id,
            'currency' => $validated['currency'] ?? 'EGP',
        ]);
        $rev = Revenue::create($payload);
        return response()->json($rev, 201);
    }

    public function summary(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        $from = $request->input('date_from');
        $to = $request->input('date_to');
        $query = Revenue::query()->where('tenant_id', $user->tenant_id);
        if ($from) $query->whereDate('created_at', '>=', $from);
        if ($to) $query->whereDate('created_at', '<=', $to);
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        $rows = $query
            ->selectRaw('user_id, COALESCE(SUM(amount),0) as total')
            ->groupBy('user_id')
            ->get();
        $userIds = $rows->pluck('user_id')->filter()->unique()->values();
        $users = User::whereIn('id', $userIds)->get(['id','name'])->keyBy('id');
        $data = $rows->map(function($r) use ($users) {
            return [
                'user_id' => $r->user_id,
                'user_name' => $r->user_id ? ($users[$r->user_id]->name ?? null) : null,
                'total' => (float) $r->total,
            ];
        });
        return response()->json(['data' => $data]);
    }
}

