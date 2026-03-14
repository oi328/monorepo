<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentTerm extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'days',
        'discount_rate',
        'description',
    ];

    protected $casts = [
        'days' => 'integer',
        'discount_rate' => 'float',
    ];
}
