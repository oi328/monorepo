<?php

namespace App\Jobs;

use App\Services\MetaInsightService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncMetaInsights implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $tenantId;
    protected $days;

    /**
     * Create a new job instance.
     */
    public function __construct($tenantId, $days = 3)
    {
        $this->tenantId = $tenantId;
        $this->days = $days;
    }

    /**
     * Execute the job.
     */
    public function handle(MetaInsightService $service): void
    {
        $service->syncInsights($this->tenantId, $this->days);
    }
}
