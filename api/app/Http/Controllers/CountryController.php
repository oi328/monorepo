<?php

namespace App\Http\Controllers;

use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CountryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : (Auth::check() ? Auth::user()->tenant_id : null);
        $query = \App\Models\Country::withoutGlobalScope('tenant')
            ->where(function ($q) use ($tenantId) {
                if ($tenantId) {
                    $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
                } else {
                    $q->whereNull('tenant_id');
                }
            });

        if ($request->has('active')) {
            $query->where('status', true);
        }

        return $query->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name_en' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:20',
            'status' => 'boolean',
        ]);

        $country = Country::create($validated);

        return response()->json($country, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Country $country)
    {
        return $country;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Country $country)
    {
        $validated = $request->validate([
            'name_en' => 'sometimes|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:20',
            'status' => 'boolean',
        ]);

        $country->update($validated);

        return $country;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Country $country)
    {
        $country->delete();
        return response()->noContent();
    }
}
