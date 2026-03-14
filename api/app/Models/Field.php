<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Field extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'entity_id', 
        'key', 
        'label_en', 
        'label_ar', 
        'placeholder_en', 
        'placeholder_ar',
        'type', 
        'required', 
        'active', 
        'can_filter', 
        'is_landing_page',
        'show_my_lead', 
        'show_sales', 
        'show_manager', 
        'is_exportable',
        'options', 
        'sort_order'
    ];

    protected $casts = [
        'required' => 'boolean',
        'active' => 'boolean',
        'can_filter' => 'boolean',
        'is_landing_page' => 'boolean',
        'show_my_lead' => 'boolean',
        'show_sales' => 'boolean',
        'show_manager' => 'boolean',
        'is_exportable' => 'boolean',
        'options' => 'array',
    ];

    public function entity()
    {
        return $this->belongsTo(Entity::class);
    }

    public function values()
    {
        return $this->hasMany(FieldValue::class);
    }
}
