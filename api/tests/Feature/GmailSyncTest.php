<?php

namespace Tests\Feature;

use App\Models\EmailMessage;
use App\Models\GoogleIntegration;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use App\Services\GoogleAuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;
use Illuminate\Support\Facades\Config;

class GmailSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_gmail_sync_command_processes_integration()
    {
        // 1. Setup Data
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        
        $integration = GoogleIntegration::create([
            'tenant_id' => $tenant->id,
            'google_id' => '123456789',
            'google_email' => 'tenant@example.com',
            'access_token' => 'fake_access_token',
            'refresh_token' => 'fake_refresh_token',
            'expires_at' => now()->addHour(),
            'status' => true,
        ]);

        $lead = Lead::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'client@example.com',
        ]);

        // 2. Mock Google API
        Http::fake([
            // Mock Token Refresh (if needed, but our token is valid)
            'oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'new_fake_token',
                'expires_in' => 3600,
            ], 200),

            // Mock List Messages
            'gmail.googleapis.com/gmail/v1/users/me/messages?*' => Http::response([
                'messages' => [
                    ['id' => 'msg_123', 'threadId' => 'thread_123']
                ],
                'resultSizeEstimate' => 1
            ], 200),

            // Mock Get Message Details
            'gmail.googleapis.com/gmail/v1/users/me/messages/msg_123' => Http::response([
                'id' => 'msg_123',
                'payload' => [
                    'headers' => [
                        ['name' => 'Subject', 'value' => 'Test Subject'],
                        ['name' => 'From', 'value' => 'Client Name <client@example.com>'],
                        ['name' => 'To', 'value' => 'tenant@example.com'],
                    ],
                    'body' => [
                        'data' => base64_encode('Test Body Content')
                    ]
                ],
                'internalDate' => now()->timestamp * 1000
            ], 200),
        ]);

        // 3. Run Command
        // We need to mock GoogleAuthService to avoid real constructor checks if any
        // But the service constructor checks DB/Config, which should be fine in test env if we config it.
        Config::set('services.google.client_id', 'test_client_id');
        Config::set('services.google.client_secret', 'test_client_secret');
        Config::set('services.google.redirect', 'http://localhost/callback');

        $this->artisan('gmail:sync')
             ->assertExitCode(0);

        // 4. Assertions
        $this->assertDatabaseHas('email_messages', [
            'tenant_id' => $tenant->id,
            'lead_id' => $lead->id,
            'subject' => 'Test Subject',
            'from' => 'client@example.com',
            'message_id' => 'msg_123',
        ]);
    }
}
