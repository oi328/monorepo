<?php

namespace App\Services;

use App\Contracts\TwoFactorInterface;
use App\Mail\TwoFactorCodeEmail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class TwoFactorService implements TwoFactorInterface
{
    public function isEnabled(User $user): bool
    {
        $settings = $user->security_settings ?? [];
        return ($settings['two_factor_auth'] ?? false) === true;
    }

    public function generateAndSend(User $user): void
    {
        $code = (string) random_int(100000, 999999);
        $user->two_factor_code = $code;
        $user->two_factor_expires_at = now()->addMinutes(10);
        $user->save();
        try {
            Mail::to($user->email)->send(new TwoFactorCodeEmail($user, $code));
        } catch (\Throwable $e) {
            Log::error('2FA email send failed: ' . $e->getMessage());
        }
    }

    public function verify(User $user, string $code): bool
    {
        if (!$user->two_factor_code || !$user->two_factor_expires_at) {
            return false;
        }
        if ($user->two_factor_expires_at->isPast()) {
            return false;
        }
        return hash_equals((string) $user->two_factor_code, (string) $code);
    }

    public function clear(User $user): void
    {
        $user->two_factor_code = null;
        $user->two_factor_expires_at = null;
        $user->save();
    }
}
