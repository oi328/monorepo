<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\WhatsappSetting;
use Illuminate\Support\Facades\Log;
use App\Models\WhatsappMessage;
use App\Events\InboundWhatsappMessage;

class WhatsappWebhookController extends Controller
{
    public function verify(Request $request)
    {
        $mode = $request->query('hub_mode') ?? $request->query('hub.mode');
        $token = $request->query('hub_verify_token') ?? $request->query('hub.verify_token');
        $challenge = $request->query('hub_challenge') ?? $request->query('hub.challenge');
        if ($mode === 'subscribe' && $token==='tota') {
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }
        return response()->json(['status' => 'ok']);
    }

    public function receive(Request $request)
    {
        $payload = $request->all();
        $phoneId = $this->extractPhoneNumberId($payload);
        if (!$phoneId) {
            Log::warning('WhatsApp webhook: missing phone_number_id');
            return response()->json(['status' => 'ignored'], 200);
        }
        $setting = WhatsappSetting::where('phone_number_id', $phoneId)->first();
        if (!$setting) {
            Log::warning('WhatsApp webhook: phone_number_id not mapped', ['phone_number_id' => $phoneId]);
            return response()->json(['status' => 'ignored'], 200);
        }
        $entry = $payload['entry'][0] ?? [];
        $changes = $entry['changes'][0] ?? [];
        $value = $changes['value'] ?? [];
        $messages = $value['messages'] ?? [];
        Log::info('WhatsApp webhook received', [
            'tenant_id' => $setting->tenant_id,
            'phone_number_id' => $phoneId,
            'messages_count' => count($messages),
        ]);
        foreach ($messages as $m) {
            $saved = WhatsappMessage::create([
                'tenant_id' => $setting->tenant_id,
                'phone_number_id' => $phoneId,
                'from' => $m['from'] ?? null,
                'to' => $m['to'] ?? null,
                'type' => $m['type'] ?? null,
                'status' => 'received',
                'direction' => 'inbound',
                'message_id' => $m['id'] ?? null,
                'body' => data_get($m, 'text.body') ?? data_get($m, 'button.text') ?? null,
                'raw' => $m,
            ]);
            Log::info('WhatsApp message stored', [
                'id' => $saved->id,
                'from' => $saved->from,
                'to' => $saved->to,
                'body' => $saved->body,
            ]);
            try {
                event(new InboundWhatsappMessage((int)$setting->tenant_id, [
                    'id' => $saved->id,
                    'body' => $saved->body,
                    'from' => $saved->from,
                    'to' => $saved->to,
                    'direction' => $saved->direction,
                    'timestamp' => $saved->created_at?->toISOString(),
                ]));
            } catch (\Throwable $e) {
                Log::warning('Failed to broadcast inbound WhatsApp message', ['error' => $e->getMessage()]);
            }
        }
        return response()->json(['status' => 'ok'], 200);
    }

    private function extractPhoneNumberId(array $payload): ?string
    {
        $entry = $payload['entry'][0] ?? null;
        $changes = $entry['changes'][0] ?? null;
        $value = $changes['value'] ?? null;
        $meta = $value['metadata'] ?? null;
        $id = $meta['phone_number_id'] ?? null;
        if ($id) return (string) $id;
        return null;
    }
}
