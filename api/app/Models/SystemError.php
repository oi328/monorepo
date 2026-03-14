<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemError extends Model
{
    protected $fillable = [
        'tenant_id',
        'service',
        'endpoint',
        'status',
        'level',
        'count',
        'message',
        'stack_trace',
        'last_seen_at',
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
