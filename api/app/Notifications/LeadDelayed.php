<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class LeadDelayed extends Notification implements ShouldBroadcast
{
    use Queueable, ChecksNotificationSettings;

    public $lead;
    public $action;

    public function __construct($lead, $action)
    {
        $this->lead = $lead;
        $this->action = $action;
    }

    public function via($notifiable)
    {
        return $this->determineChannels($notifiable, ['database', 'broadcast']);
    }

    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }

    public function toArray($notifiable)
    {
        $details = $this->action->details;
        if (!is_array($details)) {
             $details = json_decode($details, true) ?? [];
        }
        $dueDate = $details['date'] ?? null;
        
        return [
            'title' => 'Lead Action Delayed',
            'lead_id' => $this->lead->id,
            'lead_name' => $this->lead->name,
            'action_id' => $this->action->id,
            'action_type' => $this->action->action_type,
            'due_date' => $dueDate,
            'message' => "Action '{$this->action->action_type}' for lead '{$this->lead->name}' is delayed.",
            'link' => "/leads/{$this->lead->id}"
        ];
    }
}
