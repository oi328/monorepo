<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class Developer extends Model
{
    use HasFactory, BelongsToTenant;

    protected $guarded = [];

    protected $casts = [
        'project_types' => 'array',
    ];

    /**
     * The tenant this developer belongs to.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
