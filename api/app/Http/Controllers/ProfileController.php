<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Services\TenantStorageService;

class ProfileController extends Controller
{
    protected $storage;

    public function __construct(TenantStorageService $storage)
    {
        $this->storage = $storage;
    }

    public function show(Request $request)
    {
        return response()->json($request->user()->load(['roles', 'team', 'department', 'managedDepartment']));
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'avatar' => ['nullable', 'image', 'max:5120'], // Max 5MB
            'locale' => ['nullable', 'string', 'in:en,ar'],
            'timezone' => ['nullable', 'string', 'max:100'],
            'theme_mode' => ['nullable', 'string', 'in:light,dark,auto,Light,Dark,Auto'],
            'password' => ['nullable', 'confirmed', 'min:8'],
            'notification_settings' => ['nullable', 'json'],
            'security_settings' => ['nullable', 'json'],
        ]);

        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($user->avatar) {
                $this->storage->delete($user->avatar);
            }

            // Upload new avatar using TenantStorageService
            // This ensures it goes to tenants/{id}/avatars with isolation
            $result = $this->storage->upload($request->file('avatar'), 'avatars');
            $user->avatar = $result['path'];
        }

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->phone = $validated['phone'] ?? $user->phone;
        if (isset($validated['locale'])) $user->locale = $validated['locale'];
        if (isset($validated['timezone'])) $user->timezone = $validated['timezone'];
        if (isset($validated['theme_mode'])) $user->theme_mode = strtolower($validated['theme_mode']); // Normalize to lowercase
        if (isset($validated['password'])) $user->password = $validated['password'];
        if (isset($validated['notification_settings'])) $user->notification_settings = json_decode($validated['notification_settings'], true);
        if (isset($validated['security_settings'])) $user->security_settings = json_decode($validated['security_settings'], true);

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->load(['roles', 'team', 'department', 'managedDepartment'])
        ]);
    }

    /**
     * Get active sessions (devices).
     */
    public function sessions(Request $request)
    {
        $tokens = $request->user()->tokens()
            ->select('id', 'name', 'ip_address', 'location', 'user_agent', 'last_used_at', 'created_at')
            ->orderBy('last_used_at', 'desc')
            ->get();

        $currentPayload = $request->user()->currentAccessToken();
        $currentId = $currentPayload ? $currentPayload->id : null;

        $data = $tokens->map(function ($token) use ($currentId) {
            return [
                'id' => $token->id,
                'ip_address' => $token->ip_address,
                'location' => $token->location,
                'user_agent' => $token->user_agent,
                'last_used_at' => $token->last_used_at,
                'created_at' => $token->created_at,
                'is_current' => $token->id === $currentId,
            ];
        });

        return response()->json($data);
    }

    /**
     * Revoke a specific session (device).
     */
    public function revokeSession(Request $request, $id)
    {
        $request->user()->tokens()->where('id', $id)->delete();
        return response()->json(['message' => 'Session revoked successfully']);
    }
}
