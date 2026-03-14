<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Stage extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'name',
        'name_ar',
        'type',
        'order',
        'color',
        'icon',
        'tenant_id',
        'meta_data'
    ];

    protected $casts = [
        'meta_data' => 'array',
    ];
}
