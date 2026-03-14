<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index()
    {
        $query = Role::query();
        
        // Filter by current tenant if not super admin or if tenant context is active
        if (app()->bound('current_tenant_id')) {
            $tenantId = app('current_tenant_id');
            // 'tenant_id' is the team_foreign_key configured in permission.php
            $query->where('tenant_id', $tenantId);
        }

        $roles = $query->pluck('name'); // Return simple array of names as requested for the filter

        return response()->json($roles);
    }
}
