<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LeadAction;
use App\Models\User;
use App\Models\Unit;
use App\Notifications\RentEndDateReminder;
use App\Traits\ResolvesNotificationRecipients;
use Carbon\Carbon;

class CheckRentEnd extends Command
{
    protected $signature = 'actions:check-rent-end';
    protected $description = 'Check for rent end dates';

    use ResolvesNotificationRecipients;

    public function handle()
    {
        $now = Carbon::now();
        $oneWeekFromNow = $now->copy()->addWeek();

        // Find actions of type 'rent' (or contract) that have rent_end_date
        $actions = LeadAction::with(['lead', 'user'])
            ->withoutGlobalScope('tenant')
            ->where('action_type', 'rent') // Assuming 'rent' is the key
            ->get();

        foreach ($actions as $action) {
            $details = $action->details;
            
            if (!isset($details['rent_end_date'])) {
                continue;
            }
            if (isset($details['rent_end_notified']) && $details['rent_end_notified']) {
                continue;
            }

            $endDate = Carbon::parse($details['rent_end_date']);
            
            if ($endDate->between($now, $oneWeekFromNow)) {
                $lead = $action->lead;
                if ($lead && $lead->assigned_to) {
                    $assignee = User::with(['manager', 'team.leader'])->find($lead->assigned_to);
                    if ($assignee) {
                        $notification = new RentEndDateReminder($action);

                        $recipients = $this->buildNotificationRecipients(
                            $assignee,
                            [
                                'owner' => $lead->creator,
                                'assignee' => $assignee,
                            ],
                            'customers',
                            'notify_rent_end_date'
                        );

                        foreach ($recipients as $userRecipient) {
                            try {
                                $userRecipient->notify($notification);
                            } catch (\Throwable $e) {
                            }
                        }
                    }
                }

                $details['rent_end_notified'] = true;
                $action->details = $details;
                $action->saveQuietly();
            }
        }

        $this->info('Checked rent end dates.');
    }
}
