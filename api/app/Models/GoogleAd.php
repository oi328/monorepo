<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class GoogleAd extends Model
{
    use HasFactory, BelongsToTenant;

    protected $guarded = ['id'];

    protected $casts = [
        'raw_data' => 'array',
    ];

    public function adGroup()
    {
        return $this->belongsTo(GoogleAdGroup::class, 'ad_group_id');
    }

    public function insights()
    {
        return $this->morphMany(GoogleAdInsight::class, 'google_entity');
    }
}
