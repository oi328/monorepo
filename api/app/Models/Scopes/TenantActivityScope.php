<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class TenantActivityScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $builder
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return void
     */
    public function apply(Builder $builder, Model $model)
    {
        // If user is not logged in, we might not filter (e.g. system jobs), 
        // but for safety in this multi-tenant app, usually we want to be strict.
        // However, console commands might not have a user.
        
        if (Auth::check()) {
            $user = Auth::user();

            // Super Admin can see all logs (tenant_id = null usually means global, 
            // but we might want them to see everything)
            if ($user->is_super_admin) {
                // Super Admin sees everything; no filter applied.
                return;
            }

            // Regular tenant user only sees their tenant's logs
            if ($user->tenant_id) {
                $builder->where('tenant_id', $user->tenant_id);
            }
        }
    }
}
