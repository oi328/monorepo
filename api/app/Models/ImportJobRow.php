<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportJobRow extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'row_number',
        'status',
        'reason_code',
        'reason_message',
        'raw_data',
        'normalized_data',
        'warnings',
        'entity_type',
        'created_record_id',
        'duplicate_of_id',
    ];

    protected $casts = [
        'raw_data' => 'array',
        'normalized_data' => 'array',
        'warnings' => 'array',
    ];

    public function job()
    {
        return $this->belongsTo(ImportJob::class, 'job_id');
    }
}

