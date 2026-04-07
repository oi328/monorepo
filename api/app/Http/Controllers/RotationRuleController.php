<?php

namespace App\Http\Controllers;

use App\Models\RotationRule;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RotationRuleController extends Controller
{
    public function index(Request $request)
    {
        $auth = Auth::user();
        $type = (string) $request->get('type', '');
        $userId = $request->get('user_id');

        $q = RotationRule::query()->where('tenant_id', $auth->tenant_id);
        if ($type !== '') {
            $q->where('type', $type);
        }
        if ($userId) {
            $q->where('user_id', (int) $userId);
        }

        $q->with(['user:id,name,email,status,job_title']);

        $q->orderByRaw("case when position is null then 999999 else position end asc")
            ->orderBy('id');

        return response()->json([
            'rules' => $q->get(),
        ]);
    }

    public function store(Request $request)
    {
        $auth = Auth::user();
        $tenant = Tenant::find($auth->tenant_id);
        $companyType = strtolower(trim((string) ($tenant?->company_type ?? '')));
        $isGeneral = $companyType === 'general';

        $validated = $request->validate([
            'user_id' => 'required|integer',
            'type' => 'required|string|in:assign,delay',
            'project_id' => 'nullable|integer',
            'item_id' => 'nullable|integer',
            'source' => 'nullable|string|max:255',
            'regions' => 'nullable|array',
            'regions.*' => 'string|max:255',
            'position' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
        ]);

        $user = User::where('tenant_id', $auth->tenant_id)->findOrFail((int) $validated['user_id']);

        if ($validated['type'] === 'assign' && empty($validated['position'])) {
            $validated['position'] = 1;
        }
        if ($validated['type'] === 'delay') {
            $validated['position'] = null;
        }

        if ($isGeneral) {
            $validated['project_id'] = null;
        } else {
            $validated['item_id'] = null;
        }

        $rule = RotationRule::create([
            'tenant_id' => $auth->tenant_id,
            'user_id' => $user->id,
            'type' => $validated['type'],
            'project_id' => $validated['project_id'] ?? null,
            'item_id' => $validated['item_id'] ?? null,
            'source' => $validated['source'] ?? null,
            'regions' => $validated['regions'] ?? null,
            'position' => $validated['position'] ?? null,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : true,
        ]);

        return response()->json($rule->load('user:id,name,email,status,job_title'), 201);
    }

    public function update(Request $request, $id)
    {
        $auth = Auth::user();
        $tenant = Tenant::find($auth->tenant_id);
        $companyType = strtolower(trim((string) ($tenant?->company_type ?? '')));
        $isGeneral = $companyType === 'general';
        $rule = RotationRule::where('tenant_id', $auth->tenant_id)->findOrFail((int) $id);

        $validated = $request->validate([
            'project_id' => 'nullable|integer',
            'item_id' => 'nullable|integer',
            'source' => 'nullable|string|max:255',
            'regions' => 'nullable|array',
            'regions.*' => 'string|max:255',
            'position' => 'nullable|integer|min:1',
            'is_active' => 'nullable|boolean',
        ]);

        if ($rule->type === 'delay') {
            $validated['position'] = null;
        }

        if ($isGeneral) {
            $validated['project_id'] = null;
        } else {
            $validated['item_id'] = null;
        }

        $rule->update($validated);

        return response()->json($rule->load('user:id,name,email,status,job_title'));
    }

    public function destroy($id)
    {
        $auth = Auth::user();
        $rule = RotationRule::where('tenant_id', $auth->tenant_id)->findOrFail((int) $id);
        $rule->delete();
        return response()->json(['ok' => true]);
    }
}
