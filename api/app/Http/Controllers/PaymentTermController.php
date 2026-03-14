<?php

namespace App\Http\Controllers;

use App\Models\PaymentTerm;
use Illuminate\Http\Request;

class PaymentTermController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return PaymentTerm::all();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'days' => 'required|integer|min:0',
            'discount_rate' => 'nullable|numeric|min:0|max:1',
            'description' => 'nullable|string',
        ]);

        $term = PaymentTerm::create($validated);

        return response()->json($term, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return PaymentTerm::findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $term = PaymentTerm::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'days' => 'sometimes|integer|min:0',
            'discount_rate' => 'nullable|numeric|min:0|max:1',
            'description' => 'nullable|string',
        ]);

        $term->update($validated);

        return response()->json($term);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $term = PaymentTerm::findOrFail($id);
        $term->delete();

        return response()->json(null, 204);
    }
}
