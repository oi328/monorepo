<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'lead_id',
        'from',
        'to',
        'subject',
        'body',
        'direction',
        'status',
        'message_id',
        'raw',
    ];

    protected $casts = [
        'raw' => 'array',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }
}
