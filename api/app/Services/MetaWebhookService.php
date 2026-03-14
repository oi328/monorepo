<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MetaWebhookService
{
    public function handleWebhook(Request $request)
    {
        // Skip signature verification in Mock Mode
        if (!config('services.meta.mock_mode')) {
            // Verify signature
            $signature = $request->header('X-Hub-Signature-256') ?? $request->header('X-Hub-Signature');
            $appSecret = \App\Models\SystemSetting::where('key', 'meta_app_secret')->value('value') 
                ?? config('services.facebook.client_secret');
            
            // Signature format: sha1=... or sha256=...
            // $signature header contains "algo=hash"
            
            if (!$signature || !$this->verifySignature($request->getContent(), $signature, $appSecret)) {
                Log::warning("Invalid webhook signature from " . $request->ip());
                abort(403, 'Invalid signature');
            }
        } else {
            Log::info("Mock Mode: Skipping webhook signature verification.");
        }

        $payload = $request->all();
        
        if (isset($payload['object']) && $payload['object'] === 'page') {
            foreach ($payload['entry'] as $entry) {
                $pageId = $entry['id'];
                $changes = $entry['changes'] ?? [];

                foreach ($changes as $change) {
                    if (isset($change['field']) && $change['field'] === 'leadgen') {
                        $value = $change['value'] ?? [];
                        $leadGenId = $value['leadgen_id'] ?? null;
                        
                        if ($leadGenId) {
                            // Find tenant by page_id
                            $tenantId = $this->findTenantIdByPageId($pageId);
                            
                            if ($tenantId) {
                                \App\Jobs\ProcessMetaLead::dispatch($tenantId, $leadGenId, $pageId);
                            } else {
                                Log::warning("No tenant found for page_id: {$pageId}");
                            }
                        }
                    }
                }
            }
        }
    }

    protected function verifySignature($payload, $signatureHeader, $appSecret)
    {
        if (empty($signatureHeader)) {
            return false;
        }

        $parts = explode('=', $signatureHeader);
        if (count($parts) !== 2) {
            return false;
        }

        $algo = $parts[0];
        $hash = $parts[1];

        if (!in_array($algo, ['sha1', 'sha256'])) {
            return false;
        }

        $expected = hash_hmac($algo, $payload, $appSecret);

        return hash_equals($expected, $hash);
    }

    protected function findTenantIdByPageId($pageId)
    {
        // Find MetaPage by page_id
        $page = \App\Models\MetaPage::where('page_id', $pageId)->first();
        return $page ? $page->tenant_id : null;
    }
}
