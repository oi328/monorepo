<?php

namespace App\Http\Controllers;

use App\Models\Unit;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // BelongsToTenant trait handles tenant scoping automatically
        $units = Unit::paginate(request('per_page', 15));
        return response()->json($units);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'name' => 'required|string|max:255',
            'rent_amount' => 'required|numeric|min:0',
            'status' => 'nullable|string',
        ]);

        $unit = Unit::create($validated);

        return response()->json($unit, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Unit $unit)
    {
        return response()->json($unit);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Unit $unit)
    {
        $validated = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'name' => 'sometimes|string|max:255',
            'rent_amount' => 'sometimes|numeric|min:0',
            'status' => 'nullable|string',
        ]);

        $unit->update($validated);

        return response()->json($unit);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Unit $unit)
    {
        $unit->delete();
        return response()->json(null, 204);
    }
}
