<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportJob extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'uploaded_by',
        'module',
        'file_name',
        'source',
        'status',
        'started_at',
        'finished_at',
        'total_rows',
        'success_rows',
        'failed_rows',
        'duplicate_rows',
        'skipped_rows',
        'warning_rows',
        'meta_data',
    ];

    protected $casts = [
        'meta_data' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function rows()
    {
        return $this->hasMany(ImportJobRow::class, 'job_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

