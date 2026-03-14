<?php

namespace App\Notifications;

use App\Models\LeadAction;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Traits\ChecksNotificationSettings;

class LeadActionCommentNotification extends Notification
{
    use Queueable, ChecksNotificationSettings;

    public $action;
    public $commenter;
    public $commentContent;

    /**
     * Create a new notification instance.
     */
    public function __construct(LeadAction $action, User $commenter, string $commentContent)
    {
        $this->action = $action;
        $this->commenter = $commenter;
        $this->commentContent = $commentContent;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via($notifiable): array
    {
        // Default to database if determineChannels is not fully configured or falls back
        if (method_exists($this, 'determineChannels')) {
             return $this->determineChannels($notifiable, ['database', 'broadcast']);
        }
        return ['database', 'broadcast'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray($notifiable): array
    {
        $leadName = $this->action->lead->name ?? 'Unknown Lead';
        $actionType = $this->action->action_type ?? 'Action';
        $commenterName = $this->commenter->name ?? 'Unknown User';
        
        // Truncate comment content for notification preview
        $preview = strlen($this->commentContent) > 50 
            ? substr($this->commentContent, 0, 47) . '...' 
            : $this->commentContent;

        $message = "{$commenterName} commented on {$actionType} for {$leadName}: \"{$preview}\"";

        // Determine if it's a reply or comment on own action
        $isMyAction = $this->action->user_id == $notifiable->id;
        
        // Check comments to see if it's a reply
        $comments = $this->action->details['comments'] ?? [];
        // Ensure comments is an array
        if (!is_array($comments)) {
            $comments = json_decode($comments, true) ?? [];
        }
        
        // Get the last two comments (the new one and the one before it)
        $count = count($comments);
        $previousComment = null;
        if ($count >= 2) {
            $previousComment = $comments[$count - 2];
        }

        if ($previousComment && isset($previousComment['userId']) && $previousComment['userId'] == $notifiable->id) {
            $message = "{$commenterName} replied to your comment on {$actionType} for {$leadName}: \"{$preview}\"";
        } elseif ($isMyAction) {
            $message = "{$commenterName} commented on your {$actionType} for {$leadName}: \"{$preview}\"";
        }

        return [
            'action_id' => $this->action->id,
            'lead_id' => $this->action->lead_id,
            'lead_name' => $leadName,
            'type' => 'comment', // Notification type identifier for frontend
            'title' => "New Comment on {$actionType}",
            'message' => $message,
            'comment_content' => $this->commentContent,
            'commenter_name' => $commenterName,
            'commenter_id' => $this->commenter->id,
            'link' => "/leads?lead_id={$this->action->lead_id}&action_id={$this->action->id}"
        ];
    }
}
