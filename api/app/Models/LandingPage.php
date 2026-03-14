<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class LandingPage extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'campaign_id',
        'title',
        'slug',
        'description',
        'source',
        'email',
        'phone',
        'theme',
        'logo',
        'cover',
        'facebook',
        'instagram',
        'twitter',
        'linkedin',
        'header_script',
        'header_script_enabled',
        'body_script',
        'body_script_enabled',
        'pixel_id',
        'is_pixel_enabled',
        'gtm_id',
        'is_gtm_enabled',
        'is_active',
        'created_by',
        'meta_data',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'header_script_enabled' => 'boolean',
        'body_script_enabled' => 'boolean',
        'is_pixel_enabled' => 'boolean',
        'is_gtm_enabled' => 'boolean',
        'meta_data' => 'array',
    ];

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }
}
