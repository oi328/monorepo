<?php

namespace App\Traits;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

trait BelongsToTenant
{
    /**
     * Boot the trait.
     */
    protected static function bootBelongsToTenant()
    {
        // 1. Global Scope: Filter by current tenant_id (from Container or Auth)
        static::addGlobalScope('tenant', function (Builder $builder) {
            // 1. Priority: If current_tenant_id is bound (e.g. from middleware or manual set), use it.
            if (app()->bound('current_tenant_id')) {
                $tenantId = app('current_tenant_id');
                $table = $builder->getModel()->getTable();
                $builder->where($table . '.tenant_id', $tenantId);
                return;
            }

            // 2. Check Auth for Tenant context
            try {
                if (\Illuminate\Support\Facades\Auth::check()) {
                    $user = \Illuminate\Support\Facades\Auth::user();
                    
                    // Super Admin Logic: Must have tenant context explicitly set
                    if ($user->is_super_admin) {
                         // If we are here, current_tenant_id wasn't bound (checked above), so block access
                         $builder->whereRaw('1 = 0');
                         return;
                    }

                    // Regular User: Use their tenant_id
                    $tenantId = $user->tenant_id;
                    if ($tenantId) {
                        $table = $builder->getModel()->getTable();
                        $builder->where($table . '.tenant_id', $tenantId);
                    }
                }
            } catch (\Throwable $e) {
                // Ignore auth check errors in weird contexts (e.g. public API with no session)
            }
        });

        // 2. Auto-set tenant_id on creating
        static::creating(function (Model $model) {
            $tenantId = null;

            if (app()->bound('current_tenant_id')) {
                $tenantId = app('current_tenant_id');
            } elseif (Auth::check()) {
                $tenantId = Auth::user()->tenant_id;
            }

            if ($tenantId && !$model->tenant_id) {
                $model->tenant_id = $tenantId;
            }
        });
    }

    /**
     * Relationship to Tenant
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
