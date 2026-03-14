<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\TenantBackup;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use App\Jobs\RunTenantBackupJob;

class TenantBackupService
{
    public function startDedicatedDatabaseBackup(Tenant $tenant, ?string $disk = null): TenantBackup
    {
        if ($tenant->tenancy_type !== 'dedicated') {
            abort(400, 'Only dedicated tenants are supported for backups in this phase.');
        }

        $diskName = $disk ?: 'local_backups';

        if (!in_array($diskName, array_keys(config('filesystems.disks', [])), true)) {
            abort(422, 'Invalid backup disk.');
        }

        $backup = TenantBackup::create([
            'tenant_id' => $tenant->id,
            'type' => $tenant->tenancy_type,
            'disk' => $diskName,
            'status' => 'pending',
            'source' => 'database',
            'engine' => 'spatie',
            'started_at' => now(),
        ]);

        RunTenantBackupJob::dispatch($tenant, $backup);

        return $backup;
    }
}

