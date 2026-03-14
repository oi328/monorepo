<?php

namespace App\Http\Controllers;

use App\Models\Developer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DeveloperController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Developer::query();
            
            // Note: BelongsToTenant trait automatically handles tenant_id filtering
            // based on the authenticated user.
            
            return response()->json($query->orderBy('developers.id', 'desc')->get());
        } catch (\Exception $e) {
            Log::error('DeveloperController Index Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch developers', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'contact_person' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:255',
                'email' => 'nullable|string|email|max:255',
                'city' => 'nullable|string|max:255',
                'status' => 'nullable|string|max:50',
                'logo' => 'nullable|string', // Accepts base64 or URL
                'project_types' => 'nullable|array',
            ]);

            // Handle Logo Upload
            if (!empty($validated['logo'])) {
                $validated['logo'] = $this->handleLogoUpload($validated['logo']);
            }

            // Explicitly set tenant_id if available on user
            $tenantId = $request->user()?->tenant_id;
            if ($tenantId) {
                $validated['tenant_id'] = $tenantId;
            }

            $developer = Developer::create($validated);
            return response()->json($developer, 201);
        } catch (\Exception $e) {
            Log::error('DeveloperController Store Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create developer', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $developer = Developer::findOrFail($id);
            
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'contact_person' => 'nullable|string|max:255',
                'phone' => 'nullable|string|max:255',
                'email' => 'nullable|string|email|max:255',
                'city' => 'nullable|string|max:255',
                'status' => 'nullable|string|max:50',
                'logo' => 'nullable|string',
                'project_types' => 'nullable|array',
            ]);

            // Handle Logo Upload
            if (!empty($validated['logo'])) {
                $validated['logo'] = $this->handleLogoUpload($validated['logo']);
            }

            $developer->update($validated);
            return response()->json($developer);
        } catch (\Exception $e) {
            Log::error('DeveloperController Update Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to update developer', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $developer = Developer::findOrFail($id);
            $developer->delete();
            return response()->json(['message' => 'Developer deleted']);
        } catch (\Exception $e) {
            Log::error('DeveloperController Destroy Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to delete developer', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle base64 logo upload.
     * 
     * @param string $logoData
     * @return string|null
     */
    private function handleLogoUpload($logoData)
    {
        if (!$logoData) return null;

        // Check if it's a base64 string (starts with data:)
        if (str_starts_with($logoData, 'data:')) {
            // Try to match the mime type
            if (preg_match('/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,/', $logoData, $type)) {
                $data = substr($logoData, strpos($logoData, ',') + 1);
                $extension = strtolower($type[1]); // jpg, png, gif, svg+xml, etc.

                // Fix extension for complex types if needed
                if ($extension === 'svg+xml') $extension = 'svg';
                if ($extension === 'jpeg') $extension = 'jpg';

                $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
                
                if (!in_array($extension, $allowed) && !in_array($type[1], ['svg+xml'])) {
                    throw new \Exception('Invalid image type: ' . $extension);
                }

                $data = base64_decode($data);
                if ($data === false) {
                    throw new \Exception('Base64 decode failed');
                }

                $fileName = 'developers/' . Str::random(40) . '.' . $extension;
                
                Storage::disk('public')->put($fileName, $data);
                
                return Storage::url($fileName);
            } else {
                // It starts with data: but didn't match our regex or isn't an image
                // Prevent saving huge string to DB
                throw new \Exception('Invalid data URL format');
            }
        }

        // If it's already a URL (e.g. existing logo), return it as is
        // But ensure it's not a massive string just in case
        if (strlen($logoData) > 2048) {
             throw new \Exception('Image data too large and not recognized as base64');
        }

        return $logoData;
    }
}
