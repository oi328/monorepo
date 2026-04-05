<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Project extends Model
{
    use HasFactory, BelongsToTenant;

    protected $guarded = [];

    protected $casts = [
        'gallery_images' => 'array',
        'master_plan_images' => 'array',
        'payment_plan' => 'array',
        'cil' => 'array',
        'amenities' => 'array',
        'publish_data' => 'array',
        'lat' => 'decimal:8',
        'lng' => 'decimal:8',
        'min_price' => 'decimal:2',
        'max_price' => 'decimal:2',
        'meta_data' => 'array',
    ];

    /**
     * The user who created this project.
     */
    public function creator()
    {
        return $this->belongsTo(User::class , 'created_by');
    }

    public function properties()
    {
        return $this->hasMany(Property::class, 'project_id');
    }

    public function units()
    {
        return $this->hasMany(Unit::class, 'project_id');
    }
}
