<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\WhatsappSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsappWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_handles_incoming_message_and_maps_tenant()
    {
        $tenant = Tenant::factory()->create();
        WhatsappSetting::create([
            'tenant_id' => $tenant->id,
            'provider' => 'meta',
            'api_key' => 'token',
            'phone_number_id' => 'PHONE_123',
            'status' => true,
        ]);

        $payload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'value' => [
                                'metadata' => [
                                    'phone_number_id' => 'PHONE_123',
                                ],
                                'messages' => [
                                    [
                                        'from' => '201001234567',
                                        'text' => ['body' => 'Hello, this is a test message...'],
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ];

        $resp = $this->postJson('/api/whatsapp/webhook', $payload);
        $resp->assertStatus(200)->assertJson(['status' => 'ok']);
        $this->assertDatabaseHas('whatsapp_messages', [
            'tenant_id' => $tenant->id,
            'phone_number_id' => 'PHONE_123',
            'from' => '201001234567',
            'body' => 'Hello, this is a test message...',
        ]);
    }
}
