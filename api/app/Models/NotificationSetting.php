<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'system_notifications',
        'app_notifications',
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
        'notify_assigned_leads',
        'notify_delay_leads',
        'notify_requests',
        'notify_rent_end_date',
        'notify_add_customer',
        'notify_create_invoice',
        'notify_open_ticket',
        'notify_campaign_expired',
        'notify_task_assigned',
        'notify_task_expired',
        'meta_data',
    ];

    protected $casts = [
        'meta_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
