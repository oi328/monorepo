<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\WhatsappSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WhatsappSenderTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_sends_whatsapp_message_correctly()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        WhatsappSetting::create([
            'tenant_id' => $tenant->id,
            'provider' => 'meta',
            'api_key' => 'test-access-token',
            'phone_number_id' => 'YOUR_DUMMY_PHONE_ID',
            'status' => true,
        ]);

        Sanctum::actingAs($user);

        Http::fake();

        $this->postJson('/api/whatsapp/send-test', [
            'to' => '201001234567',
            'template' => 'hello_world',
            'language' => 'en',
        ])->assertStatus(200);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://graph.facebook.com/v18.0/YOUR_DUMMY_PHONE_ID/messages'
                && $request->hasHeader('Authorization', 'Bearer test-access-token')
                && data_get($request->data(), 'to') === '201001234567'
                && data_get($request->data(), 'template.name') === 'hello_world';
        });
    }

    public function test_it_blocks_send_when_missing_credentials()
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        WhatsappSetting::create([
            'tenant_id' => $tenant->id,
            'provider' => 'meta',
            'api_key' => null,
            'phone_number_id' => null,
            'status' => true,
        ]);

        Sanctum::actingAs($user);

        $resp = $this->postJson('/api/whatsapp/send-test', [
            'to' => '201001234567',
            'template' => 'hello_world',
        ]);

        $resp->assertStatus(422)->assertJsonValidationErrors(['whatsapp']);
    }
}
