<?php

namespace App\Services\Meta;

use App\Contracts\MetaApiClientInterface;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Client\Response;

class RealMetaApiClient implements MetaApiClientInterface
{
    protected $baseUrl = 'https://graph.facebook.com/v19.0';
    protected $appSecret;

    public function __construct()
    {
        // Try to get app secret from settings if available
        $this->appSecret = \App\Models\SystemSetting::where('key', 'meta_app_secret')->value('value') 
            ?? config('services.facebook.client_secret');
    }

    public function get(string $endpoint, array $params = []): array
    {
        $url = $this->buildUrl($endpoint);
        
        // Add appsecret_proof if access_token is present
        if (isset($params['access_token']) && $this->appSecret) {
            $params['appsecret_proof'] = hash_hmac('sha256', $params['access_token'], $this->appSecret);
        }

        /** @var Response $response */
        $response = Http::timeout(30)
            ->retry(3, 1000)
            ->get($url, $params);

        if ($response->failed()) {
            $this->handleError($response, $endpoint);
        }

        return $response->json();
    }

    public function post(string $endpoint, array $data = []): array
    {
        $url = $this->buildUrl($endpoint);

        // Add appsecret_proof if access_token is present
        if (isset($data['access_token']) && $this->appSecret) {
            $data['appsecret_proof'] = hash_hmac('sha256', $data['access_token'], $this->appSecret);
        }
        
        /** @var Response $response */
        $response = Http::timeout(30)
            ->retry(2, 2000)
            ->post($url, $data);

        if ($response->failed()) {
            $this->handleError($response, $endpoint);
        }

        return $response->json();
    }

    protected function buildUrl(string $endpoint): string
    {
        if (str_starts_with($endpoint, 'http')) {
            return $endpoint;
        }
        
        $endpoint = ltrim($endpoint, '/');
        
        return "{$this->baseUrl}/{$endpoint}";
    }

    protected function handleError(Response $response, $endpoint)
    {
        $data = $response->json();
        $error = $data['error'] ?? [];
        
        $message = $error['message'] ?? 'Unknown error';
        $code = $error['code'] ?? $response->status();
        $subcode = $error['error_subcode'] ?? null;
        $userTitle = $error['error_user_title'] ?? null;
        $userMsg = $error['error_user_msg'] ?? null;

        $logMsg = "Meta API Error [{$endpoint}]: {$message} (Code: {$code})";
        if ($subcode) $logMsg .= " (Subcode: {$subcode})";
        if ($userMsg) $logMsg .= " UserMsg: {$userMsg}";

        Log::error($logMsg);

        // Check for Rate Limit specifically
        if ($code == 4 || $code == 17 || $code == 32 || $code == 613) {
            throw new \Exception("Meta Rate Limit Reached: " . ($userMsg ?? $message));
        }

        throw new \Exception("Meta API Error: " . ($userMsg ?? $message) . " (Code: {$code})");
    }
}
