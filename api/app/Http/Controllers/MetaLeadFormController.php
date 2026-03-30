<?php

namespace App\Http\Controllers;

use App\Contracts\MetaApiClientInterface;
use App\Models\Integration;
use App\Models\MetaPage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MetaLeadFormController extends Controller
{
    public function __construct(protected MetaApiClientInterface $apiClient)
    {
    }

    /**
     * List lead forms for active Meta pages in the current tenant.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $tenantId = $user?->tenant_id;

        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context not found.'], 403);
        }

        $pages = MetaPage::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get(['id', 'page_id', 'page_name', 'page_token']);

        $forms = [];
        $errors = [];

        foreach ($pages as $page) {
            $token = $page->page_token;
            if (!$token) {
                $errors[] = "Page {$page->page_name} has no page token.";
                continue;
            }

            try {
                $resp = $this->apiClient->get("/{$page->page_id}/leadgen_forms", [
                    'access_token' => $token,
                    'fields' => 'id,name,status,created_time',
                    'limit' => 200,
                ]);

                foreach (($resp['data'] ?? []) as $f) {
                    $forms[] = array_merge($f, [
                        'page_id' => $page->page_id,
                        'page_name' => $page->page_name,
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning('Meta lead forms fetch failed', [
                    'tenant_id' => $tenantId,
                    'page_id' => $page->page_id,
                    'error' => $e->getMessage(),
                ]);
                $errors[] = "Failed to fetch forms for page {$page->page_name}.";
            }
        }

        return response()->json([
            'forms' => $forms,
            'errors' => $errors,
        ]);
    }

    /**
     * Save a mapping/config for a specific lead form id.
     * Stored under Integration(settings.formMap[form_id]).
     */
    public function map(Request $request)
    {
        $request->validate([
            'form_id' => 'required|string',
            'mapping' => 'required|array',
        ]);

        $user = $request->user();
        $tenantId = $user?->tenant_id;
        if (!$tenantId) {
            return response()->json(['message' => 'Tenant context not found.'], 403);
        }

        $integration = Integration::updateOrCreate(
            ['tenant_id' => $tenantId, 'provider' => 'meta'],
            ['status' => 'active']
        );

        $settings = is_array($integration->settings) ? $integration->settings : [];
        $settings['formMap'] = is_array($settings['formMap'] ?? null) ? $settings['formMap'] : [];
        $settings['formMap'][$request->input('form_id')] = $request->input('mapping');

        $integration->settings = $settings;
        $integration->save();

        return response()->json(['message' => 'Form mapping saved', 'settings' => $integration->settings]);
    }
}

