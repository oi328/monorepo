<?php

namespace App\Http\Controllers;

use App\Models\Team;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Team::with(['department:id,name', 'leader:id,name', 'members:id,name,email,status']);

        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id',
            'name' => 'required|string|max:255',
            'leader_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        $team = Team::create($validated);

        return response()->json($team, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $team = Team::with(['department', 'leader', 'members'])->findOrFail($id);
        return response()->json($team);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $team = Team::findOrFail($id);

        $validated = $request->validate([
            'department_id' => 'sometimes|exists:departments,id',
            'name' => 'sometimes|string|max:255',
            'leader_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:Active,Inactive',
        ]);

        $team->update($validated);

        return response()->json($team);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $team = Team::findOrFail($id);
        $team->delete();

        return response()->json(null, 204);
    }
}
