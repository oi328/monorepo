<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Property extends Model
{
    use BelongsToTenant;

    protected $guarded = [];

    protected $casts = [
        'meta_data' => 'array',
        'amenities' => 'array',
        'images' => 'array',
        'floor_plans' => 'array',
        'documents' => 'array',
        'nearby' => 'array',
        'installment_plans' => 'array',
        'cil_attachments' => 'array',
    ];

    public function customFieldValues()
    {
        return $this->hasMany(FieldValue::class , 'record_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class , 'created_by_id');
    }
}
