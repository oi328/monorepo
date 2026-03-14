<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class AdSet extends Model
{
    use BelongsToTenant;

    protected $guarded = ['id'];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'meta_data' => 'array',
        'daily_budget' => 'decimal:2',
        'lifetime_budget' => 'decimal:2',
        'spend' => 'decimal:2',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function ads()
    {
        return $this->hasMany(Ad::class);
    }
}
