<?php

namespace App\Http\Controllers;

use App\Services\MetaAuthService;
use App\Services\MetaCampaignService;
use App\Jobs\SyncMetaCampaigns;
use App\Models\MetaConnection;
use App\Models\MetaBusiness;
use App\Models\MetaAdAccount;
use App\Models\MetaPage;
use App\Models\Integration;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MetaAuthController extends Controller
{
    protected $metaAuthService;

    public function __construct(MetaAuthService $metaAuthService)
    {
        $this->metaAuthService = $metaAuthService;
    }

    public function redirect(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $state = Str::random(64);
        Cache::put('meta_oauth_state:' . $state, [
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
        ], now()->addMinutes(10));

        $url = $this->metaAuthService->getRedirectUrl($state);
        return response()->json(['url' => $url]);
    }

    public function callback(Request $request)
    {
        try {
            $user = $request->user();
            $tenantId = $user?->tenant_id;

            if (!$tenantId) {
                $state = $request->input('state') ?? $request->query('state');
                if (!$state) {
                    return response()->json(['error' => 'Missing state'], 422);
                }

                $ctx = Cache::pull('meta_oauth_state:' . $state);
                if (!is_array($ctx) || empty($ctx['tenant_id']) || empty($ctx['user_id'])) {
                    return response()->json(['error' => 'Invalid or expired state'], 403);
                }

                $user = User::find($ctx['user_id']);
                if (!$user || (int) $user->tenant_id !== (int) $ctx['tenant_id']) {
                    return response()->json(['error' => 'Unauthorized'], 401);
                }

                $tenantId = (int) $ctx['tenant_id'];
            }
            
            $connection = $this->metaAuthService->handleCallback($tenantId);
            
            // Ensure Integration record exists and is active
            Integration::updateOrCreate(
                ['tenant_id' => $tenantId, 'provider' => 'meta'],
                ['status' => 'active']
            );

            // Trigger initial sync
            SyncMetaCampaigns::dispatch($tenantId);

            $frontendBase = config('app.frontend_url', 'https://besouholacrm.net');
            $frontendHost = parse_url($frontendBase, PHP_URL_HOST) ?? 'besouholacrm.net';
            $frontendScheme = parse_url($frontendBase, PHP_URL_SCHEME) ?? 'https';
            $frontendPort = parse_url($frontendBase, PHP_URL_PORT);
            $portSuffix = $frontendPort ? ':' . $frontendPort : '';
            $tenant = Tenant::find($tenantId);
            $redirectBase = $tenant?->slug ? ($frontendScheme . '://' . $tenant->slug . '.' . $frontendHost . $portSuffix) : $frontendBase;

            $payload = ['message' => 'Meta connected successfully', 'connection' => $connection];
            if ($request->expectsJson()) {
                return response()->json($payload);
            }

            return redirect()->away($redirectBase . '/#/marketing/meta-integration?meta=connected');

        } catch (\Exception $e) {
            Log::error("Meta Auth Callback Error: " . $e->getMessage());
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Failed to connect Meta account'], 500);
            }

            $frontendBase = config('app.frontend_url', 'https://besouholacrm.net');
            return redirect()->away($frontendBase . '/#/marketing/meta-integration?meta=error');
        }
    }
    
    public function status(Request $request)
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

        $connections = MetaConnection::where('tenant_id', $tenantId)->get();
        $businesses = MetaBusiness::where('tenant_id', $tenantId)->get();
        $adAccounts = MetaAdAccount::with('business')->where('tenant_id', $tenantId)->get();
        $pages = MetaPage::where('tenant_id', $tenantId)->get();
        
        $integration = Integration::where('tenant_id', $tenantId)->where('provider', 'meta')->first();

        return response()->json([
            'connected' => $connections->isNotEmpty(),
            'integration_status' => $integration ? $integration->status : 'inactive',
            'connections' => $connections,
            'businesses' => $businesses,
            'ad_accounts' => $adAccounts,
            'pages' => $pages,
        ]);
    }
    
    public function updateSettings(Request $request)
    {
        // This might need to be repurposed for toggling active status of assets
        // For now, we'll leave it as a placeholder or remove it if not used by frontend
        return response()->json(['message' => 'Settings update not implemented for multi-account yet']);
    }

    public function toggleAsset(Request $request)
    {
        $request->validate([
            'type' => 'required|in:ad_account,page',
            'id' => 'required|integer',
            'is_active' => 'required|boolean'
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;
        
        if ($request->type === 'ad_account') {
            $asset = MetaAdAccount::where('tenant_id', $tenantId)->findOrFail($request->id);
            $asset->update(['is_active' => $request->is_active]);
        } else {
            $asset = MetaPage::where('tenant_id', $tenantId)->findOrFail($request->id);
            $asset->update(['is_active' => $request->is_active]);

            // Handle Webhook Subscription for Page
            if ($request->is_active) {
                try {
                    $response = \Illuminate\Support\Facades\Http::post("https://graph.facebook.com/v19.0/{$asset->page_id}/subscribed_apps", [
                        'subscribed_fields' => ['leadgen'],
                        'access_token' => $asset->page_token
                    ]);

                    if ($response->failed()) {
                        Log::error("Failed to subscribe page {$asset->page_id} to webhook: " . $response->body());
                    } else {
                        Log::info("Subscribed page {$asset->page_id} to webhook successfully.");
                    }
                } catch (\Exception $e) {
                    Log::error("Exception subscribing page {$asset->page_id}: " . $e->getMessage());
                }
            } else {
                 // Unsubscribe when deactivating
                 try {
                    \Illuminate\Support\Facades\Http::delete("https://graph.facebook.com/v19.0/{$asset->page_id}/subscribed_apps", [
                        'access_token' => $asset->page_token
                    ]);
                 } catch (\Exception $e) {
                     Log::warning("Failed to unsubscribe page {$asset->page_id}: " . $e->getMessage());
                 }
            }
        }

        return response()->json(['message' => 'Asset status updated successfully', 'asset' => $asset]);
    }

    public function linkPage(Request $request)
    {
        $request->validate([
            'page_id' => 'required|integer|exists:meta_pages,id',
            'ad_account_id' => 'nullable|integer|exists:meta_ad_accounts,id'
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;

        $page = MetaPage::where('tenant_id', $tenantId)->findOrFail($request->page_id);
        
        if ($request->ad_account_id) {
            // Verify ad account belongs to tenant
            $adAccount = MetaAdAccount::where('tenant_id', $tenantId)->findOrFail($request->ad_account_id);
            $page->update(['ad_account_id' => $adAccount->id]);
        } else {
            $page->update(['ad_account_id' => null]);
        }

        return response()->json(['message' => 'Page linked successfully', 'page' => $page]);
    }

    public function deleteAsset(Request $request)
    {
        $request->validate([
            'type' => 'required|in:business,ad_account,page',
            'id' => 'required|integer',
        ]);

        $user = $request->user();
        $tenantId = $user->tenant_id;

        if ($request->type === 'business') {
            $asset = MetaBusiness::where('tenant_id', $tenantId)->findOrFail($request->id);
            // Optional: Check if it has ad accounts and warn? Or cascade delete?
            // Laravel relationships usually handle cascade if configured, otherwise we manual delete.
            // For now, let's just delete the business record. Ad Accounts might become orphaned or we should delete them too.
            // Ideally, we should delete children.
            MetaAdAccount::where('business_id', $asset->id)->delete();
            $asset->delete();
        } elseif ($request->type === 'ad_account') {
            $asset = MetaAdAccount::where('tenant_id', $tenantId)->findOrFail($request->id);
            $asset->delete();
        } elseif ($request->type === 'page') {
            $asset = MetaPage::where('tenant_id', $tenantId)->findOrFail($request->id);
            $asset->delete();
        }

        return response()->json(['message' => 'Asset deleted successfully']);
    }

    public function disconnect(Request $request)
    {
        $user = $request->user();
        $connectionId = $request->input('connection_id');

        if ($connectionId) {
            MetaConnection::where('tenant_id', $user->tenant_id)->where('id', $connectionId)->delete();
        } else {
            // Disconnect all if no specific ID
            MetaConnection::where('tenant_id', $user->tenant_id)->delete();
        }

        // Check if any connections remain
        $remainingConnections = MetaConnection::where('tenant_id', $user->tenant_id)->exists();

        if (!$remainingConnections) {
            MetaPage::where('tenant_id', $user->tenant_id)->delete();
            MetaAdAccount::where('tenant_id', $user->tenant_id)->delete();
            MetaBusiness::where('tenant_id', $user->tenant_id)->delete();
            Integration::updateOrCreate(
                ['tenant_id' => $user->tenant_id, 'provider' => 'meta'],
                ['status' => 'inactive']
            );
        }
        
        return response()->json(['message' => 'Meta disconnected successfully']);
    }

    public function sync(Request $request, MetaCampaignService $campaignService)
    {
        $user = $request->user();
        
        try {
            // Dispatch job for background processing
            SyncMetaCampaigns::dispatch($user->tenant_id);
            
            return response()->json(['message' => 'Sync started successfully']);
        } catch (\Exception $e) {
            Log::error("Meta Sync Error: " . $e->getMessage());
            return response()->json(['error' => 'Failed to start sync'], 500);
        }
    }
}
