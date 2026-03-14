<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class TenantStorageService
{
    protected $disk = 'tenants';

    /**
     * Upload a file for the current tenant.
     *
     * @param UploadedFile $file
     * @param string $folder (e.g., 'avatars', 'documents')
     * @return array ['path' => string, 'url' => string]
     */
    public function upload(UploadedFile $file, string $folder = 'general')
    {
        $tenantId = $this->resolveTenantId();
        
        // Structure: tenants/{tenant_id}/{folder}/{hash}.{ext}
        $path = $file->storeAs(
            "{$tenantId}/{$folder}",
            $file->hashName(),
            ['disk' => $this->disk]
        );

        Log::info("File uploaded for Tenant {$tenantId}", [
            'path' => $path,
            'size' => $file->getSize(),
            'mime' => $file->getMimeType(),
            'user_id' => Auth::id()
        ]);

        return [
            'path' => $path,
            'url' => $this->getUrl($path),
        ];
    }

    /**
     * Get a secure URL for the file.
     * 
     * @param string $path
     * @return string
     */
    public function getUrl(string $path)
    {
        if (config('filesystems.disks.tenants.driver') === 's3') {
            // Generate S3 Signed URL (valid for 60 minutes)
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk($this->disk);
            return $disk->temporaryUrl(
                $path,
                now()->addMinutes(60)
            );
        }

        // Local: Generate Laravel Signed Route
        // Route should be: /api/files/{path}
        // We pass the full relative path: 1/avatars/xyz.jpg
        return URL::signedRoute('tenant.files.show', ['path' => $path], now()->addMinutes(60));
    }

    /**
     * Delete a file.
     */
    public function delete(string $path)
    {
        if (Storage::disk($this->disk)->exists($path)) {
            return Storage::disk($this->disk)->delete($path);
        }
        return false;
    }

    /**
     * Resolve the current Tenant ID.
     */
    protected function resolveTenantId()
    {
        if (app()->bound('current_tenant_id')) {
            return app('current_tenant_id');
        }

        if (Auth::check()) {
            return Auth::user()->tenant_id;
        }

        throw new \Exception('No tenant context found for storage operation.');
    }
}
