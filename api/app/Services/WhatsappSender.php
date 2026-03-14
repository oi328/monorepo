<?php

namespace App\Services;

use App\Models\WhatsappSetting;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\WhatsappMessage;
use Illuminate\Http\Client\Response;

class WhatsappSender
{
    public function sendTemplate(int $tenantId, string $to, string $template, string $language = 'en_US'): array
    {
        $settings = WhatsappSetting::where('tenant_id', $tenantId)->first();
        if (!$settings) {
            throw ValidationException::withMessages([
                'whatsapp' => ['الرجاء إعداد تكامل WhatsApp أولاً']
            ]);
        }
        $token = $settings->api_key;
        $phoneId = $settings->phone_number_id ?: $settings->api_secret;
        if (!$token || !$phoneId) {
            throw ValidationException::withMessages([
                'whatsapp' => ['الرجاء إعداد phone_number_id و access token قبل الإرسال']
            ]);
        }
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $to,
            'type' => 'template',
            'template' => [
                'name' => $template,
                'language' => ['code' => $language],
            ],
        ];
        $response = $this->sendRequest($token, $phoneId, $payload);
        if (!$response->successful()) {
            Log::error('WhatsApp template send failed', [
                'status' => $response->status(),
                'response' => $response->json(),
            ]);
        }
        WhatsappMessage::create([
            'tenant_id' => $tenantId,
            'phone_number_id' => $phoneId,
            'from' => null,
            'to' => $to,
            'type' => 'template',
            'status' => $response->successful() ? 'accepted' : 'failed',
            'direction' => 'outbound',
            'message_id' => data_get($response->json(), 'messages.0.id'),
            'body' => null,
            'raw' => ['request' => $payload, 'response' => $response->json()],
        ]);
        return [
            'ok' => $response->successful(),
            'request' => $payload,
            'response' => $response->json(),
            'status' => $response->status(),
            'phone_number_id' => $phoneId,
        ];
    }

    public function sendText(int $tenantId, string $to, string $body): array
    {
        $settings = WhatsappSetting::where('tenant_id', $tenantId)->first();
        if (!$settings) {
            throw ValidationException::withMessages([
                'whatsapp' => ['الرجاء إعداد تكامل WhatsApp أولاً']
            ]);
        }
        $token = $settings->api_key;
        $phoneId = $settings->phone_number_id ?: $settings->api_secret;
        if (!$token || !$phoneId) {
            throw ValidationException::withMessages([
                'whatsapp' => ['الرجاء إعداد phone_number_id و access token قبل الإرسال']
            ]);
        }
        $payload = [
            'messaging_product' => 'whatsapp',
            'to' => $to,
            'type' => 'text',
            'text' => ['body' => $body],
        ];
        $response = $this->sendRequest($token, $phoneId, $payload);
        if (!$response->successful()) {
            Log::error('WhatsApp text send failed', [
                'status' => $response->status(),
                'response' => $response->json(),
            ]);
        }
        WhatsappMessage::create([
            'tenant_id' => $tenantId,
            'phone_number_id' => $phoneId,
            'from' => null,
            'to' => $to,
            'type' => 'text',
            'status' => $response->successful() ? 'accepted' : 'failed',
            'direction' => 'outbound',
            'message_id' => data_get($response->json(), 'messages.0.id'),
            'body' => $body,
            'raw' => ['request' => $payload, 'response' => $response->json()],
        ]);
        return [
            'ok' => $response->successful(),
            'request' => $payload,
            'response' => $response->json(),
            'status' => $response->status(),
            'phone_number_id' => $phoneId,
        ];
    }

    /**
     * @return \Illuminate\Http\Client\Response|\GuzzleHttp\Promise\PromiseInterface
     */
    private function sendRequest(string $token, string $phoneId, array $payload)
    {
        $url = "https://graph.facebook.com/v18.0/{$phoneId}/messages";
        $http = Http::withToken($token);
        if (app()->environment('local')) {
            $http = $http->withOptions(['verify' => false]);
        }
        return $http->post($url, $payload);
    }
}
