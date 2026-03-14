<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class City extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'country_id',
        'name_en',
        'name_ar',
        'status',
        'meta_data',
    ];

    protected $casts = [
        'status' => 'boolean',
        'meta_data' => 'array',
    ];

    public function country()
    {
        return $this->belongsTo(Country::class);
    }
}
