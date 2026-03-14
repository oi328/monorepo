<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class RequestCreated extends Notification
{
    use Queueable, ChecksNotificationSettings;

    public $request;
    public $creatorName;

    public function __construct($request, $creatorName = 'System')
    {
        $this->request = $request;
        $this->creatorName = $creatorName;
    }

    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['database']);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'request_id' => $this->request->id,
            'type' => $this->request->type ?? 'General',
            'created_by' => $this->creatorName,
            'message' => "New request created: {$this->request->type}",
            'link' => "/requests/{$this->request->id}"
        ];
    }
}
