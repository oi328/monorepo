<?php

namespace App\Jobs;

use App\Services\MetaCampaignService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncMetaCampaigns implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $tenantId;

    /**
     * Create a new job instance.
     */
    public function __construct($tenantId)
    {
        $this->tenantId = $tenantId;
    }

    /**
     * Execute the job.
     */
    public function handle(MetaCampaignService $service): void
    {
        $service->syncAll($this->tenantId);
    }
}
