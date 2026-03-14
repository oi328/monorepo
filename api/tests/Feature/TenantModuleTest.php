<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\Tenant;
use App\Models\Module;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TenantModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_list_tenant_modules()
    {
        $tenant = Tenant::factory()->create();
        $module = Module::factory()->create(['is_active' => true]);
        
        $user = User::factory()->create(['is_super_admin' => true]); 
        
        $response = $this->actingAs($user)->getJson("/api/super-admin/tenants/{$tenant->id}/modules");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'tenant' => ['id', 'name', 'slug'],
                'modules' => [
                    '*' => ['id', 'name', 'slug', 'is_enabled', 'config']
                ]
            ]);
    }

    public function test_super_admin_can_update_tenant_modules()
    {
        $tenant = Tenant::factory()->create();
        $module = Module::factory()->create(['is_active' => true]);
        $user = User::factory()->create(['is_super_admin' => true]);

        $payload = [
            'modules' => [
                [
                    'id' => $module->id,
                    'is_enabled' => true,
                    'config' => ['feature_x' => true]
                ]
            ]
        ];

        $response = $this->actingAs($user)->putJson("/api/super-admin/tenants/{$tenant->id}/modules", $payload);

        $response->assertStatus(200);
        
        $this->assertDatabaseHas('tenant_modules', [
            'tenant_id' => $tenant->id,
            'module_id' => $module->id,
            'is_enabled' => true
        ]);
    }

    public function test_tenant_resolution_is_cached()
    {
        // Use a known slug
        $slug = 'cache-test';
        $tenant = Tenant::factory()->create(['slug' => $slug, 'status' => 'active']);
        
        // Clear cache
        Cache::forget("tenant_{$slug}");

        // Enable Query Log
        DB::enableQueryLog();

        // 1. First Request
        $this->postJson("http://{$slug}.localhost/api/auth/login", ['email' => 'dummy', 'password' => 'dummy']);
        
        $queries = DB::getQueryLog();
        $hasTenantQuery = collect($queries)->contains(function ($query) use ($slug) {
            return str_contains($query['query'], 'select') && 
                   str_contains($query['query'], 'tenants') && 
                   collect($query['bindings'])->contains($slug);
        });

        $this->assertTrue($hasTenantQuery, "First request should query database for tenant");

        // Flush Log
        DB::flushQueryLog();

        // 2. Second Request
        $this->postJson("http://{$slug}.localhost/api/auth/login", ['email' => 'dummy', 'password' => 'dummy']);
        
        $queries2 = DB::getQueryLog();
        $hasTenantQuery2 = collect($queries2)->contains(function ($query) use ($slug) {
             return str_contains($query['query'], 'select') && 
                    str_contains($query['query'], 'tenants') && 
                    collect($query['bindings'])->contains($slug);
        });

        $this->assertFalse($hasTenantQuery2, "Second request should NOT query database for tenant (cached)");
    }
}
