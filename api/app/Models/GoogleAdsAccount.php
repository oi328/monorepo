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
        'account_name',
        'google_ads_id',
        'email',
        'access_token',
        'refresh_token',
        'expires_at',
        'is_mock',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_mock' => 'boolean',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
