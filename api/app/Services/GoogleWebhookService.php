<?php

namespace App\Services;

use App\Models\GoogleIntegration;
use App\Models\Lead;
use App\Models\Source;
use App\Models\Tenant;
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

        // 1. البحث عن الـ Integration (المفتاح رقم 26 أو مفتاح جوجل الحقيقي)
        // سنحاول البحث بالـ ID أولاً (للتوافق مع تجربتك في Postman) ثم بالـ webhook_key
        $integration = GoogleIntegration::withoutGlobalScope('tenant')
            ->where('webhook_key', $googleKey)
            ->orWhere('tenant_id', $googleKey) // إضافة البحث بالـ ID للتجربة
            ->first();

        if (!$integration) {
            Log::warning("Google Webhook: No Integration found for key/ID: {$googleKey}");
            return;
        }

        // 2. تفعيل سياق المستأجر (Tenant Context)
        $tenant = Tenant::find($integration->tenant_id);
        if ($tenant) {
            $tenant->makeCurrent(); // التأكد من توجيه البيانات لقاعدة بيانات المستأجر الصحيح
        } else {
            Log::error("Google Webhook: Tenant not found for ID {$integration->tenant_id}");
            return;
        }

        $this->processLead($payload, $integration);
    }

    protected function processLead($payload, $integration)
    {
        try {
            $leadData = [];
            $userData = $payload['user_column_data'] ?? [];

            // 3. استخراج البيانات (تصحيح Mapping بناءً على JSON جوجل)
            foreach ($userData as $column) {
                // ملاحظة: جوجل يرسل 'column_name' أو 'column_id'
                $name = $column['column_name'] ?? ''; 
                $value = $column['string_value'] ?? '';

                if (str_contains($name, 'Full Name')) $leadData['full_name'] = $value;
                if (str_contains($name, 'Phone')) $leadData['phone'] = $value;
                if (str_contains($name, 'Email')) $leadData['email'] = $value;
            }

            // 4. تجهيز بيانات المصدر
            $leadData['tenant_id'] = $integration->tenant_id;
            $leadData['source_id'] = $this->getGoogleSourceId($integration->tenant_id);
            $leadData['status'] = 'new';
            
            // تخزين بيانات جوجل الإضافية للتتبع المستقبلي (Offline Conversions)
            $leadData['meta_data'] = [
                'gcl_id' => $payload['gcl_id'] ?? null,
                'google_lead_id' => $payload['lead_id'] ?? null,
                'campaign_id' => $payload['campaign_id'] ?? null,
            ];

            // 5. إنشاء الليد أو تحديثه
            $lead = Lead::updateOrCreate(
                ['email' => $leadData['email'] ?? 'test_' . uniqid() . '@noemail.com'],
                $leadData
            );

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