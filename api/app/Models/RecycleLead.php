<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecycleLead extends Model
{
    protected $table = 'recycle_leads';

    protected $fillable = [
        'original_lead_id',
        'lead_data',
        'deleted_by',
        'deleted_at'
    ];

    protected $casts = [
        'lead_data' => 'array',
        'deleted_at' => 'datetime'
    ];

    public function deletedByUser()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }
}
