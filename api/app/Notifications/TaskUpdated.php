<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Notification;
use App\Traits\ChecksNotificationSettings;

class TaskUpdated extends Notification implements ShouldBroadcast
{
    use Queueable, ChecksNotificationSettings;

    public $task;
    public $actorName;
    public $changes;

    public function __construct($task, $actorName = 'System', $changes = [])
    {
        $this->task = $task;
        $this->actorName = $actorName;
        $this->changes = $changes;
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
            'updated_by' => $this->actorName,
            'message' => "Task '{$this->task->title}' has been updated by {$this->actorName}.",
            'link' => "/tasks/{$this->task->id}",
            'changes' => $this->changes
        ];
    }
}
