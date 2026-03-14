<?php

namespace App\Services;

use App\Contracts\TokenIssuerInterface;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class SanctumTokenIssuer implements TokenIssuerInterface
{
    public function issue(User $user, Request $request): string
    {
        $newToken = $user->createToken('auth_token');
        $token = $newToken->plainTextToken;
        if ($newToken->accessToken) {
            try {
                if (
                    Schema::hasTable('personal_access_tokens') &&
                    Schema::hasColumn('personal_access_tokens', 'ip_address') &&
                    Schema::hasColumn('personal_access_tokens', 'user_agent')
                ) {
                    $newToken->accessToken->forceFill([
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent(),
                    ])->save();
                }
            } catch (\Throwable $e) {
            }
        }
        return $token;
    }
}
