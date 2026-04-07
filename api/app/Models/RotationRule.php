<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RotationRule extends Model
{
    use HasFactory;
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'type',
        'project_id',
        'item_id',
        'source',
        'regions',
        'position',
        'is_active',
    ];

    protected $casts = [
        'project_id' => 'integer',
        'item_id' => 'integer',
        'regions' => 'array',
        'position' => 'integer',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
