<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\SystemError;
use App\Models\Tenant;

class SystemErrorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenants = Tenant::limit(5)->get();
        $tenantIds = $tenants->pluck('id')->toArray();
        $tenantIds[] = null; // System errors

        $services = ['API', 'Webhook', 'Jobs', 'Database', 'Auth'];
        $endpoints = [
            'POST /api/v1/leads',
            'GET /api/v1/dashboard',
            'POST /api/whatsapp/webhook',
            'SendCampaignEmailJob',
            'SyncMetaLeadsJob',
            'POST /login'
        ];
        $levels = ['error', 'warning', 'info'];

        for ($i = 0; $i < 20; $i++) {
            SystemError::create([
                'tenant_id' => $tenantIds[array_rand($tenantIds)],
                'service' => $services[array_rand($services)],
                'endpoint' => $endpoints[array_rand($endpoints)],
                'status' => rand(400, 500),
                'level' => $levels[array_rand($levels)],
                'count' => rand(1, 50),
                'message' => 'Simulated error for testing',
                'stack_trace' => 'Trace...',
                'last_seen_at' => now()->subMinutes(rand(1, 1440)),
                'created_at' => now()->subMinutes(rand(1, 1440)),
            ]);
        }
    }
}
