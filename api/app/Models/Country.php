<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Country extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name_en',
        'name_ar',
        'code',
        'status',
        'meta_data',
    ];

    protected $casts = [
        'status' => 'boolean',
        'meta_data' => 'array',
    ];
}
