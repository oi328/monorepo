<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\PasswordChangedNotification;
use Illuminate\Support\Facades\Log;

class PasswordResetController extends Controller
{
    public function sendResetLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // 1. Identify Tenant
        $tenant = app('tenant');
        if (!$tenant) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        // 2. Find User within Tenant
        // We do NOT return "User not found" to prevent enumeration.
        $user = User::where('email', $request->email)
                    ->where('tenant_id', $tenant->id)
                    ->first();

        if ($user) {
            if (strcasecmp($user->status ?? '', 'Inactive') === 0) {
                return response()->json(['message' => 'Password reset is disabled for inactive accounts.'], 403);
            }
            // 3. Generate Token
            $token = Str::random(64);

            // 4. Store Token
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $request->email],
                [
                    'email' => $request->email,
                    'token' => $token, // Storing plain token as per standard Laravel, or could hash it. 
                                       // Laravel's default PasswordBroker hashes it, but we are building custom.
                                       // For simplicity and matching the requirement "token (VARCHAR)", we store it directly.
                                       // If we want to be extra secure, we can hash it, but then we need to send the plain one.
                    'created_at' => Carbon::now()
                ]
            );

            // 5. Send Notification
            try {
                // Use Origin header if available to preserve port (e.g. localhost:3000)
                $origin = $request->header('Origin');
                if ($origin) {
                    $tenantDomain = str_replace(['http://', 'https://'], '', $origin);
                } else {
                    $tenantDomain = $request->getHost();
                }
                
                $user->notify(new ResetPasswordNotification($token, $user->email, $tenantDomain));
            } catch (\Exception $e) {
                Log::error('Password reset email failed: ' . $e->getMessage());
                return response()->json(['message' => 'Unable to send reset link.'], 500);
            }
        }

        // Always return success
        return response()->json(['message' => 'If your email is registered, you will receive a password reset link.']);
    }

    public function reset(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|confirmed|min:8',
        ]);

        // 1. Identify Tenant
        $tenant = app('tenant');
        if (!$tenant) {
            return response()->json(['message' => 'Tenant context missing.'], 400);
        }

        // 2. Validate Token
        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('token', $request->token)
            ->first();

        if (!$resetRecord) {
            return response()->json(['message' => 'Invalid token.'], 400);
        }

        // 3. Check Expiration (60 minutes)
        if (Carbon::parse($resetRecord->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'Token expired.'], 400);
        }

        // 4. Find User (Tenant Scoped)
        $user = User::where('email', $request->email)
                    ->where('tenant_id', $tenant->id)
                    ->first();

        if (!$user) {
             return response()->json(['message' => 'User not found.'], 404);
        }

        if (strcasecmp($user->status ?? '', 'Inactive') === 0) {
            return response()->json(['message' => 'Password reset is disabled for inactive accounts.'], 403);
        }

        // 5. Update Password
        $user->forceFill([
            'password' => Hash::make($request->password)
        ])->save();

        // 6. Security Walls:
        // A. Log Out From All Sessions (Invalidate Tokens)
        // This forces re-login on all devices, including the attacker if they managed to get a session.
        $user->tokens()->delete();

        // B. Send Password Changed Notification
        // This alerts the real user immediately if they didn't initiate the change.
        try {
            // Use Origin header if available to preserve port
            $origin = $request->header('Origin');
            if ($origin) {
                $tenantDomain = str_replace(['http://', 'https://'], '', $origin);
            } else {
                $tenantDomain = $request->getHost();
            }
            
            $user->notify(new PasswordChangedNotification($tenantDomain));
        } catch (\Exception $e) {
             Log::error('Password changed notification failed: ' . $e->getMessage());
        }

        // 7. Delete Token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Password reset successfully.']);
    }
}
