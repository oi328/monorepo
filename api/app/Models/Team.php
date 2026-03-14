<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'department_id',
        'name',
        'leader_id',
        'status',
        'meta_data',
    ];

    protected $casts = [
        'meta_data' => 'array',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function leader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'leader_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(User::class, 'team_id');
    }
}
