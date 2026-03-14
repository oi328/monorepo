<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SmtpSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'provider',
        'host',
        'port',
        'encryption',
        'username',
        'password',
        'from_email',
        'from_name',
        'reply_to',
        'signature',
        'recipients_config',
    ];

    protected $casts = [
        'password' => 'encrypted',
        'recipients_config' => 'array',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
