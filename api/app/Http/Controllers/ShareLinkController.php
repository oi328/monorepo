<?php

namespace App\Http\Controllers;

use App\Models\ShareLink;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ShareLinkController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'payload' => ['required', 'array'],
            'expires_in_days' => ['nullable', 'integer', 'min:1', 'max:30'],
        ]);

        $days = (int) ($validated['expires_in_days'] ?? 14);
        $expiresAt = now()->addDays($days);

        do {
            $token = Str::random(32);
        } while (ShareLink::where('token', $token)->exists());

        $shareLink = ShareLink::create([
            'token' => $token,
            'payload' => $validated['payload'],
            'expires_at' => $expiresAt,
            'created_by' => Auth::id(),
        ]);

        return response()->json([
            'data' => [
                'token' => $shareLink->token,
                'expires_at' => optional($shareLink->expires_at)->toISOString(),
            ],
        ], 201);
    }

    public function show(Request $request, string $token)
    {
        $shareLink = ShareLink::where('token', $token)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            })
            ->first();

        if (!$shareLink) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        return response()->json([
            'data' => $shareLink->payload,
        ]);
    }
}

