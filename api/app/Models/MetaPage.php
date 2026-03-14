<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class MetaPage extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'connection_id',
        'ad_account_id',
        'page_id',
        'page_name',
        'page_token',
        'instagram_business_account_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function adAccount()
    {
        return $this->belongsTo(MetaAdAccount::class, 'ad_account_id');
    }

    public function connection()
    {
        return $this->belongsTo(MetaConnection::class, 'connection_id');
    }
}
