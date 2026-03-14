<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Traits\BelongsToTenant;
use NotificationChannels\WebPush\HasPushSubscriptions;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles, BelongsToTenant, HasPushSubscriptions;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'tenant_id',
        'is_super_admin',
        'role_level',
        'username',
        'phone',
        'birth_date',
        'status',
        'manager_id',
        'team_id',
        'department_id',
        'avatar',
        'job_title',
        'locale',
        'timezone',
        'theme_mode',
        'notification_settings',
        'security_settings',
        'meta_data',
        'monthly_target',
        'quarterly_target',
        'yearly_target',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_super_admin' => 'boolean',
            'notification_settings' => 'array',
            'security_settings' => 'array',
            'meta_data' => 'array',
            'monthly_target' => 'decimal:2',
            'quarterly_target' => 'decimal:2',
            'yearly_target' => 'decimal:2',
            'commission_percentage' => 'decimal:2',
        ];
    }
    
    protected $appends = ['role', 'avatar_url'];

    public function getAvatarUrlAttribute()
    {
        if (!$this->avatar) return null;
        
        // Use TenantStorageService to generate secure signed URL
        try {
            return app(\App\Services\TenantStorageService::class)->getUrl($this->avatar);
        } catch (\Exception $e) {
            // Fallback for legacy or error cases
            return null;
        }
    }

    public function getRoleAttribute()
    {
        return $this->roles->first()?->name;
    }

    public function team(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function department(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function managedDepartment(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Department::class, 'manager_id');
    }

    public function ledTeam(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Team::class, 'leader_id');
    }

    public function manager(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function subordinates(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(User::class, 'manager_id');
    }

    /**
     * Get all descendants (subordinates recursively)
     * This is a simple recursive relationship helper
     */
    public function descendants()
    {
        return $this->subordinates()->with('descendants');
    }

    public function actions(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(\Spatie\Activitylog\Models\Activity::class, 'causer');
    }

    public function notificationSettings(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(NotificationSetting::class);
    }
}
