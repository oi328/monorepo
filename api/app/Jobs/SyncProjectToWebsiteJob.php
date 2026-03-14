<?php

namespace App\Jobs;

use App\Models\Project;
use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncProjectToWebsiteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $project;
    public $tenantId;

    /**
     * Create a new job instance.
     */
    public function __construct(Project $project, $tenantId = null)
    {
        $this->project = $project;
        $this->tenantId = $tenantId ?: $project->tenant_id;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $tenant = Tenant::find($this->tenantId);

        if (!$tenant || !$tenant->website_url) {
            return;
        }

        try {
            $endpoint = rtrim($tenant->website_url, '/') . '/api/projects/sync';

            $response = Http::timeout(10)->post($endpoint, [
                'project' => [
                    'id' => $this->project->id,
                    'name_en' => $this->project->name,
                    'name_ar' => $this->project->name_ar,
                    'description_en' => $this->project->description,
                    'description_ar' => $this->project->description_ar,
                    'status' => $this->project->status,
                    'completion' => $this->project->completion,
                    'category' => $this->project->category,
                    'developer' => $this->project->developer,
                    'country' => $this->project->country,
                    'city' => $this->project->city,
                    'address_en' => $this->project->address,
                    'address_ar' => $this->project->address_ar,
                    'lat' => $this->project->lat,
                    'lng' => $this->project->lng,
                    'min_price' => $this->project->min_price,
                    'max_price' => $this->project->max_price,
                    'currency' => $this->project->currency,
                    'amenities' => $this->project->amenities,
                    'main_image' => $this->project->image,
                    'gallery' => $this->project->gallery_images,
                    'master_plan' => $this->project->master_plan_images,
                    'video_url' => $this->project->video_urls,
                    'updated_at' => $this->project->updated_at,
                ],
                'api_token' => config('services.website_sync.token'),
                'tenant_slug' => $tenant->slug
            ]);

            if ($response->successful()) {
                Log::info("Job: Project {$this->project->id} auto-synced to website: {$endpoint}");
            }
            else {
                Log::warning("Job: Failed to sync project {$this->project->id}. Status: " . $response->status());
            }

        }
        catch (\Exception $e) {
            Log::error("Job Exception: Could not sync project {$this->project->id} to website: " . $e->getMessage());
        }
    }
}
