<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class GoogleAdInsight extends Model
{
    use HasFactory, BelongsToTenant;

    protected $guarded = ['id'];

    protected $casts = [
        'date' => 'date',
        'cost_micros' => 'decimal:0',
        'conversions' => 'decimal:2',
        'conversion_value' => 'decimal:2',
        'ctr' => 'double',
        'average_cpc' => 'double',
    ];

    public function googleEntity()
    {
        return $this->morphTo();
    }
}
