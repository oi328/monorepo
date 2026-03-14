<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Revenue extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'lead_id',
        'action_id',
        'amount',
        'currency',
        'source',
        'meta_data',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'meta_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }
}

