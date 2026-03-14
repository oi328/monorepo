<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GeminiController extends Controller
{
    protected function computeLocalSuggestions(?string $name, ?string $nameAr): array
    {
        $icons = ['🆕','🎯','⏳','✅','❌','📊','💼','🤝','🔁','📞','💬','🏆','🗂️','🗓️','💰','🔥','🧊'];
        $pairs = [
            ['🆕',['new','جديد']],['🎯',['qual','qualified','تأهيل','مؤهل']],['⏳',['progress','in progress','قيد','انتظار']],
            ['✅',['convert','converted','success','تحويل','نجاح']],['❌',['lost','fail','خاسر','فشل']],['📊',['analysis','stat','تحليل','إحصاء']],
            ['💼',['deal','صفقة']],['🤝',['negotiation','تفاوض']],['🔁',['follow','follow up','متابعة']],
            ['📞',['call','اتصال','هاتف']],['💬',['message','chat','رسالة','دردشة']],['🏆',['won','رابح','ربح']],
            ['🗂️',['archive','أرشيف']],['🗓️',['meeting','اجتماع']],['💰',['payment','budget','قيمة','تمويل']],
            ['🔥',['hot','ساخن']],['🧊',['cold','بارد']],
        ];
        $text = strtolower(trim(($name ?? '').' '.($nameAr ?? '')));
        $picks = [];
        foreach ($pairs as [$icon, $keywords]) {
            foreach ($keywords as $k) {
                if ($k && str_contains($text, $k)) {
                    $picks[] = $icon;
                    break;
                }
            }
        }
        $uniq = array_values(array_unique($picks));
        $fallback = array_values(array_diff($icons, $uniq));
        return array_slice(array_merge($uniq, $fallback), 0, 10);
    }

    public function iconSuggestions(Request $request)
    {
        $name = $request->input('name');
        $nameAr = $request->input('nameAr');
        if (!$name && !$nameAr) {
            return response()->json(['error' => 'missing_name'], 400);
        }

        $key = env('GEMINI_API_KEY');
        if (!$key) {
            return response()->json(['icons' => $this->computeLocalSuggestions($name, $nameAr), 'hint' => 'fallback_local']);
        }

        $prompt = 'You are helping pick emoji icons for CRM pipeline stage labels. Given English and/or Arabic stage names, suggest up to 10 suitable emoji characters for UI labels. Respond ONLY with JSON: {"icons":["emoji1","emoji2",...]}.';
        $client = new \GuzzleHttp\Client(['http_errors' => false, 'timeout' => 20]);
        $r = $client->request('POST', "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$key}", [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => [
                'contents' => [[ 'role' => 'user', 'parts' => [[ 'text' => $prompt."\n\nInput: \"".trim(($name ?? '').' '.($nameAr ?? ''))."\"" ]] ]]
            ],
        ]);
        $status = $r->getStatusCode();
        $j = json_decode((string) $r->getBody(), true);
        if ($status < 200 || $status >= 300) {
            return response()->json(['icons' => $this->computeLocalSuggestions($name, $nameAr), 'hint' => 'fallback_local']);
        }

        $textOut = data_get($j, 'candidates.0.content.parts.0.text', '');
        $start = strpos($textOut, '{');
        $end = strrpos($textOut, '}');
        $jsonStr = ($start !== false && $end !== false && $end >= $start) ? substr($textOut, $start, $end - $start + 1) : $textOut;
        $parsed = json_decode($jsonStr, true);
        $icons = is_array(data_get($parsed, 'icons')) ? array_values(array_filter($parsed['icons'], fn($x) => is_string($x))) : [];
        if (!$icons) {
            return response()->json(['icons' => $this->computeLocalSuggestions($name, $nameAr), 'hint' => 'fallback_empty']);
        }
        return response()->json(['icons' => array_slice($icons, 0, 10)]);
    }

    public function generateIcon(Request $request)
    {
        $name = $request->input('name');
        $nameAr = $request->input('nameAr');
        if (!$name && !$nameAr) {
            return response()->json(['error' => 'missing_name'], 400);
        }

        $key = env('GEMINI_API_KEY');
        if (!$key) {
            return response()->json(['error' => 'gemini_unavailable'], 400);
        }

        $prompt = 'You are helping pick ONE emoji icon for a CRM pipeline stage label. Respond ONLY with JSON {"icon":"EMOJI"}.';
        $client = new \GuzzleHttp\Client(['http_errors' => false, 'timeout' => 20]);
        $r = $client->request('POST', "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$key}", [
            'headers' => ['Content-Type' => 'application/json', 'x-goog-api-key' => $key],
            'json' => [
                'contents' => [[ 'role' => 'user', 'parts' => [[ 'text' => $prompt."\n\nInput: \"".trim(($name ?? '').' '.($nameAr ?? ''))."\"" ]] ]]
            ],
        ]);
        $status = $r->getStatusCode();
        $j = json_decode((string) $r->getBody(), true);
        if ($status < 200 || $status >= 300) {
            return response()->json(['error' => 'gemini_error', 'details' => $j], 400);
        }

        $textOut = data_get($j, 'candidates.0.content.parts.0.text', '');
        $start = strpos($textOut, '{');
        $end = strrpos($textOut, '}');
        $jsonStr = ($start !== false && $end !== false && $end >= $start) ? substr($textOut, $start, $end - $start + 1) : $textOut;
        $parsed = json_decode($jsonStr, true);
        $icon = null;
        if (is_string(data_get($parsed, 'icon'))) {
            $icon = trim($parsed['icon']);
        } elseif (is_array(data_get($parsed, 'icons')) && count($parsed['icons']) > 0) {
            $icon = $parsed['icons'][0];
        }
        if (!$icon) {
            return response()->json(['error' => 'no_ai_icon'], 400);
        }
        return response()->json(['icon' => $icon]);
    }
}
