<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\Multitenancy\Models\Tenant as BaseTenant;

class Tenant extends BaseTenant
{
    use HasFactory, LogsActivity;

    protected $connection = 'landlord';

    protected $fillable = [
        'name',
        'slug',
        'subscription_plan',
        'company_type',
        'users_limit',
        'start_date',
        'end_date',
        'domain',
        'website_url',
        'status',
        'profile',
        'country',
        'city',
        'state',
        'address_line_1',
        'address_line_2',
        'tenancy_type',
        'db_connection_details',
        'meta_data',
    ];

    protected $casts = [
        'profile' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
        'db_connection_details' => 'array',
        'meta_data' => 'array',
    ];

    public function modules()
    {
        return $this->belongsToMany(Module::class , 'tenant_modules')
            ->withPivot(['is_enabled', 'config'])
            ->withTimestamps();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'domain', 'status'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "Tenant has been {$eventName}");
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function backups()
    {
        return $this->hasMany(TenantBackup::class);
    }

    public function owner()
    {
        return $this->hasOne(User::class)->oldestOfMany();
    }

    public function getDatabaseName(): string
    {
        if ($this->tenancy_type === 'dedicated' && is_array($this->db_connection_details)) {
            return (string)($this->db_connection_details['database'] ?? '');
        }

        return (string)($this->database ?? config('database.connections.landlord.database') ?? config('database.connections.mysql.database'));
    }
}
