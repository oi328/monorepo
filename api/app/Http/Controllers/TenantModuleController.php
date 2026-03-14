<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\Module;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class TenantModuleController extends Controller
{
    /**
     * Get all modules for a specific tenant with their status.
     */
    public function index($tenantId)
    {
        // Ensure user is super admin
        if (!Auth::user()->is_super_admin) {
            abort(403, 'Unauthorized. Super Admin access required.');
        }
        
        $tenant = Tenant::findOrFail($tenantId);
        
        // Get all available modules
        $allModules = Module::where('is_active', true)->get();
        
        // Get tenant's attached modules
        $tenantModules = $tenant->modules()->get()->keyBy('id');
        
        $result = $allModules->map(function ($module) use ($tenantModules) {
            $attached = $tenantModules->get($module->id);
            return [
                'id' => $module->id,
                'name' => $module->name,
                'slug' => $module->slug,
                'description' => $module->description,
                'is_enabled' => $attached ? $attached->pivot->is_enabled : false,
                'config' => $attached ? json_decode($attached->pivot->config) : null,
            ];
        });

        return response()->json([
            'tenant' => $tenant->only(['id', 'name', 'slug']),
            'modules' => $result
        ]);
    }

    /**
     * Update module status for a tenant.
     */
    public function update(Request $request, $tenantId)
    {
        // Ensure user is super admin
        if (!Auth::user()->is_super_admin) {
            abort(403, 'Unauthorized. Super Admin access required.');
        }

        $request->validate([
            'modules' => 'required|array',
            'modules.*.id' => 'required|exists:modules,id',
            'modules.*.is_enabled' => 'required|boolean',
            'modules.*.config' => 'nullable|array',
        ]);

        $tenant = Tenant::findOrFail($tenantId);

        DB::transaction(function () use ($tenant, $request) {
            $syncData = [];
            foreach ($request->modules as $moduleData) {
                $syncData[$moduleData['id']] = [
                    'is_enabled' => $moduleData['is_enabled'],
                    'config' => isset($moduleData['config']) ? json_encode($moduleData['config']) : null,
                ];
            }
            // Sync without detaching existing ones if partial update? 
            // The requirement implies managing modules. syncWithoutDetaching is safer if we send partials, 
            // but sync is better if we send the full state.
            // Let's use sync to ensure the state matches the request exactly for the provided modules.
            // Actually, best to just update/attach the specific ones provided.
            
            $tenant->modules()->syncWithoutDetaching($syncData);
        });

        return response()->json(['message' => 'Tenant modules updated successfully']);
    }
}
