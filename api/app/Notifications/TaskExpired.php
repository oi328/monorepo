<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class TaskExpired extends Notification implements ShouldBroadcast
{
    use Queueable, ChecksNotificationSettings;

    public $task;

    public function __construct($task)
    {
        $this->task = $task;
    }

    public function via($notifiable)
    {
        return $this->determineChannels($notifiable, ['database', 'broadcast']);
    }

    public function toArray($notifiable)
    {
        return [
            'task_id' => $this->task->id,
            'title' => $this->task->title,
            'due_date' => $this->task->due_date,
            'message' => "Task '{$this->task->title}' has expired.",
            'link' => "/tasks/{$this->task->id}"
        ];
    }
}
