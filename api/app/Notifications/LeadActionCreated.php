<?php

namespace App\Notifications;

use App\Models\LeadAction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class LeadActionCreated extends Notification
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
        // details is cast to array in model
        $details = $this->action->details;
        // ensure array
        if (!is_array($details)) {
             $details = json_decode($details, true) ?? [];
        }

        $createdByName = $this->action->user->name ?? 'Unknown User';
        $leadName = $this->action->lead->name ?? 'Unknown Lead';
        $actionType = $this->action->action_type ?? $this->action->type;

        return [
            'action_id' => $this->action->id,
            'lead_id' => $this->action->lead_id,
            'lead_name' => $leadName,
            'type' => $actionType,
            'status' => $details['status'] ?? 'pending',
            'description' => $this->action->description,
            'created_by_name' => $createdByName,
            'message' => "{$createdByName} added a {$actionType} for lead {$leadName}",
            'link' => "/leads?lead_id={$this->action->lead_id}&action_id={$this->action->id}"
        ];
    }
}
