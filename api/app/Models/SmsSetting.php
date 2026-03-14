<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SmsSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'provider',
        'api_key',
        'api_secret',
        'sender_id',
        'status',
        'triggers',
    ];

    protected $casts = [
        'api_key' => 'encrypted',
        'api_secret' => 'encrypted',
        'status' => 'boolean',
        'triggers' => 'array',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
