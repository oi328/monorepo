<?php

namespace App\Events;

use App\Models\LeadAction;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadActionCommented implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $action;
    public $comment;
    public $commenter;

    /**
     * Create a new event instance.
     */
    public function __construct(LeadAction $action, array $comment, $commenter)
    {
        $this->action = $action;
        $this->comment = $comment;
        $this->commenter = $commenter;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('leads.' . $this->action->lead_id),
        ];
    }

    public function broadcastAs()
    {
        return 'comment.added';
    }

    public function broadcastWith()
    {
        return [
            'action_id' => $this->action->id,
            'lead_id' => $this->action->lead_id,
            'comment' => $this->comment,
            'commenter' => [
                'id' => $this->commenter->id,
                'name' => $this->commenter->name,
                'role' => $this->commenter->role
            ]
        ];
    }
}
