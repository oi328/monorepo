<?php

namespace App\Http\Controllers;

use App\Models\Area;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AreaController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : (Auth::check() ? Auth::user()->tenant_id : null);
        $query = Area::withoutGlobalScope('tenant')
            ->where('tenant_id', $tenantId)
            ->with(['region:id,name_en,name_ar,city_id', 'region.city:id,name_en,name_ar,country_id']);

        if ($request->has('region_id')) {
            $query->where('region_id', $request->region_id);
        }

        if ($request->has('city_id')) {
            $query->whereHas('region', function ($q) use ($request) {
                $q->where('city_id', $request->city_id);
            });
        }

        if ($request->has('country_id')) {
            $query->whereHas('region.city', function ($q) use ($request) {
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
            'region_id' => 'required|exists:regions,id',
            'status' => 'boolean',
        ]);
        $area = Area::create($validated);
        return response()->json($area->load('region'), 201);
    }

    public function show(Area $area)
    {
        return response()->json($area->load('region'));
    }

    public function update(Request $request, Area $area)
    {
        $validated = $request->validate([
            'name_en' => 'sometimes|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'region_id' => 'sometimes|exists:regions,id',
            'status' => 'boolean',
        ]);
        $area->update($validated);
        return response()->json($area->load('region'));
    }

    public function destroy(Area $area)
    {
        $area->delete();
        return response()->noContent();
    }
}
