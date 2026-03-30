<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class SalesInvoice extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'invoice_number',
        'customer_id',
        'customer_name',
        'customer_code',
        'sales_person',
        'order_id',
        'invoice_type',
        'issue_date',
        'due_date',
        'status',
        'subtotal',
        'tax',
        'discount',
        'total',
        'paid_amount',
        'advance_applied_amount',
        'balance_due',
        'payment_status',
        'payment_method',
        'payment_terms',
        'currency',
        'notes',
        'items',
        'created_by',
        'meta_data'
    ];

    protected $casts = [
        'items' => 'array',
        'issue_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'advance_applied_amount' => 'decimal:2',
        'balance_due' => 'decimal:2',
        'meta_data' => 'array',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function payments()
    {
        return $this->hasMany(SalesInvoicePayment::class);
    }
}
