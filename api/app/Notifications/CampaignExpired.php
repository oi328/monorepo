<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class CampaignExpired extends Notification
{
    use Queueable, ChecksNotificationSettings;

    public $campaign;

    public function __construct($campaign)
    {
        $this->campaign = $campaign;
    }

    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['database']);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'campaign_id' => $this->campaign->id,
            'campaign_name' => $this->campaign->name,
            'end_date' => $this->campaign->end_date,
            'message' => "Campaign '{$this->campaign->name}' has expired.",
            'link' => "/marketing/campaigns?campaign_id={$this->campaign->id}"
        ];
    }
}
