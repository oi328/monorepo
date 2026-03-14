<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\User;
use App\Notifications\TicketOpened;
use App\Traits\ResolvesNotificationRecipients;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TicketController extends Controller
{
    use ResolvesNotificationRecipients;
    public function index(Request $request)
    {
        $query = Ticket::with(['department', 'assignedTo', 'customer']);

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
            'customer_id' => 'nullable|exists:customers,id',
        ]);

        $ticket = Ticket::create($validated);

        if (Auth::check()) {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $assignee = null;
            if ($ticket->assigned_to) {
                $assignee = User::with(['manager', 'team.leader'])->find($ticket->assigned_to);
            }

            $baseUser = $assignee ?: $user;
            $notification = new TicketOpened($ticket, $user->name);

            $recipients = $this->buildNotificationRecipients(
                $baseUser,
                [
                    'owner' => $user,
                    'assignee' => $assignee,
                    'assigner' => $user,
                ],
                'support',
                'notify_open_ticket'
            );

            $admins = User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                $recipients[] = $admin;
            }

            $uniqueRecipients = [];
            foreach ($recipients as $recipient) {
                if ($recipient && $recipient instanceof User) {
                    $uniqueRecipients[$recipient->id] = $recipient;
                }
            }

            foreach ($uniqueRecipients as $recipient) {
                if ($recipient->id === $user->id) {
                    continue;
                }
                try {
                    $recipient->notify($notification);
                } catch (\Throwable $e) {
                }
            }
        }

        return response()->json($ticket->load(['department', 'assignedTo', 'customer']), 201);
    }

    public function show(Ticket $ticket)
    {
        return $ticket->load(['department', 'assignedTo', 'customer']);
    }

    public function update(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'sometimes|string',
            'priority' => 'sometimes|string',
            'department_id' => 'nullable|exists:departments,id',
            'assigned_to' => 'nullable|exists:users,id',
            'customer_id' => 'nullable|exists:customers,id',
        ]);

        $ticket->update($validated);
        return response()->json($ticket->load(['department', 'assignedTo', 'customer']));
    }

    public function destroy(Ticket $ticket)
    {
        $ticket->delete();
        return response()->noContent();
    }
}
