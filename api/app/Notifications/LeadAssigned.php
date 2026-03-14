<?php

namespace App\Notifications;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Traits\ChecksNotificationSettings;

class LeadAssigned extends Notification implements ShouldBroadcast
{
    use Queueable, ChecksNotificationSettings;

    public $lead;
    public $assignerName;

    /**
     * Create a new notification instance.
     */
    public function __construct(Lead $lead, $assignerName = 'System')
    {
        $this->lead = $lead;
        $this->assignerName = $assignerName;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['database', 'broadcast']);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'lead_id' => $this->lead->id,
            'lead_name' => $this->lead->name,
            'assigned_by' => $this->assignerName,
            'assigned_to_id' => $this->lead->assigned_to,
            'assigned_to_name' => $this->lead->assignedAgent?->name,
            'title' => 'Lead Assigned',
            'message' => "Lead '{$this->lead->name}' has been assigned to {$this->lead->assignedAgent?->name}.",
            'link' => "/leads/{$this->lead->id}"
        ];
    }
}
