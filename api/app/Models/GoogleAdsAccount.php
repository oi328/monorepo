<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class GoogleAdsAccount extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'connected_account_id',
        'account_name',
        'google_ads_id',
        'webhook_key',
        'email',
        'access_token',
        'refresh_token',
        'expires_at',
        'is_mock',
        'is_active',
        'is_primary',
        'connection_status',
        'login_customer_id',
        'currency_code',
        'timezone',
        'is_manager',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_mock' => 'boolean',
        'is_active' => 'boolean',
        'is_primary' => 'boolean',
        'is_manager' => 'boolean',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function connectedAccount()
    {
        return $this->belongsTo(GoogleConnectedAccount::class, 'connected_account_id');
    }
}
