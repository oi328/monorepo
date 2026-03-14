<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class GoogleCampaign extends Model
{
    use HasFactory, BelongsToTenant;

    protected $guarded = ['id'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'raw_data' => 'array',
        'amount_micros' => 'decimal:0',
    ];

    public function adGroups()
    {
        return $this->hasMany(GoogleAdGroup::class, 'campaign_id');
    }

    public function insights()
    {
        return $this->morphMany(GoogleAdInsight::class, 'google_entity');
    }
}
