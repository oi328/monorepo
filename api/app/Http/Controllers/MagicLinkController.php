<?php

namespace App\Http\Controllers;

use App\Mail\MagicLinkEmail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Auth;

class MagicLinkController extends Controller
{
    /**
     * Send the magic link to the user.
     */
    public function send(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $user = User::where('email', $request->email)->first();

        // Generate temporary signed URL (valid for 15 minutes)
        // We include the user ID in the signature
        $url = URL::temporarySignedRoute(
            'magic.verify',
            now()->addMinutes(15),
            ['id' => $user->id]
        );

        // In a real app, you might want to queue this mail
        Mail::to($user->email)->send(new MagicLinkEmail($url));

        return response()->json([
            'message' => 'Magic link sent to your email.',
        ]);
    }

    /**
     * Verify the magic link and log the user in.
     */
    public function verify(Request $request, $id)
    {
        if (!$request->hasValidSignature()) {
            return response()->json(['message' => 'Invalid or expired magic link.'], 403);
        }

        $user = User::findOrFail($id);

        // Log the user in (Session based)
        Auth::login($user);

        // Log the user in (Token based)
        // If using Sanctum (SPA), we generate a token
        $token = $user->createToken('magic-link-token')->plainTextToken;

        // If the request expects JSON, return the token directly
        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Login successful.',
                'token' => $token,
                'user' => $user
            ]);
        }

        // If it's a browser click (not API client), redirect to frontend
        // Assuming frontend URL is in config or env
        // e.g., FRONTEND_URL=https://app.besouhoula.com
        // We append the token to the URL so the frontend can store it
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
        return redirect()->away($frontendUrl . '/auth/callback?token=' . $token);
    }
}
