<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RotationSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'allow_assign_rotation',
        'delay_assign_rotation',
        'work_from',
        'work_to',
        'delay_work_from',
        'delay_work_to',
        'reshuffle_cold_leads',
        'reshuffle_cold_leads_number',
    ];

    protected $casts = [
        'allow_assign_rotation' => 'boolean',
        'delay_assign_rotation' => 'boolean',
        'reshuffle_cold_leads' => 'boolean',
        'reshuffle_cold_leads_number' => 'integer',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
