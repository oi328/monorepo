<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class PasswordChangedNotification extends Notification
{
    use Queueable, ChecksNotificationSettings;

    public $tenantDomain;

    /**
     * Create a new notification instance.
     */
    public function __construct($tenantDomain)
    {
        $this->tenantDomain = $tenantDomain;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['mail'], 'password_change_alert');
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $protocol = request()->secure() ? 'https://' : 'http://';
        // Link to start recovery (forgot password page)
        $url = $protocol . $this->tenantDomain . '/forgot-password';

        return (new MailMessage)
            ->subject('تم تغيير كلمة المرور - Besouhola CRM')
            ->greeting('مرحباً ' . $notifiable->name . '،')
            ->line('لقد تم تغيير كلمة السر لحسابك في Besouhola بنجاح.')
            ->line('إذا لم تقم أنت بهذا الإجراء، فهذا يعني أن حسابك قد يكون في خطر.')
            ->line('يرجى الضغط فوراً على الرابط أدناه لتأمين حسابك أو التواصل مع مدير النظام.')
            ->action('تأمين حسابي / استرداد كلمة المرور', $url)
            ->line('شكراً لاستخدامك Besouhola CRM.');
    }
}
