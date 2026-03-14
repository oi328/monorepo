<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\User;
use App\Notifications\TaskAssigned;
use App\Notifications\TaskUpdated;
use App\Traits\ResolvesNotificationRecipients;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    use ResolvesNotificationRecipients;
    public function index(Request $request)
    {
        $query = Task::with(['department', 'assignedTo']);

        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return $query->latest()->paginate(15);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|string',
            'priority' => 'required|string',
            'department_id' => 'nullable|exists:departments,id',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'start_date' => 'nullable|date',
            'task_type' => 'nullable|string',
            'created_by_name' => 'nullable|string',
            'related_to' => 'nullable|string',
            'related_ref' => 'nullable|string',
            'tags' => 'nullable|array',
            'progress' => 'nullable|integer',
            'reminder_before' => 'nullable|string',
            'recurring' => 'nullable|string',
            'attachment' => 'nullable|file|max:10240', // Max 10MB
        ]);

        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('tasks/attachments', 'public');
            $validated['attachment'] = $path;
        }

        // Set created_by_name automatically from Auth user
        $validated['created_by_name'] = Auth::user()->name ?? 'System';
        $validated['created_by'] = Auth::id();

        $task = Task::create($validated);

        if ($task->assigned_to) {
            $assignee = User::with(['manager', 'team.leader'])->find($task->assigned_to);
            $actor = Auth::user();
            if ($assignee && $actor && $assignee->id !== $actor->id) {
                $creator = $task->created_by ? User::find($task->created_by) : null;
                $notification = new TaskAssigned($task, $actor->name ?? 'System');
                $recipients = $this->buildNotificationRecipients(
                    $assignee,
                    [
                        'owner' => $creator ?: $actor,
                        'assignee' => $assignee,
                        'assigner' => $actor,
                    ],
                    'tasks',
                    'notify_task_assigned'
                );

                foreach ($recipients as $recipient) {
                    try {
                        $recipient->notify($notification);
                    } catch (\Throwable $e) {
                    }
                }
            }
        }

        return response()->json($task->load(['department', 'assignedTo']), 201);
    }

    public function show(Task $task)
    {
        return $task->load(['department', 'assignedTo']);
    }

    public function update(Request $request, Task $task)
    {
        $oldAssignee = $task->assigned_to;
        
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string',
            'priority' => 'sometimes|string',
            'department_id' => 'nullable|exists:departments,id',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'start_date' => 'nullable|date',
            'task_type' => 'nullable|string',
            'created_by_name' => 'nullable|string',
            'related_to' => 'nullable|string',
            'related_ref' => 'nullable|string',
            'tags' => 'nullable|array',
            'progress' => 'nullable|integer',
            'reminder_before' => 'nullable|string',
            'recurring' => 'nullable|string',
            'attachment' => 'nullable|file|max:10240',
        ]);

        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('tasks/attachments', 'public');
            $validated['attachment'] = $path;
        }

        $task->update($validated);

        $actor = Auth::user();
        $changes = $task->getChanges();
        unset($changes['updated_at']);

        $notifiedUserIds = [];

        if ($task->assigned_to && $task->assigned_to != $oldAssignee) {
            $assignee = User::with(['manager', 'team.leader'])->find($task->assigned_to);
            if ($assignee && $actor && $assignee->id !== $actor->id) {
                $creator = $task->created_by ? User::find($task->created_by) : null;
                $notification = new TaskAssigned($task, $actor->name ?? 'System');
                $previousOwner = $oldAssignee ? User::find($oldAssignee) : null;
                $recipients = $this->buildNotificationRecipients(
                    $assignee,
                    [
                        'owner' => $creator ?: $actor,
                        'assignee' => $assignee,
                        'assigner' => $actor,
                        'previous_owner' => $previousOwner,
                    ],
                    'tasks',
                    'notify_task_assigned'
                );

                foreach ($recipients as $recipient) {
                    try {
                        $recipient->notify($notification);
                        $notifiedUserIds[] = $recipient->id;
                    } catch (\Throwable $e) {
                    }
                }
            }
        }

        if (!empty($changes)) {
            $updateRecipients = collect();

            // Add Creator
            if ($task->created_by && $task->created_by !== $actor->id) {
                $updateRecipients->push(User::find($task->created_by));
            }

            // Add Assignee
            if ($task->assigned_to && $task->assigned_to !== $actor->id) {
                $updateRecipients->push(User::find($task->assigned_to));
            }

            // Filter out already notified users and actor
            $updateRecipients = $updateRecipients->unique('id')->filter(function ($user) use ($notifiedUserIds, $actor) {
                return $user && !in_array($user->id, $notifiedUserIds) && $user->id !== $actor->id;
            });

            if ($updateRecipients->isNotEmpty()) {
                $notification = new TaskUpdated($task, $actor->name ?? 'System', $changes);
                foreach ($updateRecipients as $recipient) {
                    try {
                        $recipient->notify($notification);
                    } catch (\Throwable $e) {}
                }
            }
        }

        return response()->json($task->load(['department', 'assignedTo']));
    }

    public function destroy(Task $task)
    {
        $task->delete();
        return response()->noContent();
    }
}
