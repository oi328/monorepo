<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class TicketOpened extends Notification
{
    use Queueable, ChecksNotificationSettings;

    public $ticket;
    public $creatorName;

    public function __construct($ticket, $creatorName = 'System')
    {
        $this->ticket = $ticket;
        $this->creatorName = $creatorName;
    }

    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['database']);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'ticket_id' => $this->ticket->id,
            'subject' => $this->ticket->subject,
            'priority' => $this->ticket->priority ?? 'normal',
            'created_by' => $this->creatorName,
            'message' => "New ticket opened: {$this->ticket->subject}",
            'link' => "/tickets/{$this->ticket->id}"
        ];
    }
}
