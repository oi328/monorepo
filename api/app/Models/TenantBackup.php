<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TenantBackup extends Model
{
    protected $fillable = [
        'tenant_id',
        'type',
        'disk',
        'path',
        'status',
        'source',
        'engine',
        'size_bytes',
        'error_message',
        'started_at',
        'finished_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}

