<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ErpSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'provider',
        'base_url',
        'auth_type',
        'api_key',
        'username',
        'password',
        'sync_settings',
        'field_mappings',
        'advanced_settings',
    ];

    protected $casts = [
        'api_key' => 'encrypted',
        'password' => 'encrypted',
        'sync_settings' => 'array',
        'field_mappings' => 'array',
        'advanced_settings' => 'array',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
