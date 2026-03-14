<?php

namespace App\Http\Controllers;

use App\Models\City;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : (Auth::check() ? Auth::user()->tenant_id : null);
        $query = City::withoutGlobalScope('tenant')
            ->where(function ($q) use ($tenantId) {
                if ($tenantId) {
                    $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
                } else {
                    $q->whereNull('tenant_id');
                }
            })
            ->with('country:id,name_en,name_ar');

        if ($request->has('country_id')) {
            $query->where('country_id', $request->country_id);
        }
        // Optional: filter by country name when IDs differ across contexts (tenant vs global)
        if ($request->has('country_name') && !$request->has('country_id')) {
            $name = trim($request->country_name);
            $countryIds = \App\Models\Country::withoutGlobalScope('tenant')
                ->where(function ($q) use ($tenantId) {
                    if ($tenantId) {
                        $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id');
                    } else {
                        $q->whereNull('tenant_id');
                    }
                })
                ->where(function ($q) use ($name) {
                    $q->whereRaw('LOWER(TRIM(name_en)) = LOWER(TRIM(?))', [$name])
                      ->orWhereRaw('LOWER(TRIM(name_ar)) = LOWER(TRIM(?))', [$name])
                      ->orWhere('name_en', 'like', "%{$name}%")
                      ->orWhere('name_ar', 'like', "%{$name}%");
                })
                ->pluck('id');
            if ($countryIds->count() > 0) {
                $query->whereIn('country_id', $countryIds);
            } else {
                // No matching countries by name -> return empty quickly
                return response()->json([]);
            }
        }

        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name_en', 'like', "%{$s}%")
                  ->orWhere('name_ar', 'like', "%{$s}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', (bool) $request->status);
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'country_id' => 'required|exists:countries,id',
            'name_en' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'status' => 'boolean',
        ]);

        $city = City::create(array_merge(['status' => true], $validated));

        return response()->json($city->load('country:id,name_en,name_ar'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(City $city)
    {
        return $city->load('country:id,name_en,name_ar');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, City $city)
    {
        $validated = $request->validate([
            'country_id' => 'sometimes|exists:countries,id',
            'name_en' => 'sometimes|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'status' => 'boolean',
        ]);

        $city->update($validated);

        return response()->json($city->load('country:id,name_en,name_ar'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(City $city)
    {
        $city->delete();
        return response()->noContent();
    }
}
