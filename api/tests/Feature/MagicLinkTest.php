<?php

namespace Tests\Feature;

use App\Mail\MagicLinkEmail;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class MagicLinkTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['name' => 'Test Tenant', 'domain' => 'test.localhost']);
        $this->user = User::factory()->create([
            'email' => 'user@example.com',
            'tenant_id' => $this->tenant->id
        ]);
    }

    public function test_can_request_magic_link()
    {
        Mail::fake();

        $response = $this->postJson('/api/login/magic', [
            'email' => 'user@example.com'
        ]);

        $response->assertStatus(200)
                 ->assertJson(['message' => 'Magic link sent to your email.']);

        Mail::assertSent(MagicLinkEmail::class, function ($mail) {
            return $mail->hasTo('user@example.com');
        });
    }

    public function test_cannot_request_magic_link_for_non_existent_email()
    {
        $response = $this->postJson('/api/login/magic', [
            'email' => 'nonexistent@example.com'
        ]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['email']);
    }

    public function test_can_login_with_valid_signed_url()
    {
        // Generate valid signed URL
        $url = URL::temporarySignedRoute(
            'magic.verify',
            now()->addMinutes(15),
            ['id' => $this->user->id]
        );

        // Parse path from URL since getJson expects path
        $path = parse_url($url, PHP_URL_PATH) . '?' . parse_url($url, PHP_URL_QUERY);

        $response = $this->getJson($path);

        $response->assertStatus(200)
                 ->assertJsonStructure(['token', 'user', 'message']);

        $this->assertAuthenticatedAs($this->user);
    }

    public function test_cannot_login_with_invalid_signature()
    {
        $url = URL::temporarySignedRoute(
            'magic.verify',
            now()->addMinutes(15),
            ['id' => $this->user->id]
        );

        // Tamper with signature
        $tamperedUrl = $url . 'invalid';
        $path = parse_url($tamperedUrl, PHP_URL_PATH) . '?' . parse_url($tamperedUrl, PHP_URL_QUERY);

        $response = $this->getJson($path);

        $response->assertStatus(403);
        $this->assertGuest();
    }

    public function test_cannot_login_with_expired_signature()
    {
        // Generate expired URL
        $url = URL::temporarySignedRoute(
            'magic.verify',
            now()->subMinute(),
            ['id' => $this->user->id]
        );

        $path = parse_url($url, PHP_URL_PATH) . '?' . parse_url($url, PHP_URL_QUERY);

        $response = $this->getJson($path);

        $response->assertStatus(403);
        $this->assertGuest();
    }
}
