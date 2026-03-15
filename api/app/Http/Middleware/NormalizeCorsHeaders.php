<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class NormalizeCorsHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $request->headers->has('Origin')) {
            return $response;
        }

        $headers = $response->headers;

        foreach ([
            'access-control-allow-origin',
            'access-control-allow-credentials',
            'access-control-allow-headers',
            'access-control-allow-methods',
            'vary',
        ] as $name) {
            $all = $headers->all($name);

            if (count($all) <= 1) {
                continue;
            }

            $first = $all[0];
            if (is_array($first)) {
                $first = $first[0] ?? null;
            }

            if ($first === null) {
                continue;
            }

            $headers->set($name, $first, true);
        }

        return $response;
    }
}

