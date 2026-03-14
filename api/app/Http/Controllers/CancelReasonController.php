<?php

namespace App\Http\Controllers;

use App\Models\CancelReason;
use Illuminate\Http\Request;

class CancelReasonController extends Controller
{
    public function index()
    {
        return CancelReason::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'title_ar' => 'nullable|string|max:255',
        ]);

        $cancelReason = CancelReason::create($validated);
        return response()->json($cancelReason, 201);
    }

    public function show(CancelReason $cancelReason)
    {
        return $cancelReason;
    }

    public function update(Request $request, CancelReason $cancelReason)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'title_ar' => 'nullable|string|max:255',
        ]);

        $cancelReason->update($validated);
        return response()->json($cancelReason);
    }

    public function destroy(CancelReason $cancelReason)
    {
        $cancelReason->delete();
        return response()->json(null, 204);
    }
}
