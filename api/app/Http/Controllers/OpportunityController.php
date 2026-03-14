<?php

namespace App\Http\Controllers;

use App\Models\Opportunity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OpportunityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Opportunity::query();
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }
        
        return response()->json($query->latest()->paginate(15));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|string',
            'customer_name' => 'nullable|string',
            'status' => 'nullable|string',
            'amount' => 'nullable|numeric',
            'stage' => 'nullable|string',
            'expected_close_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'source' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $opportunity = Opportunity::create($request->all());
        return response()->json($opportunity, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Opportunity $opportunity)
    {
        return response()->json($opportunity);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Opportunity $opportunity)
    {
        $opportunity->update($request->all());
        return response()->json($opportunity);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Opportunity $opportunity)
    {
        $opportunity->delete();
        return response()->json(null, 204);
    }
}
