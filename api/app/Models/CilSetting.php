<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CilSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'driver',
        'host_name',
        'port',
        'email',
        'password',
        'encryption',
        'name',
        'cil_signature',
    ];

    protected $casts = [
        'password' => 'encrypted',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
