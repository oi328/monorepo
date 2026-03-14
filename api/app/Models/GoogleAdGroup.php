<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class GoogleAdGroup extends Model
{
    use HasFactory, BelongsToTenant;

    protected $guarded = ['id'];

    protected $casts = [
        'raw_data' => 'array',
        'cpc_bid_micros' => 'decimal:0',
        'cpm_bid_micros' => 'decimal:0',
        'cpa_bid_micros' => 'decimal:0',
    ];

    public function campaign()
    {
        return $this->belongsTo(GoogleCampaign::class, 'campaign_id');
    }

    public function ads()
    {
        return $this->hasMany(GoogleAd::class, 'ad_group_id');
    }

    public function insights()
    {
        return $this->morphMany(GoogleAdInsight::class, 'google_entity');
    }
}
