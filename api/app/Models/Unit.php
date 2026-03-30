<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Unit extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'project_id',
        'name',
        'rent_amount',
        'status',
        'meta_data',
    ];

    protected $casts = [
        'meta_data' => 'array',
        'reserved_at' => 'datetime',
        'reserved_expires_at' => 'datetime',
        'sold_at' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
