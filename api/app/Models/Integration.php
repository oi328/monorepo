<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Integration extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'provider',
        'status',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    /**
     * Get the tenant that owns the integration.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
