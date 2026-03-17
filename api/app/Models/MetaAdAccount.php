<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class MetaAdAccount extends Model
{
    use BelongsToTenant;

    public static function normalizeAdAccountId(string $value): string
    {
        $v = trim($value);
        if ($v === '') {
            return $v;
        }
        return str_starts_with($v, 'act_') ? $v : ('act_' . $v);
    }

    protected $fillable = [
        'tenant_id',
        'business_id',
        'ad_account_id',
        'name',
        'currency',
        'timezone',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function business()
    {
        return $this->belongsTo(MetaBusiness::class, 'business_id');
    }

    public function pages()
    {
        return $this->hasMany(MetaPage::class, 'ad_account_id');
    }
}
