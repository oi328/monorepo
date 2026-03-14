<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SystemNotification extends Notification
{
    use Queueable;

    protected $title;
    protected $message;
    protected $data;

    /**
     * Create a new notification instance.
     */
    public function __construct($title, $message, $data = [])
    {
        $this->title = $title;
        $this->message = $message;
        $this->data = $data;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'data' => $this->data,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
