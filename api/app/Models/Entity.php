<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Entity extends Model
{
    protected $fillable = ['key'];

    public function fields()
    {
        return $this->hasMany(Field::class)->orderBy('sort_order');
    }
}
