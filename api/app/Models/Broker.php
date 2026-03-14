<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Broker extends Model
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
}
