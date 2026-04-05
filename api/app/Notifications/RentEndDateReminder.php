<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

use App\Traits\ChecksNotificationSettings;

class RentEndDateReminder extends Notification
{
    use Queueable, ChecksNotificationSettings;

    public $rent;

    public function __construct($rent)
    {
        $this->rent = $rent;
    }

    public function via(object $notifiable): array
    {
        return $this->determineChannels($notifiable, ['database']);
    }

    public function toArray(object $notifiable): array
    {
        $unitName = 'Unknown Unit';
        $endDate = null;
        $link = '#';

        // Handle LeadAction
        if ($this->rent instanceof \App\Models\LeadAction) {
            $details = $this->rent->details;
            if (isset($details['unit_id'])) {
                $unit = \App\Models\Unit::find($details['unit_id']);
                if ($unit) $unitName = $unit->name;
            }
            $endDate = $details['rent_end_date'] ?? null;
            $link = "/leads?lead_id={$this->rent->lead_id}&action_id={$this->rent->id}";
        } 
        // Handle potential Rent model (legacy support)
        elseif (isset($this->rent->unit)) {
            $unitName = $this->rent->unit->name ?? 'Unknown Unit';
            $endDate = $this->rent->end_date;
            $link = "/rents/{$this->rent->id}";
        }

        return [
            'rent_id' => $this->rent->id,
            'unit_name' => $unitName,
            'end_date' => $endDate,
            'message' => "Rent for unit {$unitName} is ending on {$endDate}.",
            'link' => $link
        ];
    }
}
