<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use App\Models\Tenant;

use App\Mail\TwoFactorCodeEmail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;

class AuthController extends Controller
{
    protected function tenantIsExpired(?\App\Models\Tenant $tenant): bool
    {
        if (!$tenant || !$tenant->end_date) return false;
        try {
            return now()->greaterThan($tenant->end_date->copy()->endOfDay());
        } catch (\Throwable $e) {
            return false;
        }
    }

    protected function subscriptionExpiredResponse(?\App\Models\Tenant $tenant)
    {
        return response()->json([
            'code' => 'subscription_expired',
            'message' => 'Subscription expired. Please renew your subscription to continue.',
            'message_ar' => 'انتهى الاشتراك. برجاء تجديد الاشتراك للمتابعة.',
            'end_date' => $tenant?->end_date?->toDateString(),
        ], 403);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'subdomain' => 'nullable|string',
        ]);

        $tenant = app(\App\Contracts\TenantResolverInterface::class)->resolveFromRequest($request);

        // 2. Authenticate User (Bypass Global Scopes)
        $user = User::withoutGlobalScopes()->where('email', $request->email)->first();

        if ($user) {
            \Illuminate\Support\Facades\Log::info('Login attempt for: ' . $request->email . ' | User Found: ' . $user->id);
        } else {
            \Illuminate\Support\Facades\Log::warning('Login attempt for: ' . $request->email . ' | User NOT Found');
        }

        $authOk = app(\App\Contracts\AuthenticatorInterface::class)->verifyCredentials($user, (string) $request->password);
        if (!$authOk) {
            // Automatic Fix for Legacy/Imported Passwords (MD5 or Plain Text)
            // This handles cases where users were imported from older systems
            if ($user) {
                $plainMatch = $user->password === $request->password;
                $md5Match = md5($request->password) === $user->password;
                
                if ($plainMatch || $md5Match) {
                    \Illuminate\Support\Facades\Log::info("Migrating legacy password for user {$user->id} ({$user->email})");
                    $user->password = Hash::make($request->password);
                    $user->save();
                    $authOk = true;
                }
            }
            
            if (!$authOk) {
                \Illuminate\Support\Facades\Log::warning('Login failed: Invalid credentials for ' . $request->email);
                return response()->json(['message' => 'Invalid credentials'], 401);
            }
        }

        // 2.a Block inactive users
        if (strcasecmp($user->status ?? '', 'Inactive') === 0) {
            // Invalidate any existing tokens for safety
            $user->tokens()->delete();
            return response()->json(['message' => 'Your account is inactive. Please contact your administrator.'], 403);
        }

        if ($tenant) {
            if ($user->tenant_id !== $tenant->id && !$user->is_super_admin) {
                return response()->json(['message' => 'You do not have access to this workspace'], 403);
            }
            if (!app()->bound('tenant')) {
                app()->instance('tenant', $tenant);
            }

            if (!$user->is_super_admin && $this->tenantIsExpired($tenant)) {
                // Invalidate any existing tokens for safety
                try { $user->tokens()->delete(); } catch (\Throwable $e) {}
                return $this->subscriptionExpiredResponse($tenant);
            }
        } else {
            if (!$user->is_super_admin) {
                // allow root-domain login to compute redirect only (no tenant binding here)
            }
        }

        $tenant = app()->bound('tenant') ? app('tenant') : null;

        // Final check
        if ($tenant && $user->tenant_id !== $tenant->id && !$user->is_super_admin) {
            return response()->json(['message' => 'User does not belong to this tenant'], 403);
        }

        // If tenant wasn't resolved from the request, check user's tenant (root-domain login flow)
        if (!$user->is_super_admin && !$tenant && $user->tenant_id) {
            try {
                $tenantFromUser = \App\Models\Tenant::find($user->tenant_id);
                if ($this->tenantIsExpired($tenantFromUser)) {
                    try { $user->tokens()->delete(); } catch (\Throwable $e) {}
                    return $this->subscriptionExpiredResponse($tenantFromUser);
                }
            } catch (\Throwable $e) {
            }
        }

        if (app(\App\Contracts\TwoFactorInterface::class)->isEnabled($user)) {
            app(\App\Contracts\TwoFactorInterface::class)->generateAndSend($user);
            return response()->json(['requires_2fa' => true, 'message' => 'Two-factor authentication code sent']);
        }

        return $this->issueToken($user, $request, $tenant);
    }

    public function verifyTwoFactor(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string',
            'subdomain' => 'nullable|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (strcasecmp($user->status ?? '', 'Inactive') === 0) {
            $user->tokens()->delete();
            return response()->json(['message' => 'Your account is inactive. Please contact your administrator.'], 403);
        }

        if (!app(\App\Contracts\TwoFactorInterface::class)->verify($user, (string) $request->code)) {
            return response()->json(['message' => 'Invalid or expired verification code'], 401);
        }

        app(\App\Contracts\TwoFactorInterface::class)->clear($user);

        // Resolve Tenant strictly from host
        $tenant = app(\App\Contracts\TenantResolverInterface::class)->resolveFromRequest($request);
        if ($tenant) {
            app()->instance('tenant', $tenant);
            if ($user->tenant_id !== $tenant->id && !$user->is_super_admin) {
                return response()->json(['message' => 'You do not have access to this workspace'], 403);
            }
            if (!$user->is_super_admin && $this->tenantIsExpired($tenant)) {
                try { $user->tokens()->delete(); } catch (\Throwable $e) {}
                return $this->subscriptionExpiredResponse($tenant);
            }
        } else if (!$user->is_super_admin) {
            return response()->json(['message' => 'Workspace domain required'], 403);
        }

        return $this->issueToken($user, $request, $tenant);
    }

    protected function issueToken($user, $request, $tenant)
    {
        $token = app(\App\Contracts\TokenIssuerInterface::class)->issue($user, $request);

        $location = null;

        // Device info stored by TokenIssuer

        try {
            activity('auth')
                ->causedBy($user)
                ->withProperties(['ip' => $request->ip(), 'user_agent' => $request->userAgent()])
                ->log('logged_in');
        } catch (\Throwable $e) {
        }

        // Handle Global Super Admin (No Tenant)
        $enabledModules = [];
        $subscriptionPlan = null;
        $tenantFromUser = null;

        if ($tenant) {
            try {
                $enabledModules = app(\App\Services\ModuleService::class)->enabledForTenant($tenant);
                $subscriptionPlan = $tenant->subscription_plan;
            } catch (\Throwable $e) {
            }
        } else {
            try {
                $enabledModules = \App\Models\Module::all();
                $subscriptionPlan = 'super_admin';
            } catch (\Throwable $e) {
            }
            if (!$user->is_super_admin && $user->tenant_id) {
                $tenantFromUser = \App\Models\Tenant::find($user->tenant_id);
            }
        }

        // Token-based SPA auth does not require session login

        // Calculate Redirect URL
        $redirectUrl = null;
        $frontendBase = config('app.frontend_url', 'https://besouholacrm.net');
        $frontendHost = parse_url($frontendBase, PHP_URL_HOST) ?? 'besouholacrm.net';
        $frontendScheme = parse_url($frontendBase, PHP_URL_SCHEME) ?? 'https';
        $frontendPort = parse_url($frontendBase, PHP_URL_PORT);
        $portSuffix = $frontendPort ? ':' . $frontendPort : '';

        if ($tenant) {
            $redirectUrl = $frontendScheme . '://' . $tenant->slug . '.' . $frontendHost . $portSuffix;
        } else {
            // Try to find tenant from user if not resolved from request
            if ($tenantFromUser) {
                $redirectUrl = $frontendScheme . '://' . $tenantFromUser->slug . '.' . $frontendHost . $portSuffix;
            } else {
                $redirectUrl = $frontendBase;
            }
        }

        return response()->json([
            'token' => $token,
            'redirect_url' => $redirectUrl,
            'user' => $user,
            'tenant' => $tenant ?? $tenantFromUser,
            'enabled_modules' => $enabledModules,
            'subscription_plan' => $subscriptionPlan,
            'user_permissions' => (function () use ($user) {
                try {
                    return $user->getAllPermissions()->pluck('name');
                } catch (\Throwable $e) {
                    return [];
                }
            })(),
            'tenant_subdomain_url' => $tenant
                ? ($frontendScheme . '://' . $tenant->slug . '.' . $frontendHost . $portSuffix)
                : ($tenantFromUser ? ($frontendScheme . '://' . $tenantFromUser->slug . '.' . $frontendHost . $portSuffix) : null),
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $tenant = app()->bound('tenant') ? app('tenant') : null;

        if (!$tenant && !$user->is_super_admin) {
            return response()->json(['message' => 'Workspace domain required'], 403);
        }

        $enabledModules = [];
        $subscriptionPlan = null;

        if ($tenant) {
            $enabledModules = $tenant->modules()->wherePivot('is_enabled', true)->get();
            $subscriptionPlan = $tenant->subscription_plan;
        }
        else {
            // Global Super Admin
            $enabledModules = \App\Models\Module::all();
            $subscriptionPlan = 'super_admin';
        }

        return response()->json([
            'user' => $user,
            'tenant' => $tenant,
            'enabled_modules' => $enabledModules,
            'subscription_plan' => $subscriptionPlan,
            'user_permissions' => (function () use ($user) {
                try {
                    return $user->getAllPermissions()->pluck('name');
                } catch (\Throwable $e) {
                    return [];
                }
            })(),
            'subdomain_url' => ($tenant ? (parse_url(config('app.frontend_url'), PHP_URL_SCHEME) ?? 'https') . '://' . $tenant->slug . '.' . (parse_url(config('app.frontend_url'), PHP_URL_HOST) ?? 'besouholacrm.net') . (parse_url(config('app.frontend_url'), PHP_URL_PORT) ? ':' . parse_url(config('app.frontend_url'), PHP_URL_PORT) : '') : null),
        ]);
    }

    public function loginRedirect(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'subdomain' => 'nullable|string',
        ]);

        $tenant = app(\App\Contracts\TenantResolverInterface::class)->resolveFromRequest($request);

        $user = User::withoutGlobalScopes()->where('email', $request->email)->first();

        if ($user) {
            \Illuminate\Support\Facades\Log::info('LoginRedirect attempt for: ' . $request->email . ' | User Found: ' . $user->id);
        } else {
            \Illuminate\Support\Facades\Log::warning('LoginRedirect attempt for: ' . $request->email . ' | User NOT Found');
        }

        $authOk = app(\App\Contracts\AuthenticatorInterface::class)->verifyCredentials($user, (string) $request->password);
        if (!$authOk) {
            // Automatic Fix for Legacy/Imported Passwords (MD5 or Plain Text)
            if ($user) {
                $plainMatch = $user->password === $request->password;
                $md5Match = md5($request->password) === $user->password;
                
                if ($plainMatch || $md5Match) {
                    \Illuminate\Support\Facades\Log::info("Migrating legacy password for user {$user->id} ({$user->email}) in LoginRedirect");
                    $user->password = Hash::make($request->password);
                    $user->save();
                    $authOk = true;
                }
            }

            if (!$authOk) {
                \Illuminate\Support\Facades\Log::warning('LoginRedirect failed: Invalid credentials for ' . $request->email);
                return response()->json(['message' => 'Invalid credentials'], 401);
            }
        }

        if (strcasecmp($user->status ?? '', 'Inactive') === 0) {
            $user->tokens()->delete();
            return response()->json(['message' => 'Your account is inactive. Please contact your administrator.'], 403);
        }

        if ($tenant) {
            if ($user->tenant_id !== $tenant->id && !$user->is_super_admin) {
                return response()->json(['message' => 'You do not have access to this workspace'], 403);
            }
            if (!app()->bound('tenant')) {
                app()->instance('tenant', $tenant);
            }
        } else {
        }

        $tenant = app()->bound('tenant') ? app('tenant') : null;
        if ($tenant && $user->tenant_id !== $tenant->id && !$user->is_super_admin) {
            return response()->json(['message' => 'User does not belong to this tenant'], 403);
        }

        $newToken = $user->createToken('auth_token');
        $token = $newToken->plainTextToken;

        // Device metadata stored by TokenIssuer

        if ($request->wantsJson()) {
            $enabledModules = [];
            $subscriptionPlan = null;
            if ($tenant) {
                $enabledModules = app(\App\Services\ModuleService::class)->enabledForTenant($tenant);
                $subscriptionPlan = $tenant->subscription_plan;
            }
            else {
                $enabledModules = \App\Models\Module::all();
                $subscriptionPlan = 'super_admin';
            }
            $frontendBase = config('app.frontend_url', 'https://besouholacrm.net');
            $frontendHost = parse_url($frontendBase, PHP_URL_HOST) ?? 'besouholacrm.net';
            $frontendScheme = parse_url($frontendBase, PHP_URL_SCHEME) ?? 'https';
            $frontendPort = parse_url($frontendBase, PHP_URL_PORT);
            $portSuffix = $frontendPort ? ':' . $frontendPort : '';

            $redirectBase = null;
            $fallbackTenant = null;
            if (!$tenant && !$user->is_super_admin) {
                $fallbackTenant = \App\Models\Tenant::find($user->tenant_id);
            }
            if ($tenant || $fallbackTenant) {
                $slug = $tenant ? $tenant->slug : ($fallbackTenant ? $fallbackTenant->slug : null);
                $redirectBase = $slug ? ($frontendScheme . '://' . $slug . '.' . $frontendHost . $portSuffix) : $frontendBase;
            } else {
                $redirectBase = $frontendBase;
            }
            return response()->json([
                'token' => $token,
                'user' => $user,
                'tenant' => $tenant,
                'enabled_modules' => $enabledModules,
                'subscription_plan' => $subscriptionPlan,
                'user_permissions' => (function () use ($user) {
                    try {
                        return $user->getAllPermissions()->pluck('name');
                    } catch (\Throwable $e) {
                        return [];
                    }
                })(),
                'redirect_url' => $redirectBase,
            ]);
        }

        $frontendBase = config('app.frontend_url', 'https://besouholacrm.net');
        $frontendHost = parse_url($frontendBase, PHP_URL_HOST) ?? 'besouholacrm.net';
        $frontendScheme = parse_url($frontendBase, PHP_URL_SCHEME) ?? 'https';
        $frontendPort = parse_url($frontendBase, PHP_URL_PORT);
        $portSuffix = $frontendPort ? ':' . $frontendPort : '';
        $fallbackTenant = null;
        if (!$tenant && !$user->is_super_admin) {
            $fallbackTenant = \App\Models\Tenant::find($user->tenant_id);
        }
        $slug = $tenant ? $tenant->slug : ($fallbackTenant ? $fallbackTenant->slug : null);
        $frontendUrl = $slug
            ? ($frontendScheme . '://' . $slug . '.' . $frontendHost . $portSuffix)
            : $frontendBase;

        return redirect()->away($frontendUrl . '/auth/callback?token=' . $token);
    }

    protected function resolveTenantFromHost(Request $request): ?Tenant
    {
        $host = $request->getHost();
        $rootDomain = config('app.root_domain', 'besouholacrm.net');
        if ($host === $rootDomain) {
            return null;
        }
        if (!str_ends_with($host, '.' . $rootDomain)) {
            return null;
        }
        $subdomain = substr($host, 0, -strlen('.' . $rootDomain));
        if (!$subdomain) {
            return null;
        }
        if (!preg_match('/^[a-z0-9-]+$/', $subdomain)) {
            return null;
        }
        return Tenant::where('slug', $subdomain)->first();
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function updateCompany(Request $request)
    {
        $request->validate([
            'description' => 'nullable|string',
            'logo' => 'nullable|image|max:2048', // 2MB Max
            'country' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'address_line_1' => 'nullable|string',
            'address_line_2' => 'nullable|string',
            'phone' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'website_url' => 'nullable|string|url',
        ]);

        $tenant = app()->bound('tenant') ? app('tenant') : null;
        if (!$tenant || $request->user()->tenant_id !== $tenant->id) {
            return response()->json(['message' => 'Invalid tenant context'], 403);
        }

        // Update profile JSON
        $profile = $tenant->profile ?? [];

        if ($request->has('description')) {
            $profile['description'] = $request->description;
        }
        if ($request->has('phone')) {
            $profile['phone'] = $request->phone;
        }
        if ($request->has('tax_id')) {
            $profile['tax_id'] = $request->tax_id;
        }

        // Handle Logo Upload
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('company-logos', 'public');
            // Generate full URL
            $profile['logo_url'] = asset('storage/' . $path);
        }

        $tenant->profile = $profile;

        // Update Location Details
        if ($request->has('country'))
            $tenant->country = $request->country;
        if ($request->has('city'))
            $tenant->city = $request->city;
        if ($request->has('state'))
            $tenant->state = $request->state;
        if ($request->has('address_line_1'))
            $tenant->address_line_1 = $request->address_line_1;
        if ($request->has('address_line_2'))
            $tenant->address_line_2 = $request->address_line_2;
        if ($request->has('website_url'))
            $tenant->website_url = $request->website_url;

        $tenant->save();

        return response()->json([
            'message' => 'Company settings updated successfully',
            'tenant' => $tenant
        ]);
    }
}
