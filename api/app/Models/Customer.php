<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Customer extends Model
{
    use BelongsToTenant;

    protected $guarded = [];

    protected $casts = [
        'meta_data' => 'array',
    ];

    public function customFieldValues()
    {
        return $this->hasMany(FieldValue::class, 'record_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
