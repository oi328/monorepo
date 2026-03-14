<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Ad extends Model
{
    use BelongsToTenant;

    protected $guarded = ['id'];

    protected $casts = [
        'creative' => 'array',
        'meta_data' => 'array',
        'spend' => 'decimal:2',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    public function adSet()
    {
        return $this->belongsTo(AdSet::class);
    }
}
