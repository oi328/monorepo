<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BelongsToTenant;

class LeadAction extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'lead_id',
        'tenant_id',
        'user_id',
        'action_type',
        'description',
        'stage_id_at_creation',
        'next_action_type',
        'details',
    ];

    protected $casts = [
        'details' => 'array',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Alias for backward compatibility if needed, or better to update controller
    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
