<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Order extends Model
{
    use HasFactory, BelongsToTenant, LogsActivity;

    protected $fillable = [
        'tenant_id',
        'uuid',
        'status',
        'amount',
        'customer_code',
        'customer_id',
        'customer_name',
        'sales_person',
        'items',
        'delivery_date',
        'payment_terms',
        'created_by',
        'quotation_id',
        'discount_rate',
        'tax',
        'total',
        'notes',
        'confirmed_at',
        'shipped_at',
        'cancel_reason',
        'hold_reason',
        'meta_data'
    ];

    protected $casts = [
        'items' => 'array',
        'delivery_date' => 'date',
        'confirmed_at' => 'datetime',
        'shipped_at' => 'datetime',
        'amount' => 'decimal:2',
        'total' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount_rate' => 'decimal:2',
        'meta_data' => 'array',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'total', 'customer_name'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "Order has been {$eventName}");
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
