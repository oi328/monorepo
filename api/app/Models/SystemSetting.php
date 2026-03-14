<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Multitenancy\Models\Concerns\UsesLandlordConnection;

class SystemSetting extends Model
{
    use UsesLandlordConnection;

    protected $guarded = ['id', 'created_at', 'updated_at'];
    
    protected $casts = [
        'is_public' => 'boolean',
    ];
}
