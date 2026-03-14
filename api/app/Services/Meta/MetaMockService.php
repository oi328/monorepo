<?php

namespace App\Services\Meta;

use App\Models\MetaPage;
use Illuminate\Support\Facades\Log;

class MetaMockService
{
    /**
     * Generate a mock webhook payload for a new lead.
     *
     * @param string $pageId
     * @param string $leadGenId
     * @param string $formId
     * @return array
     */
    public function generateLeadWebhookPayload($pageId, $leadGenId = null, $formId = null)
    {
        $leadGenId = $leadGenId ?? 'mock_lead_' . uniqid();
        $formId = $formId ?? 'mock_form_' . uniqid();
        $timestamp = time();

        return [
            'object' => 'page',
            'entry' => [
                [
                    'id' => $pageId,
                    'time' => $timestamp,
                    'changes' => [
                        [
                            'field' => 'leadgen',
                            'value' => [
                                'ad_id' => 'mock_ad_' . uniqid(),
                                'form_id' => $formId,
                                'leadgen_id' => $leadGenId,
                                'created_time' => $timestamp,
                                'page_id' => $pageId,
                                'adgroup_id' => 'mock_adset_' . uniqid(),
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * Dispatch a mock lead webhook for a specific page.
     *
     * @param string $pageId
     * @param int $count
     * @return array
     */
    public function dispatchMockLeadsForPage($pageId, $count = 1)
    {
        $results = [];
        $service = app(\App\Services\MetaWebhookService::class);

        for ($i = 0; $i < $count; $i++) {
            $payload = $this->generateLeadWebhookPayload($pageId);
            
            // Create a mock request
            $request = new \Illuminate\Http\Request();
            $request->replace($payload);
            
            // Log for debugging
            Log::channel('meta_mock')->info("Dispatching Mock Webhook for Page {$pageId}", $payload);

            try {
                $service->handleWebhook($request);
                $results[] = ['status' => 'success', 'payload' => $payload];
            } catch (\Exception $e) {
                Log::channel('meta_mock')->error("Mock Webhook Failed: " . $e->getMessage());
                $results[] = ['status' => 'error', 'message' => $e->getMessage()];
            }
        }

        return $results;
    }

    /**
     * Dispatch a mock lead webhook to the application (by Tenant ID).
     *
     * @param string $tenantId
     * @param int $count
     * @return array
     */
    public function dispatchMockLeads($tenantId, $count = 1)
    {
        // Find a valid page for this tenant
        $page = MetaPage::where('tenant_id', $tenantId)->first();
        
        $pageId = $page ? $page->page_id : 'mock_page_id_for_tenant_' . $tenantId;

        return $this->dispatchMockLeadsForPage($pageId, $count);
    }
    
    /**
     * Generate a mock webhook payload for a new lead (internal helper).
     */
    protected function generateLeadWebhookPayloadInternal($pageId, $leadGenId = null, $formId = null)
    {
         // Same as public but internal if needed
    }
}
