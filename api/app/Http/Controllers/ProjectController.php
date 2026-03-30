<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Traits\InventoryDeleteAuthorization;
use Illuminate\Http\Request;
use App\Jobs\SyncProjectToWebsiteJob;

class ProjectController extends Controller
{
    use InventoryDeleteAuthorization;

    public function index(Request $request)
    {
        $query = Project::query();

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }

        if ($request->has('all')) {
            return response()->json($query->orderBy('created_at', 'desc')->get());
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(50));
    }

    public function stats()
    {
        // Calculate stats
        $activeProjects = Project::where('status', 'Active')->count();
        $totalUnits = Project::sum('units');
        
        return response()->json([
            'total_units' => $totalUnits,
            'active_projects' => $activeProjects,
            'total_projects' => Project::count()
        ]);
    }

    public function show(Project $project)
    {
        return response()->json(['data' => $project]);
    }

    public function store(Request $request)
    {
        // Validation
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'status' => 'nullable|string',
            // Add other validations as needed
        ]);

        $data = $request->all();

        // 1. Decode JSON fields first
        $jsonFields = ['publish_data', 'payment_plan', 'cil', 'amenities', 'gallery_images', 'master_plan_images'];
        foreach ($jsonFields as $field) {
            if (isset($data[$field]) && is_string($data[$field])) {
                $decoded = json_decode($data[$field], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $data[$field] = $decoded;
                }
            }
        }

        // 2. Handle file uploads and merge with existing data
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('projects', 'public');
            $data['image'] = $path;
        }

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('projects/logos', 'public');
            $data['logo'] = $path;
        }
        
        // Handle gallery
        if ($request->hasFile('gallery_files')) {
            $galleryPaths = $data['gallery_images'] ?? [];
            if (!is_array($galleryPaths)) $galleryPaths = [];
            
            foreach ($request->file('gallery_files') as $file) {
                $galleryPaths[] = $file->store('projects/gallery', 'public');
            }
            $data['gallery_images'] = $galleryPaths;
        }

        // Handle master plan files
        if ($request->hasFile('master_plan_files')) {
            $masterPlanPaths = $data['master_plan_images'] ?? [];
            if (!is_array($masterPlanPaths)) $masterPlanPaths = [];

            foreach ($request->file('master_plan_files') as $file) {
                $masterPlanPaths[] = $file->store('projects/master_plans', 'public');
            }
            $data['master_plan_images'] = $masterPlanPaths;
        }

        // Handle CIL attachments
        if ($request->hasFile('cil_attachments_files')) {
            $cilPaths = [];
            foreach ($request->file('cil_attachments_files') as $file) {
                $cilPaths[] = $file->store('projects/cil_attachments', 'public');
            }
            $cilData = $data['cil'] ?? [];
            if (!is_array($cilData)) $cilData = [];
            $cilData['attachments'] = array_merge($cilData['attachments'] ?? [], $cilPaths);
            $data['cil'] = $cilData;
        }
        
        // Remove file inputs from data
        unset($data['gallery_files']);
        unset($data['master_plan_files']);
        unset($data['cil_attachments_files']);

        $project = Project::create($data);

        return response()->json(['data' => $project], 201);
    }

    public function update(Request $request, Project $project)
    {
        $data = $request->all();

        // 1. Decode JSON fields first
        $jsonFields = ['publish_data', 'payment_plan', 'cil', 'amenities', 'gallery_images', 'master_plan_images'];
        foreach ($jsonFields as $field) {
            if (isset($data[$field]) && is_string($data[$field])) {
                $decoded = json_decode($data[$field], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $data[$field] = $decoded;
                }
            }
        }

        // 2. Handle file uploads and merge
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('projects', 'public');
            $data['image'] = $path;
        }

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('projects/logos', 'public');
            $data['logo'] = $path;
        }

        // Handle gallery
        if ($request->hasFile('gallery_files')) {
            $galleryPaths = $data['gallery_images'] ?? [];
            if (!is_array($galleryPaths)) $galleryPaths = [];

            foreach ($request->file('gallery_files') as $file) {
                $galleryPaths[] = $file->store('projects/gallery', 'public');
            }
            $data['gallery_images'] = $galleryPaths;
        }

        // Handle master plan files
        if ($request->hasFile('master_plan_files')) {
            $masterPlanPaths = $data['master_plan_images'] ?? [];
            if (!is_array($masterPlanPaths)) $masterPlanPaths = [];

            foreach ($request->file('master_plan_files') as $file) {
                $masterPlanPaths[] = $file->store('projects/master_plans', 'public');
            }
            $data['master_plan_images'] = $masterPlanPaths;
        }

        // Handle CIL attachments
        if ($request->hasFile('cil_attachments_files')) {
            $cilPaths = [];
            foreach ($request->file('cil_attachments_files') as $file) {
                $cilPaths[] = $file->store('projects/cil_attachments', 'public');
            }
             $cilData = $data['cil'] ?? [];
             if (!is_array($cilData)) $cilData = [];
             $cilData['attachments'] = array_merge($cilData['attachments'] ?? [], $cilPaths);
             $data['cil'] = $cilData;
        }

        // Remove file inputs from data
        unset($data['gallery_files']);
        unset($data['master_plan_files']);
        unset($data['cil_attachments_files']);

        $project->update($data);

        return response()->json(['data' => $project]);
    }

    public function destroy(Request $request, Project $project)
    {
        if ($resp = $this->authorizeInventoryDelete($request, 'realestate')) {
            return $resp;
        }
        $project->delete();
        return response()->json(null, 204);
    }
}
