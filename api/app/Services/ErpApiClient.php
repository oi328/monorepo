<?php

namespace App\Services;

use App\Models\ErpSetting;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class ErpApiClient
{
    public function __construct(protected ErpSetting $settings)
    {
    }

    public function baseUrl(): string
    {
        return rtrim((string)($this->settings->base_url ?? ''), '/');
    }

    public function client(): PendingRequest
    {
        $timeout = (int)($this->settings->advanced_settings['timeout_seconds'] ?? 20);
        $verifySsl = (bool)($this->settings->advanced_settings['verify_ssl'] ?? true);
        $headers = is_array($this->settings->advanced_settings['headers'] ?? null)
            ? $this->settings->advanced_settings['headers']
            : [];

        $client = Http::timeout(max(1, $timeout))
            ->withHeaders($headers)
            ->withOptions(['verify' => $verifySsl]);

        $auth = (string)($this->settings->auth_type ?? '');
        if ($auth === 'Bearer Token') {
            if (!empty($this->settings->api_key)) {
                $client = $client->withToken($this->settings->api_key);
            }
        } elseif ($auth === 'Basic Auth') {
            if (!empty($this->settings->username) && !empty($this->settings->password)) {
                $client = $client->withBasicAuth($this->settings->username, $this->settings->password);
            }
        } elseif ($auth === 'API Key') {
            $keyHeader = (string)($this->settings->advanced_settings['api_key_header'] ?? 'X-API-KEY');
            if (!empty($this->settings->api_key)) {
                $client = $client->withHeaders([$keyHeader => $this->settings->api_key]);
            }
        }

        return $client;
    }

    public function get(string $path, array $query = []): array
    {
        $url = $this->baseUrl() . '/' . ltrim($path, '/');
        $resp = $this->client()->get($url, $query);
        if (!$resp->successful()) {
            throw new \RuntimeException('ERP request failed: HTTP ' . $resp->status() . ' ' . $resp->body(), $resp->status());
        }
        $json = $resp->json();
        if (!is_array($json)) {
            throw new \RuntimeException('ERP response is not valid JSON');
        }
        return $json;
    }
}

