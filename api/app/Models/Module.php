<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Module extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_active',
    ];

    public function tenants()
    {
        return $this->belongsToMany(Tenant::class, 'tenant_modules')
            ->withPivot(['is_enabled', 'config'])
            ->withTimestamps();
    }
}
