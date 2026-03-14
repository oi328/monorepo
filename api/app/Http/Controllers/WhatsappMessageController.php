<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\WhatsappSender;
use App\Models\WhatsappMessage;

class WhatsappMessageController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $messages = WhatsappMessage::where('tenant_id', $user->tenant_id)
            ->latest()->limit(50)->get();
        return response()->json($messages);
    }

    public function sendTest(Request $request, WhatsappSender $sender)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'to' => 'required|string',
            'template' => 'required|string',
            'language' => 'nullable|string',
        ]);
        $language = $validated['language'] ?? 'en';
        $result = $sender->sendTemplate((int)$user->tenant_id, $validated['to'], $validated['template'], $language);
        return response()->json($result);
    }

    public function leadMessages(Request $request, $leadId)
    {
        $user = Auth::user();
        $lead = \App\Models\Lead::findOrFail($leadId);
        // Use digits-only to match stored from/to values
        $rawPhone = $lead->phone ?? $lead->mobile ?? '';
        $digits = preg_replace('/\D+/', '', (string) $rawPhone);
        $messages = WhatsappMessage::where('tenant_id', $user->tenant_id)
            ->where(function($q) use ($digits) {
                $q->where('from', $digits)->orWhere('to', $digits);
            })
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function(WhatsappMessage $m) {
                return [
                    'body' => $m->body,
                    'direction' => $m->direction,
                    'timestamp' => $m->created_at?->toISOString(),
                    'status' => $this->mapStatus($m->status),
                    'type' => $m->type,
                    'id' => $m->id,
                ];
            });
        return response()->json($messages);
    }

    public function sendTemplateV1(Request $request, WhatsappSender $sender)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'recipient_number' => 'required|string',
            'template_name' => 'required|string',
            'variables' => 'array',
        ]);
        $result = $sender->sendTemplate((int)$user->tenant_id, $validated['recipient_number'], $validated['template_name'], 'en_US');
        return response()->json($result);
    }

    public function sendTextV1(Request $request, WhatsappSender $sender)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'recipient_number' => 'required|string',
            'message_body' => 'required|string',
        ]);
        $digits = preg_replace('/\D+/', '', (string) $validated['recipient_number']);
        // Enforce 24-hour rule: require last inbound within 24h
        $lastInbound = WhatsappMessage::where('tenant_id', $user->tenant_id)
            ->where('direction', 'inbound')
            ->where('from', $digits)
            ->orderBy('created_at', 'desc')
            ->first();
        if (!$lastInbound || now()->diffInHours($lastInbound->created_at) > 24) {
            return response()->json([
                'ok' => false,
                'error' => 'outside_24h_window',
                'message' => 'لا يمكن إرسال رسالة حرة. مر أكثر من 24 ساعة على آخر رسالة من العميل. الرجاء استخدام قالب لبدء محادثة جديدة.'
            ], 422);
        }
        $result = $sender->sendText((int)$user->tenant_id, $digits, $validated['message_body']);
        return response()->json($result);
    }

    private function mapStatus(?string $status): string
    {
        if (!$status) return 'sent';
        switch ($status) {
            case 'accepted': return 'sent';
            case 'received': return 'delivered';
            case 'read': return 'read';
            default: return $status;
        }
    }
}
