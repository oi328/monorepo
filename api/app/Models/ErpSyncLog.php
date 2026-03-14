<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ErpSyncLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'entity',
        'action',
        'status',
        'direction',
        'message',
        'synced_at',
    ];

    protected $casts = [
        'synced_at' => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}

