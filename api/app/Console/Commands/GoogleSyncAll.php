<?php

namespace App\Console\Commands;

use App\Models\GoogleIntegration;
use App\Jobs\SyncGoogleCampaigns;
use Illuminate\Console\Command;

class GoogleSyncAll extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'google:sync-all';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync Google campaigns and metrics for all active integrations';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting Google Ads sync for all tenants...');

        $integrations = GoogleIntegration::where('status', true)->get();

        foreach ($integrations as $integration) {
            $this->info("Dispatching sync for tenant: {$integration->tenant_id}");
            
            SyncGoogleCampaigns::dispatch($integration->tenant_id);
        }

        $this->info('All sync jobs dispatched.');
    }
}
