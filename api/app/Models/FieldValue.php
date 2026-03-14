<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FieldValue extends Model
{
    protected $fillable = ['field_id', 'record_id', 'value'];

    public function field()
    {
        return $this->belongsTo(Field::class);
    }
}
