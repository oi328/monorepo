<?php

namespace Tests\Feature;

use App\Models\LandingPage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicLandingPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_landing_page_route_works_globally()
    {
        // Create a tenant
        $tenant = Tenant::create([
            'id' => 'test_tenant',
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
            'status' => 'active',
        ]);

        // Create a landing page for this tenant
        $landingPage = LandingPage::create([
            'tenant_id' => $tenant->id,
            'title' => 'Test Page',
            'slug' => 'test-page-123',
            'is_active' => true,
            'campaign_id' => null, // Optional
            // Add other required fields if any
        ]);

        // Access the public route without tenant subdomain (simulating central domain access)
        $response = $this->getJson('/api/p/test-page-123');

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Test Page')
            ->assertJsonPath('data.slug', 'test-page-123');
    }

    public function test_store_lead_works_globally()
    {
        $tenant = Tenant::create([
            'id' => 'test_tenant_lead',
            'name' => 'Test Tenant Lead',
            'slug' => 'test-tenant-lead',
            'status' => 'active',
        ]);

        $landingPage = LandingPage::create([
            'tenant_id' => $tenant->id,
            'title' => 'Test Page Lead',
            'slug' => 'test-page-lead',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/p/test-page-lead/lead', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '1234567890',
        ]);

        $response->assertStatus(201);
        
        $this->assertDatabaseHas('leads', [
            'tenant_id' => $tenant->id,
            'email' => 'john@example.com',
        ]);
    }
}
