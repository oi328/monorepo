<?php

namespace App\Console\Commands;

use App\Models\EmailMessage;
use App\Models\Lead;
use App\Models\OauthToken;
use App\Services\GoogleAuthService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncGmailMessages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'gmail:sync';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync incoming emails from Gmail for all connected users';

    /**
     * Execute the console command.
     */
    public function handle(GoogleAuthService $googleAuthService)
    {
        // Ensure GoogleAuthService initializes config
        
        $tenants = \App\Models\Tenant::cursor();
        $this->info("Starting Gmail Sync for all tenants...");

        foreach ($tenants as $tenant) {
            $this->info("Processing Tenant: {$tenant->id} ({$tenant->domain})");
            
            try {
                $tenant->makeCurrent();
                
                // 1. Process User-Specific Tokens
                $userTokens = OauthToken::where('provider', 'gmail')
                    ->where('tenant_id', $tenant->id)
                    ->get();
                
                foreach ($userTokens as $token) {
                    $this->info("Syncing for User ID: {$token->user_id}");
                    try {
                        $this->syncAccount($token, $googleAuthService, "Tenant {$tenant->id} - User {$token->user_id}");
                    } catch (\Exception $e) {
                        $this->error("Failed to sync user {$token->user_id}: " . $e->getMessage());
                        Log::error("Gmail Sync Error for user {$token->user_id}: " . $e->getMessage());
                    }
                }

                // 2. Process Tenant-Wide Integrations
                $integrations = \App\Models\GoogleIntegration::whereNotNull('access_token')->get();
                
                foreach ($integrations as $integration) {
                    $this->info("Syncing for Tenant Integration ID: {$integration->id}");
                    try {
                        $this->syncAccount($integration, $googleAuthService, "Tenant {$tenant->id} - Integration {$integration->id}");
                    } catch (\Exception $e) {
                        $this->error("Failed to sync tenant integration {$integration->id}: " . $e->getMessage());
                        Log::error("Gmail Sync Error for tenant integration {$integration->id}: " . $e->getMessage());
                    }
                }

            } catch (\Exception $e) {
                $this->error("Error processing tenant {$tenant->id}: " . $e->getMessage());
            }
        }

        return 0;
    }

    protected function syncAccount($token, GoogleAuthService $googleAuthService, $logPrefix = '')
    {
        // Tenant is already current, so we don't need to switch.
        // But we should verify we are in the correct context if needed.
        
        // 1. Get Valid Access Token
        $accessToken = null;
        if ($token instanceof OauthToken) {
            $accessToken = $googleAuthService->getValidOauthToken($token);
        } elseif ($token instanceof \App\Models\GoogleIntegration) {
            $accessToken = $googleAuthService->getValidAccessToken($token);
        }

        if (!$accessToken) {
            $this->warn("Failed to get valid access token for {$logPrefix}. Skipping.");
            return;
        }

        // 2. Fetch Messages (last 20 to start with)
        // We can optimize this with historyId later
        $response = Http::withToken($accessToken)
            ->get('https://gmail.googleapis.com/gmail/v1/users/me/messages', [
                'maxResults' => 20,
                'q' => 'label:INBOX',
            ]);

        /** @var \Illuminate\Http\Client\Response $response */
        if (!$response->successful()) {
            throw new \Exception('Failed to list messages: ' . $response->body());
        }

        $messages = $response->json()['messages'] ?? [];
        $this->info("Found " . count($messages) . " messages.");

        foreach ($messages as $msgData) {
            $messageId = $msgData['id'];

            // Check if already exists
            if (EmailMessage::where('message_id', $messageId)->exists()) {
                continue;
            }

            $this->processMessage($messageId, $accessToken, $token);
        }
    }

    protected function processMessage($messageId, $accessToken, $token)
    {
        $response = Http::withToken($accessToken)
            ->get("https://gmail.googleapis.com/gmail/v1/users/me/messages/{$messageId}");

        /** @var \Illuminate\Http\Client\Response $response */
        if (!$response->successful()) {
            $this->error("Failed to fetch message details for ID: $messageId");
            return;
        }

        $data = $response->json();
        $payload = $data['payload'] ?? [];
        $headers = collect($payload['headers'] ?? []);

        $subject = $headers->firstWhere('name', 'Subject')['value'] ?? '(No Subject)';
        $from = $headers->firstWhere('name', 'From')['value'] ?? '';
        $to = $headers->firstWhere('name', 'To')['value'] ?? '';
        
        // Parse email address from "Name <email@example.com>"
        preg_match('/<([^>]+)>/', $from, $matches);
        $fromEmail = $matches[1] ?? $from;

        // Find Lead
        // We look for a lead in the same tenant with this email
        $lead = Lead::where('tenant_id', $token->tenant_id)
            ->where('email', $fromEmail)
            ->first();

        // Decode Body
        $body = $this->getBody($payload);

        EmailMessage::create([
            'tenant_id' => $token->tenant_id,
            'lead_id' => $lead ? $lead->id : null,
            'from' => $fromEmail,
            'to' => $to,
            'subject' => $subject,
            'body' => $body,
            'direction' => 'inbound',
            'status' => 'received', // or 'delivered'
            'message_id' => $messageId,
            'raw' => ['gmail_data' => $data], // Store full data for debugging
            'created_at' => isset($data['internalDate']) ? Carbon::createFromTimestampMs($data['internalDate']) : now(),
        ]);

        $this->info("Imported message: $subject from $fromEmail");
    }

    protected function getBody($payload)
    {
        $body = '';
        if (isset($payload['body']['data'])) {
            $body = $this->decodeBody($payload['body']['data']);
        } elseif (isset($payload['parts'])) {
            foreach ($payload['parts'] as $part) {
                if ($part['mimeType'] === 'text/html' && isset($part['body']['data'])) {
                    $body = $this->decodeBody($part['body']['data']);
                    break; 
                }
                if ($part['mimeType'] === 'text/plain' && isset($part['body']['data']) && empty($body)) {
                    $body = $this->decodeBody($part['body']['data']);
                }
                // Handle nested parts (multipart/alternative)
                if (isset($part['parts'])) {
                    foreach ($part['parts'] as $subPart) {
                        if ($subPart['mimeType'] === 'text/html' && isset($subPart['body']['data'])) {
                            $body = $this->decodeBody($subPart['body']['data']);
                            break 2;
                        }
                    }
                }
            }
        }
        return $body;
    }

    protected function decodeBody($data)
    {
        return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
    }
}
