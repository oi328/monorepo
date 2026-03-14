<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Department extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'manager_id',
        'status',
        'meta_data',
    ];

    protected $casts = [
        'meta_data' => 'array',
    ];

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    public function employees(): HasManyThrough
    {
        return $this->hasManyThrough(User::class, Team::class);
    }
}
