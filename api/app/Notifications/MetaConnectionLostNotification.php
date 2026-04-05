<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MetaConnectionLostNotification extends Notification
{
    use Queueable;

    protected $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct($reason = null)
    {
        $this->reason = $reason;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Meta Connection Lost - Action Required')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('We detected an issue with your Meta (Facebook) connection.')
            ->line('Reason: ' . ($this->reason ?? 'Access Token Expired or Invalidated'))
            ->line('This prevents us from syncing new leads from your campaigns.')
            ->action('Reconnect Meta', url(env('FRONTEND_URL', 'http://localhost:3000') . '/marketing/meta-integration'))
            ->line('Please reconnect your account as soon as possible to resume lead syncing.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'Meta Connection Lost',
            'message' => 'Your Meta connection has expired. Please reconnect to continue syncing leads.',
            'action_url' => '/marketing/meta-integration',
            'link' => '/marketing/meta-integration',
            'type' => 'error'
        ];
    }
}
