<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\TenantBackup;
use App\Services\TenantBackupService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SuperAdminBackupController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $tenants = Tenant::with(['backups' => function ($q) {
            $q->latest()->limit(1);
        }])->paginate(20);

        $mapped = $tenants->through(function (Tenant $tenant) {
            $last = $tenant->backups->first();

            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'domain' => $tenant->domain,
                'tenancy_type' => $tenant->tenancy_type,
                'last_backup_status' => $last?->status,
                'last_backup_at' => $last?->finished_at,
            ];
        });

        return response()->json($mapped);
    }

    public function backupNow(Request $request, Tenant $tenant, TenantBackupService $service)
    {
        $this->authorizeSuperAdmin($request);

        $backup = $service->startDedicatedDatabaseBackup($tenant);

        return response()->json([
            'message' => 'Backup started',
            'backup' => $backup,
        ], 202);
    }

    public function listBackups(Request $request, Tenant $tenant)
    {
        $this->authorizeSuperAdmin($request);

        $backups = $tenant->backups()->latest()->paginate(20);

        return response()->json($backups);
    }

    public function download(Request $request, Tenant $tenant, TenantBackup $backup)
    {
        $this->authorizeSuperAdmin($request);

        if ($backup->tenant_id !== $tenant->id) {
            abort(404);
        }

        if (!$backup->path || !$backup->disk) {
            abort(404);
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk($backup->disk);

        if (!$disk->exists($backup->path)) {
            abort(404);
        }

        $filename = basename($backup->path);
        
        $mime = method_exists($disk, 'mimeType') ? ($disk->mimeType($backup->path) ?: 'application/octet-stream') : 'application/octet-stream';
        $stream = method_exists($disk, 'readStream') ? $disk->readStream($backup->path) : null;
        if (!$stream) {
            abort(500, 'Unable to read backup stream');
        }
        return response()->streamDownload(function() use ($stream) {
            fpassthru($stream);
            if (is_resource($stream)) {
                fclose($stream);
            }
        }, $filename, ['Content-Type' => $mime]);
    }

    protected function authorizeSuperAdmin(Request $request): void
    {
        $user = $request->user();
        if (!$user || !$user->is_super_admin) {
            abort(403, 'Unauthorized');
        }
    }
}
