<?php

namespace App\Notifications;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Notification;
use App\Traits\ChecksNotificationSettings;

class LeadCreated extends Notification implements ShouldBroadcast
{
    use Queueable, ChecksNotificationSettings;

    public Lead $lead;
    public string $actorName;

    public function __construct(Lead $lead, string $actorName = 'System')
    {
        $this->lead = $lead;
        $this->actorName = $actorName;
    }

    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['database', 'broadcast']);
    }

    public function toArray(object $notifiable): array
    {
        $leadName = $this->lead->name ?? '';
        $actorName = $this->actorName ?: 'System';
        $isActor = isset($notifiable->name) && (string)($notifiable->name ?? '') === (string)$actorName;

        return [
            'lead_id' => $this->lead->id,
            'lead_name' => $leadName,
            'created_by' => $actorName,
            'assigned_to_id' => $this->lead->assigned_to,
            'assigned_to_name' => $this->lead->assignedAgent?->name,
            'title' => 'Lead Created',
            'message' => $isActor
                ? "You created lead '{$leadName}'."
                : "Lead '{$leadName}' has been created by {$actorName}.",
            'link' => "/leads/{$this->lead->id}",
        ];
    }
}

