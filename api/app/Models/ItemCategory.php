<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class ItemCategory extends Model
{
    use HasFactory, BelongsToTenant;

    protected $guarded = ['id'];

    protected $casts = [
        'meta_data' => 'array',
    ];

    public function items()
    {
        return $this->hasMany(Item::class, 'category_id');
    }
}
