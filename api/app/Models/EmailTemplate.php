<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'related',
        'subject',
        'body',
        'status',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
