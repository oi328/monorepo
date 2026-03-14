<?php

namespace App\Services;

use App\Models\Campaign;
use Illuminate\Support\Facades\Log;

class CampaignBillingService
{
    public function recordCpaAction(Campaign $campaign, string $action, ?float $amount = null): void
    {
        $meta = $campaign->meta_data ?? [];
        $model = $meta['billing_model'] ?? null;

        if ($model !== 'cpa') {
            return;
        }

        $cost = $amount;
        if ($cost === null) {
            $actions = $meta['cpa_actions'] ?? [];
            if (is_array($actions) && isset($actions[$action]) && is_numeric($actions[$action])) {
                $cost = (float) $actions[$action];
            } elseif (isset($meta['cpa_cost']) && is_numeric($meta['cpa_cost'])) {
                $cost = (float) $meta['cpa_cost'];
            } else {
                $cost = 0;
            }
        }

        if ($cost > 0) {
            $campaign->increment('spend', $cost);
        }

        $campaign->increment('leads');
        $campaign->refresh();
    }

    public function chargeCpdDaily(): int
    {
        $count = 0;
        $query = Campaign::withoutGlobalScope('tenant')
            ->where('status', 'Active');

        foreach ($query->cursor() as $campaign) {
            $meta = $campaign->meta_data ?? [];
            if (($meta['billing_model'] ?? null) === 'cpd') {
                $daily = $meta['cpd_daily_cost'] ?? null;
                if (is_numeric($daily) && (float)$daily > 0) {
                    $campaign->increment('spend', (float)$daily);
                    $count++;
                }
            }
        }

        return $count;
    }
}
