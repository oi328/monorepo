<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Export extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'module',
        'action',
        'file_name',
        'format',
        'status',
        'filters',
        'error_message',
        'meta_data',
    ];

    protected $casts = [
        'meta_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

