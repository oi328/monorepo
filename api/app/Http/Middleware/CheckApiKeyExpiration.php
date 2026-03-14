<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckApiKeyExpiration
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && method_exists($user, 'currentAccessToken')) {
            $token = $user->currentAccessToken();

            if (!$token) {
                 return $next($request);
            }

            // Check if token is transient (SPA session)
            if ($token instanceof \Laravel\Sanctum\TransientToken) {
                return $next($request);
            }

            // Check expiration for PersonalAccessToken
            if (isset($token->expires_at) && $token->expires_at && $token->expires_at->isPast()) {
                return response()->json([
                    'message' => 'API key has expired',
                ], 401);
            }
        }

        return $next($request);
    }
}
