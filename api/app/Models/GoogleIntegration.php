<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class GoogleIntegration extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'google_id',
        'google_email',
        'access_token',
        'refresh_token',
        'customer_id',
        'webhook_key',
        'expires_at',
        'status',
        'conversion_action_id',
        'conversion_currency_code',
        'conversion_value',
        'conversion_custom_variables',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'status' => 'boolean',
        'conversion_custom_variables' => 'array',
    ];
}
