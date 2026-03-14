<?php

namespace App\Http\Controllers;

use App\Models\ShareLink;
use Illuminate\Http\Request;

class ShareLinkPageController extends Controller
{
    public function show(Request $request, string $token)
    {
        $shareLink = ShareLink::where('token', $token)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            })
            ->first();

        if (!$shareLink) {
            return response()->view('share-link', [
                'title' => 'Link unavailable',
                'description' => 'This link is invalid or has expired.',
                'image' => null,
                'url' => $request->fullUrl(),
                'redirectUrl' => null,
            ], 404);
        }

        $payload = is_array($shareLink->payload) ? $shareLink->payload : [];
        $title = (string) ($payload['title'] ?? $payload['project']['name'] ?? $payload['property']['name'] ?? 'Shared Link');
        $description = (string) ($payload['description'] ?? '');
        $cover = $payload['cover'] ?? $payload['project']['image'] ?? $payload['property']['mainImage'] ?? null;
        $image = null;

        if (is_string($cover) && $cover !== '') {
            if (preg_match('/^https?:\/\//i', $cover)) {
                $image = $cover;
            } elseif (str_starts_with($cover, '/')) {
                $image = $request->getSchemeAndHttpHost() . $cover;
            } else {
                $image = $request->getSchemeAndHttpHost() . '/' . $cover;
            }
        }

        $company = (string) ($request->query('company', ''));
        $companyQuery = $company !== '' ? ('&company=' . urlencode($company)) : '';
        $redirectUrl = $request->getSchemeAndHttpHost() . '/#/landing-preview?token=' . urlencode($token) . $companyQuery;

        return view('share-link', [
            'title' => $title,
            'description' => $description,
            'image' => $image,
            'url' => $request->fullUrl(),
            'redirectUrl' => $redirectUrl,
        ]);
    }
}

