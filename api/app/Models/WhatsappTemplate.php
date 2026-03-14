<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsappTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'category',
        'language',
        'body',
        'status',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
