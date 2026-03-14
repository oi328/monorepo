<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class MetaConnection extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'fb_user_id',
        'user_access_token',
        'expires_at',
        'name',
        'email',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function businesses()
    {
        return $this->hasMany(MetaBusiness::class, 'connection_id');
    }
}
