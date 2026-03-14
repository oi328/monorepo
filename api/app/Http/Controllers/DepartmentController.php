<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DepartmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $authUser = $request->user();

        $query = Department::with(['manager:id,name', 'teams']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $tenantIdContext = null;
        if (app()->bound('current_tenant_id')) {
            $tenantIdContext = app('current_tenant_id');
        } elseif (app()->bound('tenant')) {
            $tenantIdContext = app('tenant')->id;
        } elseif ($authUser && $authUser->tenant_id) {
            $tenantIdContext = $authUser->tenant_id;
        }

        if ($tenantIdContext !== null) {
            $query->where('tenant_id', $tenantIdContext);
        }

        $departments = $query->latest()->get();

        // Append counts
        $departments->each(function ($dept) {
            $dept->teams_count = $dept->teams->count();
            $dept->employees_count = $dept->employees()->count();
        });

        return response()->json($departments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        if (app()->bound('current_tenant_id')) {
            $validated['tenant_id'] = app('current_tenant_id');
        }

        $department = Department::create($validated);

        return response()->json($department, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $department = Department::with(['manager:id,name', 'teams.leader:id,name', 'teams.members:id,name,email,status'])->findOrFail($id);
        
        $department->teams_count = $department->teams->count();
        $department->employees_count = $department->employees()->count();

        return response()->json($department);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $department = Department::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'manager_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        $department->update($validated);

        return response()->json($department);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $department = Department::findOrFail($id);
        $department->delete();

        return response()->json(null, 204);
    }
}
