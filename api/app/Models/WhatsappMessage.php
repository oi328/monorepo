<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsappMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'phone_number_id',
        'from',
        'to',
        'type',
        'direction',
        'status',
        'conversation_id',
        'message_id',
        'body',
        'raw',
    ];

    protected $casts = [
        'raw' => 'array',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
