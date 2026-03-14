<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApiKeyController extends Controller
{
    public function index(Request $request)
    {
        $tokens = $request->user()->tokens()
            ->where('name', '!=', 'auth_token')
            ->select('id', 'name', 'last_used_at', 'created_at', 'expires_at')
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json([
            'success' => true,
            'message' => 'API keys fetched successfully.',
            'data' => $tokens,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'permissions' => 'nullable|string|in:read,read_write',
            'expiration' => 'nullable|string|in:never,30d,90d',
        ]);

        $abilities = $request->permissions === 'read_write' ? ['*'] : ['read'];

        $expiresAt = null;

        $expiration = $request->input('expiration', 'never');

        if ($expiration === '30d') {
            $expiresAt = now()->addDays(30);
        } elseif ($expiration === '90d') {
            $expiresAt = now()->addDays(90);
        }
        
        $token = $request->user()->createToken($request->name, $abilities, $expiresAt);

        return response()->json([
            'success' => true,
            'message' => 'API key created successfully.',
            'data' => [
                'key' => [
                    'id' => $token->accessToken->id,
                    'name' => $token->accessToken->name,
                    'last_used_at' => null,
                    'created_at' => $token->accessToken->created_at,
                    'expires_at' => $token->accessToken->expires_at,
                ],
                'token' => $token->plainTextToken,
            ],
        ]);
    }

    public function destroy(string $id)
    {
        $request = request();
        $request->user()->tokens()->where('id', $id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Token revoked successfully',
            'data' => null,
        ]);
    }
}
