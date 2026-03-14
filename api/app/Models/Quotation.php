<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Quotation extends Model
{
    use HasFactory, BelongsToTenant;

    protected $guarded = ['id'];

    protected $casts = [
        'items' => 'array',
        'date' => 'date',
        'valid_until' => 'date',
        'subtotal' => 'decimal:2',
        'total' => 'decimal:2',
        'meta_data' => 'array',
    ];

    public function customer()
    {
        // Assuming customer_id stores the ID from customers table. 
        // If it stores code, this relationship might need adjustment or be purely informational.
        // For now, let's assume standard relationship if possible, but frontend sends 'code'.
        // We'll handle the logic in controller.
        return $this->belongsTo(Customer::class, 'customer_id');
    }
}
