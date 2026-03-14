<?php

namespace App\Http\Controllers;

use App\Models\Region;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RegionController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : (Auth::check() ? Auth::user()->tenant_id : null);
        $query = Region::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->with(['city:id,name_en,name_ar,country_id']);

        if ($request->has('city_id')) {
            $query->where('city_id', $request->city_id);
        }

        if ($request->has('country_id')) {
            $query->whereHas('city', function ($q) use ($request) {
                $q->where('country_id', $request->country_id);
            });
        }

        if ($request->has('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name_en', 'like', "%{$s}%")
                  ->orWhere('name_ar', 'like', "%{$s}%");
            });
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name_en' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'city_id' => 'required|exists:cities,id',
            'status' => 'boolean',
        ]);
        $region = Region::create($validated);
        return response()->json($region->load('city'), 201);
    }

    public function show(Region $region)
    {
        return response()->json($region->load('city'));
    }

    public function update(Request $request, Region $region)
    {
        $validated = $request->validate([
            'name_en' => 'sometimes|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'city_id' => 'sometimes|exists:cities,id',
            'status' => 'boolean',
        ]);
        $region->update($validated);
        return response()->json($region->load('city'));
    }

    public function destroy(Region $region)
    {
        $region->delete();
        return response()->noContent();
    }
}
