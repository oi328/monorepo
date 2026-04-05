<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class NewCustomer extends Notification
{
    use Queueable, ChecksNotificationSettings;

    public $customer;
    public $creatorName;

    public function __construct($customer, $creatorName = 'System')
    {
        $this->customer = $customer;
        $this->creatorName = $creatorName;
    }

    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['database']);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'created_by' => $this->creatorName,
            'message' => "New customer '{$this->customer->name}' added by {$this->creatorName}.",
            'link' => "/customers?customer_id={$this->customer->id}"
        ];
    }
}
