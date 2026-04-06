<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LeadAction;
use App\Models\User;
use App\Notifications\LeadDelayed;
use App\Traits\ResolvesNotificationRecipients;
use Carbon\Carbon;

class CheckDelayedActions extends Command
{
    protected $signature = 'actions:check-delayed';
    protected $description = 'Check for delayed lead actions and notify users';

    use ResolvesNotificationRecipients;

    public function handle()
    {
        $now = Carbon::now(config('app.timezone'));
        // User requested 1 minute delay buffer
        $bufferTime = $now->copy()->subMinute(); 
        
        $this->info("Checking delayed actions at {$now} (Buffer: {$bufferTime})");

        // Fetch pending actions with date <= today
        // We handle time comparison in PHP for accuracy
        $actions = LeadAction::with(['lead', 'user'])
            ->withoutGlobalScope('tenant')
            // status values are stored in JSON by frontend; support common variants
            ->whereIn('details->status', ['pending', 'in_progress', 'in-progress', 'in progress'])
            ->where('details->date', '<=', $now->toDateString())
            ->get();
            
        $this->info("Found " . $actions->count() . " potential delayed actions.");

        foreach ($actions as $action) {
            $details = $action->details;
            if (isset($details['delayed_notified']) && $details['delayed_notified']) {
                // $this->info("Action {$action->id} already notified.");
                continue;
            }

            // Check if action is actually delayed
            // Parse scheduled time
            $scheduledDate = $details['date'] ?? null;
            $scheduledTimeRaw = $details['time'] ?? null;
            $scheduledTime = is_string($scheduledTimeRaw) ? trim($scheduledTimeRaw) : $scheduledTimeRaw;
            if (!$scheduledTime) {
                $scheduledTime = '00:00';
            }
            
            if (!$scheduledDate) {
                 // $this->info("Action {$action->id} missing scheduled date.");
                 continue;
            }

            try {
                // Try H:i first
                $actionDateTime = Carbon::createFromFormat('Y-m-d H:i', $scheduledDate . ' ' . $scheduledTime, config('app.timezone'));
            } catch (\Exception $e) {
                try {
                    $actionDateTime = Carbon::createFromFormat('Y-m-d H:i:s', $scheduledDate . ' ' . $scheduledTime, config('app.timezone'));
                } catch (\Exception $ex) {
                    // $this->info("Action {$action->id} failed to parse time: {$scheduledDate} {$scheduledTime}");
                    continue;
                }
            }
            
            // Check if action time + 1 minute < now
            // i.e., action is older than (now - 1 min)
            // if ($actionDateTime->greaterThan($now->copy()->subMinute())) {
            if ($actionDateTime->greaterThan($bufferTime)) {
                // Not yet delayed enough
                // $this->info("Action {$action->id} at {$actionDateTime} is not delayed enough yet (Buffer: {$bufferTime})");
                continue;
            }

            $this->info("Action {$action->id} at {$actionDateTime} is delayed! Sending notification...");

            $lead = $action->lead;
            if (!$lead) {
                continue;
            }

            if ($lead->assigned_to) {
                $assignee = User::with(['manager', 'team.leader'])->find($lead->assigned_to);
                if ($assignee) {
                    $notification = new LeadDelayed($lead, $action);
                    $recipients = $this->buildNotificationRecipients(
                        $assignee,
                        [
                            'owner' => $lead->creator,
                            'assignee' => $assignee,
                       ],
                        'leads',
                        'notify_delay_leads'
                    );

                    foreach ($recipients as $userRecipient) {
                        try {
                            $userRecipient->notify($notification);
                            $this->info("Sent delayed notification for action #{$action->id} to user {$userRecipient->id}");
                        } catch (\Throwable $e) {
                            $this->error("Failed to notify user {$userRecipient->id}: " . $e->getMessage());
                        }
                    }
                }
            }

            $details['delayed_notified'] = true;
            $action->details = $details;
            $action->saveQuietly();
        }

        $this->info('Checked delayed actions.');
    }
}
