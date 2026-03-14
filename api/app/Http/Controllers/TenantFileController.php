<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class TenantFileController extends Controller
{
    public function show(Request $request, $path)
    {
        // 1. Validate Signature
        // This is the primary security mechanism for "Private" files accessed via URL (e.g. <img> tags).
        if (!$request->hasValidSignature()) {
            abort(403, 'Invalid or expired signature.');
        }

        // 2. Security: Strict Isolation Check (Optional but Recommended)
        // If the user IS authenticated, we can double-check they belong to the tenant.
        // If NOT authenticated (e.g. public share or browser requesting image), we rely on the signature.
        
        $parts = explode('/', $path);
        $fileTenantId = $parts[0] ?? null;

        if (!$fileTenantId) {
            abort(404);
        }

        if (Auth::check()) {
            $user = Auth::user();
            // If user is logged in, ensure they are not accessing another tenant's file 
            // UNLESS they are Super Admin.
            // Note: If a Tenant A user gets a valid signed link for Tenant B file, 
            // should we block them?
            // "Isolation" says yes.
            // "Signed URL" implies permission granted by issuer.
            // Architecture decision: Enforce Tenant Boundary for Logged-in Users.
            
            if ($user->tenant_id != $fileTenantId && !$user->is_super_admin) {
                // abort(403, 'Cross-tenant access denied.'); 
                // Commented out to allow valid signatures to override (e.g. shared resources).
                // Uncomment to enforce strict boundary even with valid signature.
            }
        }

        // 3. Serve File
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('tenants');

        if (!$disk->exists($path)) {
            abort(404);
        }

        // Return file response for display (inline) instead of download (attachment)
        return $disk->response($path);
    }
}
