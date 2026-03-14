<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class MetaIntegration extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'ad_account_id',
        'pixel_id',
        'page_id',
        'page_access_token',
        'user_access_token',
        'long_lived_token',
        'token_expires_at',
        'settings',
    ];

    protected $casts = [
        'token_expires_at' => 'datetime',
        'settings' => 'array',
    ];
}
