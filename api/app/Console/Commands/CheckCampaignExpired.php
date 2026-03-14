<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Campaign;
use App\Models\User;
use App\Notifications\CampaignExpired;
use App\Traits\ResolvesNotificationRecipients;
use Carbon\Carbon;

class CheckCampaignExpired extends Command
{
    protected $signature = 'campaigns:check-expired';
    protected $description = 'Check for expired campaigns';

    use ResolvesNotificationRecipients;

    public function handle()
    {
        $now = Carbon::now();

        $campaigns = Campaign::where('end_date', '<', $now)
            ->where('status', '!=', 'expired')
            ->get();

        foreach ($campaigns as $campaign) {
            $campaign->status = 'expired';
            $campaign->save();

            if ($campaign->created_by) {
                $creator = User::find($campaign->created_by);
                if ($creator) {
                    $notification = new CampaignExpired($campaign);

                    $recipients = $this->buildNotificationRecipients(
                        $creator,
                        [
                            'owner' => $creator,
                            'assignee' => $creator,
                        ],
                        'marketing',
                        'notify_campaign_expired'
                    );

                    foreach ($recipients as $recipient) {
                        try {
                            $recipient->notify($notification);
                        } catch (\Throwable $e) {
                        }
                    }
                }
            }
        }

        $this->info('Checked expired campaigns.');
    }
}
