<?php

namespace App\Http\Controllers;

use App\Models\Source;
use Illuminate\Http\Request;

class SourceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = Source::query();
            
            if ($request->boolean('active')) {
                 $query->where('is_active', true);
            }

            if ($request->filled('search')) {
                $search = $request->string('search')->toString();
                $query->where('name', 'like', "%{$search}%");
            }

            $sources = $query->latest()->get();
            return response()->json($sources);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to fetch sources',
                'error' => app()->hasDebugMode() && config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);

        $source = Source::create($validated);

        return response()->json($source, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Source $source)
    {
        return $source;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Source $source)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'is_active' => 'boolean'
        ]);

        $source->update($validated);

        return response()->json($source);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Source $source)
    {
        $source->delete();
        return response()->json(null, 204);
    }
}
