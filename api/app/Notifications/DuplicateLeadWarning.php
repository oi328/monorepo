<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;
use App\Models\Lead;

class DuplicateLeadWarning extends Notification
{
    public $duplicateLead;
    public $originalLead;

    /**
     * Create a new notification instance.
     */
    public function __construct(Lead $duplicateLead, Lead $originalLead)
    {
        $this->duplicateLead = $duplicateLead;
        $this->originalLead = $originalLead;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Duplicate Lead Warning',
            'message' => "Lead '{$this->duplicateLead->name}' is a duplicate of '{$this->originalLead->name}'. Please check.",
            'lead_id' => $this->duplicateLead->id,
            'original_lead_id' => $this->originalLead->id,
            'link' => "/leads?lead_id={$this->duplicateLead->id}", // Deep link to the lead modal
            'type' => 'warning'
        ];
    }
    
    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
