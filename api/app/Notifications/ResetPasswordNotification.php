<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    use Queueable;

    public $token;
    public $email;
    public $tenantDomain;

    /**
     * Create a new notification instance.
     */
    public function __construct($token, $email, $tenantDomain)
    {
        $this->token = $token;
        $this->email = $email;
        $this->tenantDomain = $tenantDomain;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        // Construct the reset URL
        // Assumes tenantDomain is the full host e.g., "tenant-a.besouhola.com"
        // or we construct it. The controller will pass the correct host.
        $protocol = request()->secure() ? 'https://' : 'http://';
        $url = $protocol . $this->tenantDomain . '/#/reset-password?token=' . $this->token . '&email=' . urlencode($this->email);

        return (new MailMessage)
            ->subject('Reset Your Password - Besouhola CRM')
            ->greeting('Hello ' . $notifiable->name . ',')
            ->line('You are receiving this email because we received a password reset request for your account.')
            ->action('Reset Password', $url)
            ->line('This password reset link will expire in 60 minutes.')
            ->line('If you did not request a password reset, no further action is required.');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}
