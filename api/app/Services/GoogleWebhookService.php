<?php

namespace App\Services;

use App\Models\GoogleAdsAccount;
use App\Models\Lead;
use App\Models\Source;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleWebhookService
{
    public function handleWebhook(Request $request)
    {
        $payload = $request->all();
        $googleKey = $request->header('google-key') ?? $payload['google_key'] ?? null;

        if (!$googleKey) {
            Log::warning("Google Webhook: Missing google_key in payload or header");
            return;
        }

        $account = GoogleAdsAccount::withoutGlobalScope('tenant')
            ->where('webhook_key', $googleKey)
            ->where('is_active', true)
            ->first();

        if (!$account) {
            Log::warning("Google Webhook: No GoogleAdsAccount found for webhook_key: {$googleKey}");
            return;
        }

        app()->instance('current_tenant_id', $account->tenant_id);
        $this->processLead($payload, $account);
    }

    protected function processLead($payload, GoogleAdsAccount $account)
    {
        try {
            $leadData = [];
            $userData = is_array($payload['user_column_data'] ?? null) ? $payload['user_column_data'] : [];

            // 3. استخراج البيانات (مرن: يعتمد على column_id أو column_name)
            foreach ($userData as $column) {
                $columnId = strtoupper((string) ($column['column_id'] ?? ''));
                $name = (string) ($column['column_name'] ?? '');
                $value = (string) ($column['string_value'] ?? '');

                if ($columnId === 'FULL_NAME' || str_contains($name, 'Full Name')) {
                    $leadData['name'] = $value;
                }
                if ($columnId === 'PHONE_NUMBER' || str_contains($name, 'Phone')) {
                    $leadData['phone'] = $value;
                }
                if ($columnId === 'EMAIL' || str_contains($name, 'Email')) {
                    $leadData['email'] = $value;
                }
            }

            // 4. تجهيز بيانات المصدر
            $leadData['tenant_id'] = $account->tenant_id;
            $leadData['source_id'] = $this->getGoogleSourceId($account->tenant_id);
            $leadData['status'] = 'new';
            $leadData['platform'] = 'google';
            $leadData['google_ads_account_id'] = $account->id;
            
            // تخزين بيانات جوجل الإضافية للتتبع المستقبلي (Offline Conversions)
            $googleLeadId = $payload['lead_id'] ?? $payload['leadId'] ?? null;
            $gclid = $payload['gcl_id'] ?? $payload['gclid'] ?? $payload['gclId'] ?? null;

            if ($googleLeadId) {
                $leadData['google_lead_id'] = (string) $googleLeadId;
            }
            if ($gclid) {
                $leadData['gcl_id'] = (string) $gclid;
            }
            if (!empty($payload['campaign_id'])) {
                $leadData['google_campaign_id'] = (string) $payload['campaign_id'];
            }
            if (!empty($payload['ad_group_id'])) {
                $leadData['google_adgroup_id'] = (string) $payload['ad_group_id'];
            }
            if (!empty($payload['creative_id'])) {
                $leadData['google_creative_id'] = (string) $payload['creative_id'];
            }

            $leadData['meta_data'] = array_merge((array) ($leadData['meta_data'] ?? []), [
                'google' => [
                    'customer_id' => $account->google_ads_id,
                    'webhook_key' => $account->webhook_key,
                    'raw' => $payload,
                ],
            ]);

            // 5. إنشاء الليد أو تحديثه
            $unique = null;
            if (!empty($leadData['google_lead_id'])) {
                $unique = [
                    'tenant_id' => $account->tenant_id,
                    'google_ads_account_id' => $account->id,
                    'google_lead_id' => $leadData['google_lead_id'],
                ];
            } elseif (!empty($leadData['email'])) {
                $unique = ['tenant_id' => $account->tenant_id, 'email' => $leadData['email']];
            } elseif (!empty($leadData['phone'])) {
                $unique = ['tenant_id' => $account->tenant_id, 'phone' => $leadData['phone']];
            } else {
                $unique = ['tenant_id' => $account->tenant_id, 'email' => 'test_' . uniqid() . '@noemail.com'];
            }

            $lead = Lead::updateOrCreate($unique, $leadData);

            Log::info("Google Lead successfully created/updated: ID {$lead->id}");

        } catch (\Exception $e) {
            Log::error("Google Webhook Process Error: " . $e->getMessage());
        }
    }

    private function getGoogleSourceId($tenantId)
    {
        return Source::firstOrCreate(
            ['name' => 'Google Ads', 'tenant_id' => $tenantId],
            ['type' => 'paid']
        )->id;
    }
}
