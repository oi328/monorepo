<?php

namespace App\Jobs;

use App\Models\Tenant;
use App\Models\TenantBackup;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Throwable;

class RunTenantBackupJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public Tenant $tenant;
    public TenantBackup $backup;

    public function __construct(Tenant $tenant, TenantBackup $backup)
    {
        $this->tenant = $tenant;
        $this->backup = $backup;
    }

    public function handle(): void
    {
        $backup = $this->backup->fresh();

        if (!$backup || $backup->status !== 'pending') {
            return;
        }

        $backup->update([
            'status' => 'running',
            'started_at' => now(),
        ]);

        try {
            $this->tenant->makeCurrent();

            Artisan::call('backup:run', [
                '--only-db' => true,
                '--only-to-disk' => $backup->disk,
            ]);

            $this->tenant->forget();

            $disk = Storage::disk($backup->disk);
            $path = $this->guessLatestBackupPath($disk);
            $size = $path ? $disk->size($path) : null;

            $backup->update([
                'status' => 'success',
                'path' => $path,
                'size_bytes' => $size,
                'finished_at' => now(),
            ]);
        } catch (Throwable $e) {
            $backup->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'finished_at' => now(),
            ]);

            throw $e;
        }
    }

    protected function guessLatestBackupPath($disk): ?string
    {
        $allFiles = $disk->allFiles('Laravel');
        if (empty($allFiles)) {
            return null;
        }

        usort($allFiles, function ($a, $b) use ($disk) {
            return $disk->lastModified($b) <=> $disk->lastModified($a);
        });

        return $allFiles[0];
    }
}

