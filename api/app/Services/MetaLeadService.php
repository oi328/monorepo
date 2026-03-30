<?php

namespace App\Services;

use App\Contracts\MetaApiClientInterface;
use App\Models\Lead;
use App\Models\Integration;
use App\Models\MetaPage;
use App\Models\MetaConnection;
use App\Models\Campaign;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Notifications\MetaConnectionLostNotification;

class MetaLeadService
{
    protected $apiClient;

    public function __construct(MetaApiClientInterface $apiClient)
    {
        $this->apiClient = $apiClient;
    }

    public function processLead($tenantId, $leadId, $pageId = null, $accessToken = null)
    {
        $integration = Integration::where('tenant_id', $tenantId)->where('provider', 'meta')->first();
        
        if (!$accessToken) {
            // Try to find token via Page ID
            if ($pageId) {
                $page = MetaPage::with('connection')->where('tenant_id', $tenantId)->where('page_id', $pageId)->first();
                if ($page) {
                    $accessToken = $page->page_token;
                    // Fallback to User Token if Page Token is missing
                    if (!$accessToken && $page->connection) {
                        $accessToken = $page->connection->user_access_token;
                    }
                }
            }

            // Fallback: Find any valid connection if no specific page context or token found yet
            if (!$accessToken) {
                $connection = MetaConnection::where('tenant_id', $tenantId)->latest()->first();
                if ($connection) {
                    $accessToken = $connection->user_access_token;
                }
            }

            if (!$accessToken) {
                // Check if Mock Mode is enabled and allow bypass with a dummy token
                if (config('services.meta.mock_mode')) {
                    $accessToken = 'mock_access_token_bypass';
                    Log::info("Mock Mode: Using dummy access token for lead processing (Tenant: {$tenantId}, Lead: {$leadId})");
                } else {
                    Log::error("No valid Meta access token found for tenant {$tenantId} while processing lead {$leadId}");
                    return;
                }
            }
        }

    // Fetch lead details from Graph API
        try {
            $data = $this->apiClient->get("/{$leadId}", [
                'access_token' => $accessToken,
                'fields' => 'id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data',
            ]);

            $this->storeLead($tenantId, $data, $integration);

        } catch (\Exception $e) {
            $message = $e->getMessage();
            $code = $e->getCode();

            // Check for Token Expiration (190) or Session Expiration (102)
            if (in_array($code, [190, 102]) || ($code == 10 && str_contains(strtolower($message), 'permission'))) {
                Log::warning("Meta Token Expired/Invalid for Tenant {$tenantId}: {$message}");
                $this->notifyTenantAdmin($tenantId, $message);
            } elseif (in_array($code, [1, 2, 4, 17, 341, 368]) || $code >= 500) {
                Log::warning("Meta API Temporary Failure (Code: {$code}) for Tenant {$tenantId}: {$message}. Retrying...");
                throw $e; // Re-throw to trigger job retry
            } else {
                Log::error("Failed to fetch lead {$leadId}: " . $message);
            }
        }
    }

    protected function storeLead($tenantId, $data, $integration = null)
    {
        if (!$integration) {
            $integration = Integration::where('tenant_id', $tenantId)->where('provider', 'meta')->first();
        }

        // Parse field_data to get name, email, phone
        // Meta returns field_data as an array of objects: [{name: "email", values: ["..."]}, ...]
        $fields = collect($data['field_data'] ?? [])->mapWithKeys(function ($item) {
            return [$item['name'] => $item['values'][0] ?? null];
        });

        // Use custom field mapping if available in integration settings.
        // Priority:
        // 1) Per-form mapping: settings.formMap[form_id]
        // 2) Global mapping: settings.fieldMap
        $settingsArr = ($integration && is_array($integration->settings)) ? $integration->settings : [];
        $formId = $data['form_id'] ?? null;

        $map = [];
        if ($formId && isset($settingsArr['formMap']) && is_array($settingsArr['formMap'])) {
            $perForm = $settingsArr['formMap'][(string)$formId] ?? null;
            if (is_array($perForm)) {
                // Allow storing mapping directly OR nested under fieldMap
                if (isset($perForm['fieldMap']) && is_array($perForm['fieldMap'])) {
                    $map = $perForm['fieldMap'];
                } else {
                    $map = $perForm;
                }
            }
        }
        if (empty($map) && isset($settingsArr['fieldMap']) && is_array($settingsArr['fieldMap'])) {
            $map = $settingsArr['fieldMap'];
        }


        // Normalize map to be CRM_FIELD => META_FIELD
        // The frontend (MetaSettings.jsx) seems to save as { "META_FIELD": "CRM_FIELD" }
        // We want to easily look up "What is the Meta field for 'email'?"
        $crmToMetaMap = [];
        foreach ($map as $key => $value) {
            // If key is Meta field and value is CRM field
            $crmToMetaMap[$value] = $key;
        }
        // Merge with original map just in case it was already in correct format, giving precedence to the flipped one if valid
        // or just rely on $crmToMetaMap for the standard fields lookups

        // Helper to find value by mapped key or fallback
        $getValue = function ($crmKey, $fallbacks) use ($fields, $crmToMetaMap, $map) {
            // Check mapped key in crmToMetaMap
            if (isset($crmToMetaMap[$crmKey]) && isset($fields[$crmToMetaMap[$crmKey]])) {
                return $fields[$crmToMetaMap[$crmKey]];
            }
            // Check direct map (if map was CRM=>Meta)
            if (isset($map[$crmKey]) && isset($fields[$map[$crmKey]])) {
                return $fields[$map[$crmKey]];
            }
            // Check fallbacks
            foreach ($fallbacks as $fb) {
                if (isset($fields[$fb])) return $fields[$fb];
            }
            return null;
        };

        $name = $getValue('name', ['full_name', 'name']);
        $email = $getValue('email', ['email', 'work_email']);
        $phone = $getValue('phone', ['phone_number', 'phone']);
        
        // Handle Custom Mapped Fields (Generic)
        // Iterate over all available fields from Meta and check if they are mapped to any other CRM column
        $additionalAttributes = [];
        $unmappedFields = [];
        
        foreach ($fields as $metaKey => $value) {
            // Check if this Meta Key is mapped to a CRM Field in the settings
            // Map structure from frontend: { "META_KEY": "CRM_KEY" }
            if (isset($map[$metaKey])) {
                $crmKey = $map[$metaKey];
                // Skip standard fields we already handled
                if (in_array($crmKey, ['name', 'email', 'phone'])) continue;
                
                if (!empty($value)) {
                    // For 'notes', we might want to append if multiple fields map to it
                    if ($crmKey === 'notes') {
                        $additionalAttributes['notes'] = ($additionalAttributes['notes'] ?? '') . "{$metaKey}: {$value}\n";
                    } else {
                        $additionalAttributes[$crmKey] = $value;
                    }
                }
            } else {
                // If not mapped, keep track of it for the JSON column
                if (!in_array($metaKey, ['full_name', 'name', 'email', 'work_email', 'phone_number', 'phone'])) {
                    $unmappedFields[$metaKey] = $value;
                }
            }
        }
        
        // Find or create campaign locally
        $campaignId = null;
        if (isset($data['campaign_id'])) {
            $campaign = Campaign::firstOrCreate(
                ['meta_id' => $data['campaign_id'], 'tenant_id' => $tenantId],
                [
                    'name' => $data['campaign_name'] ?? 'Unknown Campaign', 
                    'source' => 'meta', 
                    'provider' => 'meta',
                    'status' => 'ACTIVE', // Default status
                    'start_date' => now(),
                ]
            );
            $campaignId = $campaign->id;
        }

        $leadData = array_merge([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'source' => 'meta',
            'platform' => 'facebook',
            'is_organic' => false,
            'campaign_id' => $campaignId,
            'campaign_id_meta' => $data['campaign_id'] ?? null,
            'adset_id' => $data['adset_id'] ?? null,
            'adset_name' => $data['adset_name'] ?? null,
            'ad_id' => $data['ad_id'] ?? null,
            'ad_name' => $data['ad_name'] ?? null,
            'form_id' => $data['form_id'] ?? null,
            'meta_data' => [
                'form_id' => $data['form_id'] ?? null, 
                'fields' => $fields->toArray(),
                'custom_questions' => $unmappedFields, // Explicitly store unmapped fields here
                'raw_payload' => $data
            ],
            'created_at' => isset($data['created_time']) ? \Carbon\Carbon::parse($data['created_time']) : now(),
        ], $additionalAttributes);

        Lead::updateOrCreate(
            [
                'meta_id' => $data['id'],
                'tenant_id' => $tenantId,
            ],
            $leadData
        );
    }

    protected function notifyTenantAdmin($tenantId, $reason)
    {
        // Find users with 'Tenant Admin' role in this tenant
        // Assuming Spatie roles or similar setup where roles are assigned to users
        
        $admins = User::where('tenant_id', $tenantId)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'Tenant Admin')
                  ->orWhere('name', 'Admin'); // Fallback
            })
            ->get();

        if ($admins->isEmpty()) {
            // Fallback: notify the first user of the tenant if no admin found (unlikely)
            $admins = User::where('tenant_id', $tenantId)->limit(1)->get();
        }

        foreach ($admins as $admin) {
            try {
                $admin->notify(new MetaConnectionLostNotification($reason));
            } catch (\Exception $e) {
                Log::error("Failed to send Meta notification to user {$admin->id}: " . $e->getMessage());
            }
        }
    }
}
