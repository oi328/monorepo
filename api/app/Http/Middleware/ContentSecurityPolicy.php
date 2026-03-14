<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ContentSecurityPolicy
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Define CSP policy
        // Note: This policy mirrors the one in frontend/index.html to ensure consistency
        // if the backend ever serves HTML content.
        $csp = "default-src 'self'; " .
               "img-src 'self' data: blob: http: https: https://images.unsplash.com https://source.unsplash.com https://dummyimage.com https://*.tile.openstreetmap.org https://mt0.google.com https://mt1.google.com https://mt2.google.com https://mt3.google.com https://unpkg.com https://www.facebook.com https://www.google-analytics.com https://www.googletagmanager.com; " .
               "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " .
               "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com; " .
               "worker-src 'self' blob:; " .
               "child-src 'self' blob: https://maps.google.com https://www.google.com; " .
               "frame-src 'self' blob: https://maps.google.com https://www.google.com https://www.googletagmanager.com; " .
               "connect-src 'self' http: https: ws: wss: https://restcountries.com https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org https://www.google-analytics.com https://stats.g.doubleclick.net https://www.facebook.com; " .
               "font-src 'self' data: https://fonts.gstatic.com;";

        // Add CSP header to response
        if (method_exists($response, 'header')) {
            $response->header('Content-Security-Policy', $csp);
            // Add other security headers
            $response->header('X-Content-Type-Options', 'nosniff');
            $response->header('X-Frame-Options', 'SAMEORIGIN');
            $response->header('X-XSS-Protection', '1; mode=block');
        }

        return $response;
    }
}
