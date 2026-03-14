<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Opportunity extends Model
{
    use HasFactory, BelongsToTenant;

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:2',
        'expected_close_date' => 'date',
        'meta_data' => 'array',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}
