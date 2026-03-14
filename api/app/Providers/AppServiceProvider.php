<?php

namespace App\Providers;

use App\Contracts\MetaApiClientInterface;
use App\Services\Meta\RealMetaApiClient;
use App\Services\Meta\MockMetaApiClient;
use App\Contracts\GoogleAdsApiClientInterface;
use App\Services\Google\RealGoogleAdsApiClient;
use App\Services\Google\MockGoogleAdsApiClient;
use App\Contracts\GoogleAdsServiceInterface;
use App\Services\Google\RealGoogleAdsService;
use App\Services\Google\MockGoogleAdsService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(\App\Contracts\TenantResolverInterface::class, \App\Services\TenantResolverService::class);
        $this->app->bind(\App\Contracts\AuthenticatorInterface::class, \App\Services\PasswordAuthenticator::class);
        $this->app->bind(\App\Contracts\TokenIssuerInterface::class, \App\Services\SanctumTokenIssuer::class);
        $this->app->bind(\App\Contracts\TwoFactorInterface::class, \App\Services\TwoFactorService::class);
        $this->app->bind(MetaApiClientInterface::class, function ($app) {
            $mockMode = config('services.meta.mock_mode', false);
            
            // Auto-enable mock mode if local and configured to do so
            if ($app->environment('local') && config('services.meta.mock_on_local', false)) {
                $mockMode = true;
            }

            if ($mockMode) {
                return new MockMetaApiClient();
            }

            return new RealMetaApiClient();
        });

        $this->app->bind(GoogleAdsApiClientInterface::class, function ($app) {
            $mockMode = config('services.google.ads.mock_mode', false);
            
            // Auto-enable mock mode if local and configured to do so
            if ($app->environment('local') && config('services.google.ads.mock_on_local', false)) {
                $mockMode = true;
            }

            if ($mockMode) {
                return $app->make(MockGoogleAdsApiClient::class);
            }

            return $app->make(RealGoogleAdsApiClient::class);
        });

        $this->app->bind(GoogleAdsServiceInterface::class, function ($app) {
            $mockMode = config('services.google.ads.mock_mode', false);
            if ($app->environment('local') && config('services.google.ads.mock_on_local', false)) {
                $mockMode = true;
            }

            if ($mockMode) {
                return $app->make(MockGoogleAdsService::class);
            }

            return $app->make(RealGoogleAdsService::class);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (app()->environment('production')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
            $this->app['request']->server->set('HTTPS', 'on');
        }

        RateLimiter::for('api', function (Request $request) {
            $userId = $request->user()?->id;

            // Increase limit significantly to handle polling/pusher auth
            $maxAttempts = 1000; 

            return Limit::perMinute($maxAttempts)->by($userId ?: $request->ip());
        });
    }
}
