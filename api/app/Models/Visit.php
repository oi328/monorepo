<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Visit extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'lead_id',
        'customer_id',
        'task_id',
        'type',
        'sales_person_id',
        'sales_person_name',
        'customer_name',
        'check_in_at',
        'check_out_at',
        'check_in_lat',
        'check_in_lng',
        'check_in_address',
        'check_out_lat',
        'check_out_lng',
        'check_out_address',
        'status',
        'created_by',
        'updated_by',
        'meta_data',
    ];

    protected $casts = [
        'check_in_at' => 'datetime',
        'check_out_at' => 'datetime',
        'meta_data' => 'array',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function salesPerson()
    {
        return $this->belongsTo(User::class, 'sales_person_id');
    }
}

