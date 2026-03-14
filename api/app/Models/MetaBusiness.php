<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class MetaBusiness extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'connection_id',
        'fb_business_id',
        'business_name',
    ];

    public function connection()
    {
        return $this->belongsTo(MetaConnection::class, 'connection_id');
    }

    public function adAccounts()
    {
        return $this->hasMany(MetaAdAccount::class, 'business_id');
    }
}
