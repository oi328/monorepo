<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;
use Illuminate\Notifications\Messages\BroadcastMessage;

class TestNotification extends Notification
{
    use Queueable;

    public $message;

    /**
     * Create a new notification instance.
     */
    public function __construct($message)
    {
        $this->message = $message;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast', WebPushChannel::class];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->line($this->message)
            ->action('View Dashboard', url('/'))
            ->line('Thank you for using our application!');
    }

    public function toWebPush($notifiable, $notification)
    {
        return (new WebPushMessage)
            ->title('New Notification')
            ->icon('/icon.png')
            ->body($this->message)
            ->action('View App', 'view_app');
    }

    public function toBroadcast($notifiable)
    {
        return new BroadcastMessage([
            'message' => $this->message,
            'title' => 'New Notification',
        ]);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'message' => $this->message,
            'title' => 'New Notification',
        ];
    }
}
