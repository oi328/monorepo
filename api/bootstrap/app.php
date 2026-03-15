<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Auth;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['prefix' => 'api', 'middleware' => ['api', 'auth:sanctum']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        if (env('DISABLE_LARAVEL_CORS', false)) {
            $middleware->remove(\Illuminate\Http\Middleware\HandleCors::class);
        }
        
        // Increase throttle limit for API to prevent 429 errors
        $middleware->throttleApi('1000,1');

        $middleware->validateCsrfTokens(except: [
            'broadcasting/auth',
            'api/broadcasting/auth',
        ]);
        
        $middleware->alias([
            'check_api_key_expiration' => \App\Http\Middleware\CheckApiKeyExpiration::class,
            'csp' => \App\Http\Middleware\ContentSecurityPolicy::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\ContentSecurityPolicy::class,
        ]);

        $middleware->api(append: [
            // \App\Http\Middleware\InitializeTenancy::class, // Moved to route middleware
            \App\Http\Middleware\ApplyTenantSmtpSettings::class,
            \App\Http\Middleware\ContentSecurityPolicy::class,
            \App\Http\Middleware\NormalizeCorsHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (Throwable $e) {
            try {
                if (app()->runningInConsole()) {
                    return;
                }

                $tenantId = null;
                if (app()->bound('current_tenant_id')) {
                    $tenantId = app('current_tenant_id');
                } elseif (Auth::check() && Auth::user()->tenant_id) {
                    $tenantId = Auth::user()->tenant_id;
                }

                // Determine error level
                $level = 'error';
                if ($e instanceof \Illuminate\Auth\AuthenticationException || $e instanceof \Illuminate\Validation\ValidationException) {
                    $level = 'warning';
                }

                // Determine status code
                $status = 500;
                if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                    $status = $e->getStatusCode();
                } elseif ($e->getCode() && is_int($e->getCode()) && $e->getCode() >= 100 && $e->getCode() < 600) {
                    $status = $e->getCode();
                }

                \App\Models\SystemError::create([
                    'tenant_id' => $tenantId,
                    'service' => request()->path(),
                    'endpoint' => request()->method() . ' ' . request()->fullUrl(),
                    'message' => $e->getMessage(),
                    'stack_trace' => $e->getTraceAsString(),
                    'status' => $status,
                    'level' => $level,
                    'last_seen_at' => now(),
                    'count' => 1,
                ]);
            } catch (\Throwable $loggingError) {
                // Fail silently to avoid infinite loop
            }
        });
    })->create();
