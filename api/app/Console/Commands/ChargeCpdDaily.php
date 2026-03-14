<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\CampaignBillingService;

class ChargeCpdDaily extends Command
{
    protected $signature = 'campaigns:charge-cpd';

    protected $description = 'Charge daily CPD spend for active campaigns with billing_model=cpd';

    public function handle(CampaignBillingService $billing)
    {
        $count = $billing->chargeCpdDaily();
        $this->info("Charged CPD for {$count} campaigns.");
        return self::SUCCESS;
    }
}
