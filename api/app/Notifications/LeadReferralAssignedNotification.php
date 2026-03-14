<?php

namespace App\Notifications;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Traits\ChecksNotificationSettings;

class LeadReferralAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable, ChecksNotificationSettings;

    public $lead;
    public $assigner;

    /**
     * Create a new notification instance.
     */
    public function __construct(Lead $lead, User $assigner)
    {
        $this->lead = $lead;
        $this->assigner = $assigner;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via($notifiable): array
    {
        if (method_exists($this, 'determineChannels')) {
            return $this->determineChannels($notifiable, ['database', 'broadcast']);
        }
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray($notifiable): array
    {
        return [
            'lead_id' => $this->lead->id,
            'lead_name' => $this->lead->name,
            'assigner_id' => $this->assigner->id,
            'assigner_name' => $this->assigner->name,
            'type' => 'referral_assigned',
            'title' => 'New Referral Assignment',
            'message' => "You have been assigned as Referral Supervisor for Lead: {$this->lead->name}",
            'link' => "/leads/referral?lead_id={$this->lead->id}", // Deep link to referral leads page
        ];
    }
}
