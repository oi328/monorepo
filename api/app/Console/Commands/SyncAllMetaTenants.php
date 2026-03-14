<?php

namespace App\Console\Commands;

use App\Models\Integration;
use App\Jobs\SyncMetaCampaigns;
use App\Jobs\SyncMetaInsights;
use Illuminate\Console\Command;

class SyncAllMetaTenants extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'meta:sync-all';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Dispatch sync jobs for all tenants with active Meta integrations';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Find all active integrations
        $integrations = Integration::where('provider', 'meta')
            ->where('status', 'active')
            ->get();

        $this->info("Found " . $integrations->count() . " active Meta integrations.");

        foreach ($integrations as $integration) {
            $this->info("Dispatching sync for tenant: {$integration->tenant_id}");
            SyncMetaCampaigns::dispatch($integration->tenant_id);
            SyncMetaInsights::dispatch($integration->tenant_id, 3);
        }

        $this->info("All sync jobs dispatched.");
        return 0;
    }
}
