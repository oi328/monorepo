<?php

namespace App\Notifications;

use App\Models\LeadAction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class UpcomingActionReminder extends Notification
{
    use Queueable, ChecksNotificationSettings;

    public $action;

    /**
     * Create a new notification instance.
     */
    public function __construct(LeadAction $action)
    {
        $this->action = $action;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['database']);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $details = $this->action->details;
        if (!is_array($details)) {
             $details = json_decode($details, true) ?? [];
        }
        $date = $details['date'] ?? '';
        $time = $details['time'] ?? '';
        $dateTime = "{$date} {$time}";

        return [
            'title' => 'Upcoming Action Reminder',
            'action_id' => $this->action->id,
            'lead_id' => $this->action->lead_id,
            'lead_name' => $this->action->lead->name ?? 'Unknown Lead',
            'type' => $this->action->action_type,
            'scheduled_at' => $dateTime,
            'message' => "Upcoming action '{$this->action->action_type}' for lead {$this->action->lead->name} at {$dateTime}",
            'link' => "/leads?lead_id={$this->action->lead_id}&action_id={$this->action->id}"
        ];
    }
}
