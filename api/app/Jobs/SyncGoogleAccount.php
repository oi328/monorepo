<?php

namespace App\Jobs;

use App\Models\GoogleAdsAccount;
use App\Services\GoogleCampaignService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncGoogleAccount implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $account;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(GoogleAdsAccount $account)
    {
        $this->account = $account;
    }

    /**
     * Execute the job.
     */
    public function handle(GoogleCampaignService $service): void
    {
        // We call syncAccount. If it throws, the job fails and will be retried.
        // This is crucial for the "Network Failure Simulation" in Mock Mode.
        Log::channel('google_ads_mock')->info("[Job] Starting sync for Account: {$this->account->id}");
        
        try {
            $service->syncAccount($this->account);
        } catch (\Exception $e) {
            Log::channel('google_ads_mock')->error("[Job] Sync Failed for Account {$this->account->id}: " . $e->getMessage());
            throw $e; // Rethrow to trigger retry
        }
    }
}
