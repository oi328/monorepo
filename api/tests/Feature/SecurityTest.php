<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_is_super_admin_is_guarded_from_mass_assignment()
    {
        $tenant = Tenant::create(['name' => 'Test Tenant', 'domain' => 'test.localhost']);

        // 1. Test Create Mass Assignment
        $user = User::create([
            'name' => 'Hacker',
            'email' => 'hacker@example.com',
            'password' => 'password',
            'tenant_id' => $tenant->id,
            'is_super_admin' => true, // Attempt to inject
        ]);

        $user->refresh(); // Load default value from DB

        $this->assertFalse((bool)$user->is_super_admin, 'is_super_admin should not be settable via create() mass assignment');

        // 2. Test Update Mass Assignment
        $user->update([
            'is_super_admin' => true
        ]);

        $user->refresh();
        $this->assertFalse($user->is_super_admin, 'is_super_admin should not be settable via update() mass assignment');
    }

    public function test_is_super_admin_cannot_be_injected_via_api_endpoints()
    {
        // Assuming there is a user update endpoint, e.g., PUT /api/user or similar.
        // Even if we don't have one, we want to ensure if one IS created, it respects fillable.
        // We will simulate a standard controller update pattern here.
        
        $tenant = Tenant::create(['name' => 'Test Tenant', 'domain' => 'test.localhost']);
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        
        // Simulate a request payload containing the malicious field
        $payload = [
            'name' => 'Updated Name',
            'is_super_admin' => true
        ];

        // Manually performing what a controller would do: $user->update($request->all()) or $request->validated()
        // If the controller uses $request->all(), fillable protects it.
        $user->fill($payload);
        $user->save();

        $user->refresh();
        $this->assertEquals('Updated Name', $user->name);
        $this->assertFalse($user->is_super_admin, 'Field should remain false after mass update attempt');
    }
}
