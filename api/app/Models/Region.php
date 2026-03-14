<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Region extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'city_id',
        'name_en',
        'name_ar',
        'status',
        'meta_data',
    ];

    protected $casts = [
        'status' => 'boolean',
        'meta_data' => 'array',
    ];

    public function city()
    {
        return $this->belongsTo(City::class);
    }
}
