<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class CampaignInsight extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'meta_campaign_id',
        'date',
        'spend',
        'impressions',
        'clicks',
        'ctr',
        'cpc',
        'cpm',
        'reach',
    ];

    protected $casts = [
        'date' => 'date',
        'spend' => 'decimal:2',
        'ctr' => 'decimal:4',
        'cpc' => 'decimal:2',
        'cpm' => 'decimal:2',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'meta_campaign_id', 'meta_id');
    }
}
