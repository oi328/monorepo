<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Models\User;
use App\Services\ErpSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RunErpSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $tenantId,
        public ?int $actorUserId = null,
        public array $options = []
    ) {
    }

    public function handle(ErpSyncService $service): void
    {
        $tenant = Tenant::find($this->tenantId);
        if (!$tenant) return;

        // Initialize tenant context for global scopes and spatie permissions.
        try {
            setPermissionsTeamId($tenant->id);
        } catch (\Throwable $e) {
        }
        app()->instance('tenant', $tenant);
        app()->instance('current_tenant_id', $tenant->id);

        $actor = $this->actorUserId ? User::find($this->actorUserId) : null;
        $service->run($tenant, $actor, $this->options);
    }
}

