<?php

namespace App\Jobs;

use App\Services\MetaLeadService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Spatie\Multitenancy\Jobs\NotTenantAware;

class ProcessMetaLead implements ShouldQueue, NotTenantAware
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $tenantId;
    protected $leadId;
    protected $pageId;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @return array
     */
    public function backoff()
    {
        return [10, 30, 60];
    }

    /**
     * Create a new job instance.
     */
    public function __construct($tenantId, $leadId, $pageId = null)
    {
        $this->tenantId = $tenantId;
        $this->leadId = $leadId;
        $this->pageId = $pageId;
    }

    /**
     * Execute the job.
     */
    public function handle(MetaLeadService $service): void
    {
        // Ensure tenant context if needed by multi-tenancy package
        // tenancy()->initialize($this->tenantId); // If using stancl/tenancy or similar

        $service->processLead($this->tenantId, $this->leadId, $this->pageId);
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        \Illuminate\Support\Facades\Log::error("Meta Lead Processing Failed Permanently for Tenant {$this->tenantId}, Lead {$this->leadId}: " . $exception->getMessage());
    }
}
