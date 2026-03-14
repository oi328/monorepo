<?php

namespace App\Models;

use Spatie\Activitylog\Models\Activity as SpatieActivity;
use App\Models\Scopes\TenantActivityScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

class Activity extends SpatieActivity
{
    protected $fillable = [
        'log_name',
        'description',
        'subject_type',
        'event',
        'subject_id',
        'causer_type',
        'causer_id',
        'properties',
        'batch_uuid',
        'tenant_id',
    ];

    /**
     * The "booted" method of the model.
     *
     * @return void
     */
    protected static function booted()
    {
        static::addGlobalScope(new TenantActivityScope);

        static::creating(function ($activity) {
            // Automatically set tenant_id if not already set
            if (empty($activity->tenant_id)) {
                if (Auth::check() && Auth::user()->tenant_id) {
                    $activity->tenant_id = Auth::user()->tenant_id;
                }
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
