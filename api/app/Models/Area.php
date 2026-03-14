<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Area extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'region_id',
        'name_en',
        'name_ar',
        'status',
        'meta_data',
    ];

    protected $casts = [
        'status' => 'boolean',
        'meta_data' => 'array',
    ];

    public function region()
    {
        return $this->belongsTo(Region::class);
    }
}
