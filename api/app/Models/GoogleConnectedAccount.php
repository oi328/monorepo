<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class GoogleConnectedAccount extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'google_user_id',
        'google_email',
        'google_name',
        'access_token',
        'refresh_token',
        'expires_at',
        'connection_status',
        'is_primary',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_primary' => 'boolean',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];
}

