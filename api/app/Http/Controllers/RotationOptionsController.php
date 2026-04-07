<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Region;
use App\Models\Source;
use App\Models\Tenant;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RotationOptionsController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user?->tenant_id;

        $tenant = app()->bound('tenant') ? app('tenant') : Tenant::find($tenantId);
        $companyType = (string) ($tenant?->company_type ?? '');
        $isGeneral = strtolower(trim($companyType)) === 'general';

        $projects = $isGeneral
            ? collect()
            : Project::query()
                ->select(['id', 'name', 'status'])
                ->orderBy('created_at', 'desc')
                ->get();

        $items = $isGeneral
            ? Item::query()
                ->select(['id', 'name', 'tenant_id'])
                ->where('tenant_id', $tenantId)
                ->orderBy('created_at', 'desc')
                ->get()
            : collect();

        $sources = Source::query()
            ->select(['id', 'name', 'is_active'])
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $regions = Region::withoutGlobalScope('tenant')
            ->select(['id', 'name_en', 'name_ar', 'tenant_id'])
            ->where('tenant_id', $tenantId)
            ->orderBy('name_en')
            ->get();

        return response()->json([
            'company_type' => $companyType,
            'projects' => $projects,
            'items' => $items,
            'sources' => $sources,
            'regions' => $regions,
        ]);
    }
}
