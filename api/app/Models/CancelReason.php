<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class CancelReason extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = ['title', 'title_ar', 'meta_data'];

    protected $casts = [
        'meta_data' => 'array',
    ];
}
