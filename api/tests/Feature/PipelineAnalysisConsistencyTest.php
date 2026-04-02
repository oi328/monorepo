<?php

namespace Tests\Feature;

use App\Models\CrmSetting;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PipelineAnalysisConsistencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_pipeline_analysis_by_stage_matches_stats_by_stage_for_same_filters(): void
    {
        $tenant = Tenant::factory()->create([
            'name' => 'Tenant A',
            'domain' => 'tenant-a',
            'status' => 'active',
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
        ]);

        Sanctum::actingAs($user);

        CrmSetting::create([
            'tenant_id' => null,
            'settings' => ['duplicationSystem' => true],
        ]);

        // 3 real cancel leads.
        Lead::factory()->count(3)->create([
            'tenant_id' => $tenant->id,
            'assigned_to' => $user->id,
            'stage' => 'Cancel',
            'status' => null,
        ]);

        // A duplicate lead (should not be counted in either endpoint).
        Lead::factory()->create([
            'tenant_id' => $tenant->id,
            'assigned_to' => $user->id,
            'stage' => 'duplicate',
            'status' => 'duplicate',
        ]);

        $stats = $this->getJson('/api/leads/stats?assigned_to=' . $user->id)
            ->assertStatus(200)
            ->json();

        $pipeline = $this->getJson('/api/leads/pipeline-analysis?assigned_to=' . $user->id)
            ->assertStatus(200)
            ->json();

        $statsCancel = (int) (($stats['byStage']['Cancel'] ?? 0));

        $pipelineCancel = 0;
        foreach (($pipeline['byStage'] ?? []) as $row) {
            if (($row['stage'] ?? null) === 'Cancel') {
                $pipelineCancel += (int) ($row['count'] ?? 0);
            }
        }

        $this->assertSame(3, $statsCancel, 'stats.byStage.Cancel should equal 3');
        $this->assertSame(3, $pipelineCancel, 'pipeline-analysis.byStage.Cancel should equal 3');
    }
}

