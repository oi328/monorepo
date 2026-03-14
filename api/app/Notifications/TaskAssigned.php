<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class TaskAssigned extends Notification implements ShouldBroadcast
{
    use Queueable, ChecksNotificationSettings;

    public $task;
    public $assignerName;

    public function __construct($task, $assignerName = 'System')
    {
        $this->task = $task;
        $this->assignerName = $assignerName;
    }

    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['database', 'broadcast']);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'task_id' => $this->task->id,
            'title' => $this->task->title,
            'due_date' => $this->task->due_date,
            'assigned_by' => $this->assignerName,
            'message' => "Task '{$this->task->title}' assigned to you.",
            'link' => "/tasks/{$this->task->id}"
        ];
    }
}
