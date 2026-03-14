<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Campaign;

class RecalculateCampaignMetrics extends Command
{
    protected $signature = 'campaigns:recalculate {--force-spend : Force set spend for CPL campaigns to leads*cpl_cost}';

    protected $description = 'Recalculate campaign metrics: leads count from DB and optional spend for CPL campaigns';

    public function handle()
    {
        $forceSpend = $this->option('force-spend');
        $updated = 0;

        $query = Campaign::query();

        foreach ($query->cursor() as $campaign) {
            $changed = false;

            $leadsCount = method_exists($campaign, 'leadsRelation')
                ? $campaign->leadsRelation()->count()
                : 0;

            if ((int) $campaign->leads !== (int) $leadsCount) {
                $campaign->leads = $leadsCount;
                $changed = true;
            }

            $meta = $campaign->meta_data ?? [];
            if (($meta['billing_model'] ?? null) === 'cpl' && is_numeric($meta['cpl_cost'] ?? null)) {
                $expectedSpend = $leadsCount * (float) $meta['cpl_cost'];
                if ($forceSpend || (float) $campaign->spend == 0.0) {
                    $campaign->spend = $expectedSpend;
                    $changed = true;
                }
            }

            if ($changed) {
                $campaign->save();
                $updated++;
            }
        }

        $this->info("Recalculation complete. Updated {$updated} campaigns.");
        return self::SUCCESS;
    }
}
