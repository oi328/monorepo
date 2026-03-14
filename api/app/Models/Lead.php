<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BelongsToTenant;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Lead extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes, LogsActivity;

    // Allow dynamic assignment of any column that exists in the database
    // This is useful for custom fields and future columns
    protected $guarded = ['id', 'created_at', 'updated_at'];
    
    // protected $fillable = [
    //     'tenant_id',
    //     'name',
    //     'email',
    //     'phone',
    //     'company',
    //     'type',
    //     'stage',
    //     'status',
    //     'priority',
    //     'source',
    //     'campaign',
    //     'assigned_to',
    //     'sales_person',
    //     'notes',
    //     'estimated_value',
    //     'attachments',
    //     'deleted_by',
    //     'project',
    //     'project_id',
    //     'item_id',
    //     'created_by',
    //     'location',
    //     'actions_data',
    //     'meta_data',
    //     // Meta Integration Fields
    //     'meta_id',
    //     'campaign_id',
    //     'campaign_id_meta',
    //     'adset_id',
    //     'adset_name',
    //     'ad_id',
    //     'ad_name',
    //     'form_id',
    //     'form_name',
    //     'is_organic',
    //     'platform',
    //     // Google Ads Fields
    //     'gcl_id',
    //     'google_campaign_id',
    //     'google_adgroup_id',
    //     'google_creative_id',
    // ];

    protected $casts = [
        'attachments' => 'array',
        'actions_data' => 'array',
        'meta_data' => 'array',
        'is_organic' => 'boolean',
    ];

    public function actions()
    {
        return $this->hasMany(LeadAction::class);
    }

    public function latestAction()
    {
        return $this->hasOne(LeadAction::class)->latestOfMany();
    }

    /**
     * Get the custom field values for the lead.
     */
    public function customFieldValues()
    {
        // We can't use a simple hasMany because FieldValue doesn't have a direct 'lead_id'.
        // It has 'record_id'.
        // And we only want values for fields that belong to 'leads' entity.
        // But since record_id is just an ID, it could clash if we had multiple tables sharing IDs.
        // However, usually we filter by field_id which is unique to the entity.
        // So: FieldValue where record_id = this->id AND field_id IN (fields for leads)
        
        return $this->hasMany(FieldValue::class, 'record_id');
    }

    public function referral()
    {
        return $this->hasOne(LeadReferral::class, 'lead_id');
    }

    public function referrals()
    {
        return $this->hasMany(LeadReferral::class, 'lead_id');
    }

    public function referralUsers()
    {
        return $this->belongsToMany(User::class, 'lead_referrals', 'lead_id', 'user_id')
            ->withTimestamps()
            ->withPivot('tenant_id', 'referrer_id');
    }

    public function assignedAgent()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function deletedByUser()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function campaignRelation()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['stage', 'status', 'assigned_to', 'manager_id', 'name', 'phone', 'email', 'company'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "Lead has been {$eventName}");
    }
}
