<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserRoleAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_role_attribute_prefers_job_title_when_multiple_roles_exist(): void
    {
        $tenant = Tenant::factory()->create(['slug' => 'role-attr', 'status' => 'active']);

        setPermissionsTeamId($tenant->id);

        $sales = Role::create(['name' => 'Sales Person', 'guard_name' => 'web', 'tenant_id' => $tenant->id]);
        $director = Role::create(['name' => 'Director', 'guard_name' => 'web', 'tenant_id' => $tenant->id]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'job_title' => 'Director',
        ]);

        // Simulate legacy/misconfigured users that ended up with multiple roles.
        $user->assignRole($sales);
        $user->assignRole($director);
        $user->refresh();

        $this->assertSame('Director', $user->role);
    }

    public function test_creating_user_sets_single_selected_role(): void
    {
        $tenant = Tenant::factory()->create(['slug' => 'role-store', 'status' => 'active']);
        $creator = User::factory()->create(['tenant_id' => $tenant->id]);

        setPermissionsTeamId($tenant->id);
        Role::create(['name' => 'Sales Person', 'guard_name' => 'web', 'tenant_id' => $tenant->id]);
        Role::create(['name' => 'Marketing Manager', 'guard_name' => 'web', 'tenant_id' => $tenant->id]);
        $creator->syncRoles(['Sales Person']);

        $this->actingAs($creator);

        $response = $this->postJson("http://{$tenant->slug}.localhost/api/users", [
            'name' => 'New User',
            'email' => 'new.user@example.com',
            'password' => 'password123',
            'role' => 'Marketing Manager',
        ]);

        $response->assertStatus(201);
        $response->assertJsonFragment(['job_title' => 'Marketing Manager']);
        $response->assertJsonFragment(['role' => 'Marketing Manager']);

        $createdId = $response->json('id');
        $created = User::findOrFail($createdId);

        setPermissionsTeamId($tenant->id);
        $this->assertSame(['Marketing Manager'], $created->getRoleNames()->values()->all());
        $this->assertSame('Marketing Manager', $created->role);
    }
}

