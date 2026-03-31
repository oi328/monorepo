<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\RecycleLead;
use App\Models\FieldValue;
use App\Models\Entity;
use App\Models\CrmSetting;
use App\Models\User;
use App\Models\Activity;
use App\Traits\ResolvesNotificationRecipients;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Support\PhoneNormalizer;

use App\Models\LeadReferral;
use App\Notifications\LeadReferralAssignedNotification;

class LeadController extends Controller
{
    use \App\Traits\UserHierarchyTrait;
    use ResolvesNotificationRecipients;

    private function resolveDuplicateRootId(?Lead $lead, ?int $tenantId = null): ?int
    {
        if (!$lead) return null;

        $seen = [];
        $current = $lead;

        for ($i = 0; $i < 10; $i++) {
            $id = (int) ($current->id ?? 0);
            if ($id <= 0) {
                return null;
            }
            if (isset($seen[$id])) {
                return $id;
            }
            $seen[$id] = true;

            $meta = is_array($current->meta_data ?? null) ? ($current->meta_data ?? []) : [];
            $dupOf = $meta['duplicate_of'] ?? null;
            if (!is_numeric($dupOf) || (int) $dupOf <= 0) {
                return $id;
            }

            $nextQuery = Lead::query()->where('id', (int) $dupOf);
            if ($tenantId) {
                $nextQuery->where('tenant_id', $tenantId);
            }
            $next = $nextQuery->first();
            if (!$next) {
                return $id;
            }
            $current = $next;
        }

        return (int) ($current->id ?? null);
    }
    
    protected function canViewDuplicates($user): bool
    {
        if (!$user) return false;
        if ($user->is_super_admin) return true;

        $roleLower = strtolower($user->role ?? '');
        $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
        $allowed = [
            'tenant admin',
            'tenant-admin', // Keep both variants just in case
            'admin',        // Usually alias for tenant admin in some contexts
            'director',
            'operation manager',
            // 'sales admin', // Removed as per new requirement
            // 'branch manager', // Removed as per new requirement
            // 'sales person', // Removed
            // 'salesperson',
            // 'team leader', // Removed
            // 'teamleader'
        ];

        $isAllowedRole = in_array($roleLower, $allowed, true)
            || !empty(array_intersect($roles, $allowed));

        if ($isAllowedRole) {
            return true;
        }

        return $user->can('view-duplicate-leads');
    }

    /**
     * Check if user can delete leads.
     * Director and Operation Manager cannot delete leads.
     */
    protected function canDeleteLead($user): bool
    {
        if (!$user) return false;
        if ($user->is_super_admin) return true;

        $role = strtolower($user->role ?? '');
        // بناءً على الورقة: المدير ومدير العمليات ملهومش صلاحية حذف نهائياً
        if (in_array($role, ['director', 'operation manager'])) {
            return false;
        }

        // الـ Admin فقط هو اللي بيمسح
        if (in_array($role, ['admin', 'tenant admin', 'tenant-admin'], true)) {
            return true;
        }

        return $user->can('delete-lead');
    }

    public function canImportLeads(Request $request)
    {
        $user = $request->user();
        $role = strtolower($user->role ?? '');
        $allowedRoles = ['admin', 'tenant admin', 'director', 'operation manager', 'branch manager', 'sales admin', 'sales manager'];
        
        return response()->json([
            'can_import' => in_array($role, $allowedRoles) || $user->is_super_admin
        ]);
    }

    
    /**
     * Check if user can delete users.
     * Director and Operation Manager cannot delete users.
     */
    protected function canDeleteUser($user): bool
    {
        if (!$user) return false;
        if ($user->is_super_admin) return true;

        $roleLower = strtolower($user->role ?? '');
        
        // Explicitly deny Director and Operation Manager
        if (str_contains($roleLower, 'director') || str_contains($roleLower, 'operation manager')) {
            return false;
        }

        // Allow Admin and Tenant Admin
        if (in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin'], true)) {
            return true;
        }

        return $user->can('delete-user');
    }

    protected function isBranchManager($user): bool
    {
        if (!$user) return false;
        $roleLower = strtolower($user->role ?? '');
        return str_contains($roleLower, 'branch manager');
    }

    protected function isSalesAdmin($user): bool
    {
        if (!$user) return false;
        $roleLower = strtolower($user->role ?? '');
        return str_contains($roleLower, 'sales admin');
    }

    protected function isReferralSupervisor($user, $lead)
    {
        if (!$user || !$lead) return false;
        
        return $lead->assigned_to != $user->id && 
               \App\Models\LeadReferral::where('lead_id', $lead->id)
                                       ->where('user_id', $user->id)
                                       ->exists();
    }

    /**
     * Bulk assign referral supervisor to leads.
     */
    public function bulkAssignReferral(Request $request)
    {
        $request->validate([
            'lead_ids' => 'required|array',
            'lead_ids.*' => 'exists:leads,id',
            'referral_user_id' => 'required|exists:users,id',
        ]);

        $referralUser = User::findOrFail($request->referral_user_id);
        $currentUser = $request->user();

        // 1. Referral user must belong to same tenant
        if ($referralUser->tenant_id !== $currentUser->tenant_id) {
             return response()->json(['message' => 'Referral user must belong to the same tenant.'], 403);
        }

        DB::beginTransaction();
        try {
            $leads = Lead::with('assignedAgent')->whereIn('id', $request->lead_ids)->lockForUpdate()->get();
            $successCount = 0;
            $errors = [];
            $notifications = [];

            foreach ($leads as $lead) {
                // 2. Lead must belong to authenticated tenant (Global scope usually handles this, but explicit check is safer)
                if ($lead->tenant_id !== $currentUser->tenant_id) {
                    $errors[] = "Lead {$lead->id}: Unauthorized tenant access.";
                    continue;
                }

                // 3. Referral user cannot be the assigned user
                if ($lead->assigned_to == $referralUser->id) {
                    $errors[] = "Lead {$lead->id}: Cannot assign referral supervisor as the assigned user.";
                    continue;
                }

                // 4. Role hierarchy enforcement (Removed)
                /*
                $assignedUser = $lead->assignedAgent;
                if ($assignedUser) {
                    // Default role_level to 0 if null
                    $referralLevel = $referralUser->role_level ?? 0;
                    $assignedLevel = $assignedUser->role_level ?? 0;
                    
                    if ($referralLevel <= $assignedLevel) {
                         $errors[] = "Lead {$lead->id}: Referral supervisor ({$referralUser->name}) must have a higher role level than the assigned user ({$assignedUser->name}).";
                         continue;
                    }
                }
                */

                // 5. Insert into lead_referrals (Ignore duplicates)
                $exists = LeadReferral::where('lead_id', $lead->id)
                            ->where('user_id', $referralUser->id)
                            ->exists();
                
                if (!$exists) {
                    LeadReferral::create([
                        'tenant_id' => $currentUser->tenant_id,
                        'lead_id' => $lead->id,
                        'user_id' => $referralUser->id,
                        'referrer_id' => $currentUser->id,
                    ]);
                    
                    // 6. Queue Notification (send after commit)
                    $notifications[] = [
                        'user' => $referralUser,
                        'notification' => new LeadReferralAssignedNotification($lead, $currentUser)
                    ];
                    $successCount++;
                }
            }

            if (count($errors) > 0) {
                DB::rollBack();
                // Return 403 as requested if ANY violation occurs
                return response()->json([
                    'message' => 'Validation failed for some leads.',
                    'errors' => $errors
                ], 403);
            }

            DB::commit();

            // Send notifications after commit
            foreach ($notifications as $item) {
                try {
                    $item['user']->notify($item['notification']);
                } catch (\Exception $e) {
                    // Log error but don't fail the request
                    \Illuminate\Support\Facades\Log::error('Failed to send referral notification: ' . $e->getMessage());
                }
            }

            return response()->json(['message' => "Successfully assigned referral supervisor to {$successCount} leads."]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Bulk Assign Referral Error: ' . $e->getMessage());
            return response()->json(['message' => 'Server Error', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get eligible referral supervisors for a list of leads.
     */
    public function getReferralSupervisors(Request $request)
    {
        $request->validate([
            'lead_ids' => 'nullable|array', // Optional: if provided, filter by hierarchy relative to these leads
            'lead_ids.*' => 'exists:leads,id',
        ]);

        $user = $request->user();
        $query = User::where('tenant_id', $user->tenant_id)
                     ->where('id', '!=', $user->id); // Can't refer to self? Or maybe yes? Prompt doesn't say. 
                     // Usually supervisor is someone else.

        /*
        if ($request->has('lead_ids') && !empty($request->lead_ids)) {
            // Find max role level of assigned users
            $maxAssignedLevel = Lead::whereIn('id', $request->lead_ids)
                ->join('users', 'leads.assigned_to', '=', 'users.id')
                ->max('users.role_level') ?? 0;

            $query->where('role_level', '>', $maxAssignedLevel);
        }
        */

        return response()->json($query->select('id', 'name', 'role_level')->get());
    }

    /**
     * Display a listing of referral leads.
     */
    public function referralIndex(Request $request)
    {
        try {
            $user = $request->user();
            
            // 1. Build Base Query
            $query = Lead::query()
                ->select('leads.*', 'lr.user_id as referral_user_id', 'lr.referrer_id', 'lr.created_at as referral_date')
                ->join('lead_referrals as lr', 'lr.lead_id', '=', 'leads.id');

            // Virtual Stage Logic:
            // If user is NOT the referral receiver (Manager/Admin)
            // AND stage is New/Cold Calls
            // AND no actions exist
            // THEN show 'pending'
            $query->addSelect(DB::raw("
                CASE 
                    WHEN (lower(leads.stage) IN ('new', 'new lead', 'cold calls', 'cold-call', 'coldcalls'))
                    AND NOT EXISTS (SELECT 1 FROM lead_actions WHERE lead_actions.lead_id = leads.id)
                    THEN 'pending'
                    ELSE leads.stage
                END as visible_stage
            "));

            // 2. Explicitly enforce tenant scope
            if (!$user->is_super_admin) {
                $query->where('leads.tenant_id', $user->tenant_id);
            }

            // 3. Visibility Logic per Role
            $roleLower = strtolower($user->role ?? '');
            $isAdminOrDirector = $user->is_super_admin || 
                                in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

            if (!$isAdminOrDirector) {
                $viewableUserIds = $this->getViewableUserIds($user);
                if ($viewableUserIds !== null) {
                    $query->whereIn('lr.user_id', $viewableUserIds);
                } else {
                    $query->where('lr.user_id', $user->id);
                }
            }

            // 4. Apply COMPREHENSIVE Filters
            $this->applyReferralFilters($query, $request);

            // 5. Eager Loading
            $query->with([
                'assignedAgent:id,name',
                'referral.user:id,name',
                'referral.referrer:id,name',
                'latestAction'
            ]);

            // 6. Sorting
            $sortBy = $request->get('sort_by', 'lr.created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            
            $sortMap = [
                'createdAt' => 'lr.created_at',
                'created_at' => 'lr.created_at',
                'referral_date' => 'lr.created_at',
                'name' => 'leads.name',
                'email' => 'leads.email',
                'phone' => 'leads.phone',
                'company' => 'leads.company',
                'stage' => 'leads.stage',
                'priority' => 'leads.priority',
                'source' => 'leads.source',
            ];

            $orderColumn = $sortMap[$sortBy] ?? 'lr.created_at';
            $query->orderBy($orderColumn, $sortOrder);

            $results = $query->paginate($request->get('per_page', 10));

            // Logic Adjustment: Referral Receiver should ALWAYS see the real stage
            $results->getCollection()->transform(function($lead) use ($user) {
                // If current user is the one who received this referral, show the actual stage
                if ((string)$lead->referral_user_id === (string)$user->id) {
                    $lead->visible_stage = $lead->stage;
                }
                return $lead;
            });

            return $results;

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Referral Leads Index Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch referral leads',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Apply comprehensive filters for referral leads.
     */
    private function applyReferralFilters($query, Request $request)
    {
        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('leads.name', 'like', "%{$search}%")
                  ->orWhere('leads.email', 'like', "%{$search}%")
                  ->orWhere('leads.phone', 'like', "%{$search}%")
                  ->orWhere('leads.company', 'like', "%{$search}%");
            });
        }

        // Basic Lead Fields
        if ($request->filled('source')) $query->whereIn('leads.source', (array)$request->source);
        if ($request->filled('priority')) $query->whereIn('leads.priority', (array)$request->priority);
        if ($request->filled('project')) $query->whereIn('leads.project', (array)$request->project);
        if ($request->filled('stage')) $query->whereIn('leads.stage', (array)$request->stage);
        if ($request->filled('campaign')) $query->whereIn('leads.campaign', (array)$request->campaign);
        if ($request->filled('location')) $query->whereIn('leads.location', (array)$request->location);
        if ($request->filled('manager_id')) $query->where('leads.manager_id', $request->manager_id);
        if ($request->filled('created_by')) $query->where('leads.created_by', $request->created_by);
        if ($request->filled('email')) $query->where('leads.email', 'like', "%{$request->email}%");
        
        // Referral Specific Fields
        if ($request->filled('referral_to')) $query->whereIn('lr.user_id', (array)$request->referral_to);
        if ($request->filled('referrer_id')) $query->whereIn('lr.referrer_id', (array)$request->referrer_id);
        if ($request->filled('assigned_to')) $query->whereIn('leads.assigned_to', (array)$request->assigned_to);
        if ($request->filled('manager_id')) $query->whereIn('leads.manager_id', (array)$request->manager_id);
        
        // Dates
        if ($request->filled('assign_date')) $query->whereDate('lr.created_at', $request->assign_date);
        if ($request->filled('creation_date')) $query->whereDate('leads.created_at', $request->creation_date);
        if ($request->filled('closed_date')) $query->whereDate('leads.closed_at', $request->closed_date);

        // Action Type Filter
        if ($request->filled('action_type')) {
            $actionTypes = (array)$request->action_type;
            $query->whereExists(function ($q) use ($actionTypes) {
                $q->select(DB::raw(1))
                  ->from('lead_actions')
                  ->whereColumn('lead_actions.lead_id', 'leads.id')
                  ->whereIn('lead_actions.action_type', $actionTypes);
            });
        }
    }

    /**
     * Get meetings report.
     */
    public function meetingsReport(Request $request)
    {
        try {
            $user = $request->user();
            $tenantId = $user->tenant_id;

            $query = DB::table('leads')
                ->join('lead_actions', 'lead_actions.lead_id', '=', 'leads.id')
                ->leftJoin('users', 'users.id', '=', 'leads.assigned_to')
                ->where('lead_actions.action_type', 'meeting')
                ->where('leads.tenant_id', $tenantId)
                ->whereNull('leads.deleted_at');

            // Visibility Logic
            $roleLower = strtolower($user->role ?? '');
            $isAdminOrDirector = $user->is_super_admin || 
                                in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

            if (!$isAdminOrDirector) {
                $viewableUserIds = $this->getViewableUserIds($user);
                if ($viewableUserIds !== null) {
                    $query->whereIn('leads.assigned_to', $viewableUserIds);
                } else {
                    $query->where('leads.assigned_to', $user->id);
                }
            }

            // Apply Filters
            if ($request->filled('sales_person')) {
                $query->whereIn('leads.assigned_to', (array)$request->sales_person);
            }
            if ($request->filled('manager_id')) {
                $query->whereIn('users.manager_id', (array)$request->manager_id);
            }
            if ($request->filled('project')) {
                $query->whereIn('leads.project', (array)$request->project);
            }
            if ($request->filled('source')) {
                $query->whereIn('leads.source', (array)$request->source);
            }
            if ($request->filled('start_date')) {
                $query->where('lead_actions.details->date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->where('lead_actions.details->date', '<=', $request->end_date);
            }
            if ($request->filled('meeting_date')) {
                $query->where('lead_actions.details->date', $request->meeting_date);
            }

            $results = $query->select(
                'leads.id',
                'leads.name',
                'leads.phone',
                'leads.source',
                'leads.project',
                'leads.assigned_to',
                'users.name as sales_person',
                DB::raw("COUNT(lead_actions.id) as arranged_meetings"),
                DB::raw("COUNT(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(lead_actions.details, '$.meeting_status')) = 'done' OR JSON_UNQUOTE(JSON_EXTRACT(lead_actions.details, '$.doneMeeting')) = 'true' THEN 1 END) as done_meetings"),
                DB::raw("COUNT(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(lead_actions.details, '$.meeting_status')) = 'no_show' THEN 1 END) as missed_meetings"),
                DB::raw("MAX(JSON_UNQUOTE(JSON_EXTRACT(lead_actions.details, '$.date'))) as meeting_date")
            )
            ->groupBy('leads.id', 'leads.name', 'leads.phone', 'leads.source', 'leads.project', 'leads.assigned_to', 'users.name')
            ->get()
            ->map(function($item) {
                $arranged = (int)$item->arranged_meetings;
                $done = (int)$item->done_meetings;
                // Calculate Score = (Done / Arrange) * 100
                $item->score = $arranged > 0 ? round(($done / $arranged) * 100) : 0;
                return $item;
            });

            return response()->json($results);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Meetings Report Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch meetings report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get distinct values for referral filters.
     */
    public function referralFilters(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }
            
            $tenantId = $user->tenant_id;

            // 1. Get Distinct values directly from DB tables for speed and safety
            $referredLeadQuery = DB::table('leads')
                ->join('lead_referrals', 'leads.id', '=', 'lead_referrals.lead_id')
                ->where('leads.tenant_id', $tenantId);

            // Simple Visibility Logic (Avoiding Trait methods if possible for debugging)
            $roleLower = strtolower($user->role ?? '');
            $isAdminOrDirector = $user->is_super_admin || 
                                in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

            if (!$isAdminOrDirector) {
                // If not admin, filter by referrals assigned to the user or their team
                try {
                    $viewableUserIds = $this->getViewableUserIds($user);
                    if ($viewableUserIds !== null) {
                        $referredLeadQuery->whereIn('lead_referrals.user_id', $viewableUserIds);
                    } else {
                        $referredLeadQuery->where('lead_referrals.user_id', $user->id);
                    }
                } catch (\Exception $e) {
                    // Fallback if trait fails
                    $referredLeadQuery->where('lead_referrals.user_id', $user->id);
                }
            }

            // Fetch Options with explicit column naming
            $projects = (clone $referredLeadQuery)->whereNotNull('leads.project')->where('leads.project', '!=', '')->distinct()->pluck('leads.project');
            $campaigns = (clone $referredLeadQuery)->whereNotNull('leads.campaign')->where('leads.campaign', '!=', '')->distinct()->pluck('leads.campaign');

            // Countries (From settings/locations/countries table)
            $countries = DB::table('countries')
                ->where('tenant_id', $tenantId)
                ->where('status', true)
                ->orderBy('name_en')
                ->get(['id', 'name_en', 'name_ar']);

            // Stages
            $stages = DB::table('stages')->where('tenant_id', $tenantId)->orderBy('order')->get(['id', 'name', 'name_ar', 'icon', 'color']);

            // Managers
            $managerIds = DB::table('users')->where('tenant_id', $tenantId)->whereNotNull('manager_id')->distinct()->pluck('manager_id');
            $managers = DB::table('users')->whereIn('id', $managerIds)->get(['id', 'name']);

            // Receivers
            $receiverIds = DB::table('lead_referrals')->where('tenant_id', $tenantId)->distinct()->pluck('user_id');
            $salesPersons = DB::table('users')->whereIn('id', $receiverIds)->get(['id', 'name']);

            // Referrers
            $referrerIds = DB::table('lead_referrals')->where('tenant_id', $tenantId)->distinct()->pluck('referrer_id');
            $referrers = DB::table('users')->whereIn('id', $referrerIds)->get(['id', 'name']);

            return response()->json([
                'stages' => $stages,
                'projects' => $projects->filter()->values()->map(fn($p) => ['id' => $p, 'name' => $p]),
                'countries' => $countries->map(fn($c) => [
                    'id' => $c->name_en, // Use name_en as value to match lead table column 'location'
                    'name' => $c->name_en,
                    'name_ar' => $c->name_ar
                ]),
                'campaigns' => $campaigns->filter()->values()->map(fn($c) => ['id' => $c, 'name' => $c]),
                'managers' => $managers,
                'salesPersons' => $salesPersons,
                'referrers' => $referrers,
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Referral Filters Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            return response()->json([
                'message' => 'Failed to fetch filters',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    /**
     * Get stats for referral leads.
     */
    public function referralStats(Request $request)
    {
        try {
            $user = $request->user();
            
            // Base query joined with lead_referrals
            $query = Lead::query()
                ->join('lead_referrals as lr', 'lr.lead_id', '=', 'leads.id');

            // Explicitly enforce tenant scope
            if (!$user->is_super_admin) {
                $query->where('leads.tenant_id', $user->tenant_id);
            }

            // Visibility Logic per Role (Same as referralIndex)
            $roleLower = strtolower($user->role ?? '');
            $isAdminOrDirector = $user->is_super_admin || 
                                in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

            if (!$isAdminOrDirector) {
                $viewableUserIds = $this->getViewableUserIds($user);
                if ($viewableUserIds !== null) {
                    $query->whereIn('lr.user_id', $viewableUserIds);
                } else {
                    $query->where('lr.user_id', $user->id);
                }
            }

            // Apply COMPREHENSIVE Filters (Sync with Index)
            $this->applyReferralFilters($query, $request);

            // Aggregate counts with Virtual Stage Logic
            // Note: We clone the query to avoid affecting the original for grouped counts
            $countsQuery = (clone $query);
            
            // To accurately count 'pending' vs 'new'/'cold calls', we need to check actions
            $counts = $countsQuery->selectRaw("
                count(*) as total,
                count(case when (
                    (lower(leads.stage) IN ('new', 'new lead', 'cold calls', 'cold-call', 'coldcalls'))
                    AND NOT EXISTS (SELECT 1 FROM lead_actions WHERE lead_actions.lead_id = leads.id)
                ) then 1 end) as pending_count,
                
                count(case when (
                    (lower(leads.stage) IN ('new', 'new lead'))
                    AND (
                        EXISTS (SELECT 1 FROM lead_actions WHERE lead_actions.lead_id = leads.id)
                        OR lr.user_id = ?
                    )
                ) then 1 end) as new_count,

                count(case when (
                    (lower(leads.stage) IN ('cold calls', 'cold-call', 'coldcalls'))
                    AND (
                        EXISTS (SELECT 1 FROM lead_actions WHERE lead_actions.lead_id = leads.id)
                        OR lr.user_id = ?
                    )
                ) then 1 end) as cold_call_count,

                count(case when lower(leads.stage) = 'duplicate' then 1 end) as duplicate_count
            ", [$user->id, $user->id])->first();

            // Group by visible_stage for dynamic pipeline cards
            // Since visible_stage depends on the user, we'll calculate it in the query
            $byStage = (clone $query)->select(DB::raw("
                CASE 
                    WHEN lr.user_id = $user->id THEN leads.stage
                    WHEN (lower(leads.stage) IN ('new', 'new lead', 'cold calls', 'cold-call', 'coldcalls'))
                    AND NOT EXISTS (SELECT 1 FROM lead_actions WHERE lead_actions.lead_id = leads.id)
                    THEN 'pending'
                    ELSE leads.stage
                END as effective_stage
            "), DB::raw('count(*) as count'))
                           ->whereNotNull('leads.stage')
                           ->groupBy('effective_stage')
                           ->pluck('count', 'effective_stage');

            return response()->json([
                'total' => $counts->total ?? 0,
                'new' => $counts->new_count ?? 0,
                'pending' => $counts->pending_count ?? 0,
                'coldCall' => $counts->cold_call_count ?? 0,
                'duplicate' => $counts->duplicate_count ?? 0,
                'byStage' => $byStage
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Referral Leads Stats Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch referral stats', 
                'error' => $e->getMessage(),
                'total' => 0,
                'new' => 0,
                'pending' => 0,
                'coldCall' => 0,
                'duplicate' => 0,
                'byStage' => []
            ], 500);
        }
    }

    /**
     * Build filtered query for leads.
     */
    private function buildFilteredLeadsQuery(Request $request, $user)
    {
        $query = Lead::query();

        // Explicitly enforce tenant scope
        if (!$user->is_super_admin) {
            $query->where('tenant_id', $user->tenant_id);
        }

        // 1. Hierarchy/Visibility Visibility
        $viewableIds = $this->getViewableUserIds($user);
        if ($viewableIds !== null) {
            $isManagerLike = $this->isBranchManager($user) || $this->isSalesAdmin($user) || $this->isSalesManager($user) || $this->isTeamLeader($user);
            if ($isManagerLike) {
                $query->where(function ($q) use ($viewableIds, $user) {
                    $q->whereIn('assigned_to', $viewableIds)
                      ->orWhere('manager_id', $user->id);
                });
            } else {
                $query->whereIn('assigned_to', $viewableIds);
            }
        }

        // 2. Duplicate Filtering
        $crm = \App\Models\CrmSetting::first();
        $enableDup = is_array($crm?->settings) ? (bool)($crm->settings['duplicationSystem'] ?? false) : false;
        $requestingDuplicates = $request->has('stage') && in_array('duplicate', (array)$request->stage);

        if ($enableDup && !$this->canViewDuplicates($user) && !$requestingDuplicates) {
            $query->where(function($q) {
                $q->where(function($s) {
                    $s->whereRaw("status is null or status != 'duplicate'");
                })->where(function($st) {
                    $st->whereRaw("stage is null or stage != 'duplicate'");
                });
            });
        }

        // 3. Search
        if ($request->filled('search')) {
            $search = trim((string) $request->search);
            $terms = preg_split('/\s+/', $search) ?: [];
            $terms = array_values(array_filter(array_map('trim', $terms), fn($t) => $t !== ''));
            $terms = array_slice($terms, 0, 5);

            $phoneVariants = PhoneNormalizer::isPhoneLike($search)
                ? PhoneNormalizer::variantsForSearch($search)
                : [];

            $query->where(function ($q) use ($search, $terms, $phoneVariants) {
                $applyTerm = function ($sub, string $term) use ($phoneVariants) {
                    $sub->where('name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%")
                        ->orWhere('company', 'like', "%{$term}%")
                        ->orWhere('notes', 'like', "%{$term}%")
                        ->orWhereHas('assignedAgent', function ($subQ) use ($term) {
                            $subQ->where('name', 'like', "%{$term}%");
                        })
                        // Search inside "Last Comment" column (latest action description/notes)
                        ->orWhereHas('latestAction', function ($aq) use ($term) {
                            $aq->where('description', 'like', "%{$term}%")
                                ->orWhere('details->notes', 'like', "%{$term}%");
                        });

                    if (!empty($phoneVariants)) {
                        foreach ($phoneVariants as $pv) {
                            $sub->orWhere('phone', 'like', "%{$pv}%");
                        }
                    } else {
                        $sub->orWhere('phone', 'like', "%{$term}%");
                    }
                };

                // Single term = classic OR search; multi term = AND across words (each word matches somewhere)
                if (count($terms) <= 1) {
                    $term = $terms[0] ?? $search;
                    $q->where(function ($sub) use ($applyTerm, $term) {
                        $applyTerm($sub, $term);
                    });
                } else {
                    foreach ($terms as $t) {
                        $q->where(function ($sub) use ($applyTerm, $t) {
                            $applyTerm($sub, $t);
                        });
                    }
                }
            });
        }

        // 4. Stage Filter (Including Pending Virtual Stage)
        if ($request->filled('stage')) {
            $stages = (array)$request->stage;
            $viewType = $request->get('view_type', 'all_leads');
            $isManager = !in_array(strtolower($user->role ?? ''), ['sales person', 'salesperson']);
            $isAllLeadsView = $viewType === 'all_leads';

            if (in_array('pending', $stages)) {
                $currentUserId = $user->id;
                $query->where(function($q) use ($currentUserId, $isAllLeadsView, $isManager) {
                    // Match Pending Logic in stats()
                    $q->where(function($sq) {
                        $sq->whereIn('stage', ['pending', 'in-progress'])
                           ->orWhereIn('status', ['pending', 'in-progress']);
                    })->orWhere(function($sq) use ($currentUserId, $isAllLeadsView, $isManager) {
                        $sq->where(function($s) {
                            $s->whereIn('stage', ['new', 'New Lead'])
                              ->orWhere(function($sub) {
                                  $sub->whereNull('stage')->where('status', 'new');
                              });
                        })
                        ->whereNotNull('assigned_to')
                        ->where(function($a) use ($currentUserId, $isAllLeadsView, $isManager) {
                            $a->where('assigned_to', '!=', $currentUserId)
                              ->orWhere(function($sub) use ($currentUserId, $isAllLeadsView, $isManager) {
                                  $sub->where('assigned_to', $currentUserId)
                                      ->whereRaw($isAllLeadsView && $isManager ? "1=1" : "1=0");
                              });
                        });
                    });
                });
            } elseif (in_array('new', $stages) || in_array('new lead', $stages)) {
                $currentUserId = $user->id;
                $query->where(function($q) use ($currentUserId, $isAllLeadsView, $isManager) {
                    // Match New Logic in stats()
                    $q->where(function($s) {
                        $s->whereIn('stage', ['new', 'New Lead'])
                          ->orWhere(function($sub) {
                              $sub->whereNull('stage')->where('status', 'new');
                          });
                    })
                    ->where(function($a) use ($currentUserId, $isAllLeadsView, $isManager) {
                        // If in All Leads view and user is manager, leads assigned to them are PENDING, not NEW.
                        // So we exclude them from the NEW filter.
                        if ($isAllLeadsView && $isManager) {
                            $a->whereNull('assigned_to');
                        } else {
                            $a->where('assigned_to', $currentUserId)
                              ->orWhereNull('assigned_to');
                        }
                    });
                });
            } elseif (in_array('duplicate', $stages)) {
                $query->where(function($q) use ($stages) {
                    $q->whereIn('stage', $stages)
                      ->orWhere('status', 'duplicate');
                });
            } else {
                $this->applyStageFilter($query, $stages, $user);
            }
        }

        // 5. Basic Filters
        foreach (['priority', 'campaign', 'country', 'project_id', 'created_by'] as $filter) {
            if ($request->filled($filter)) {
                $query->whereIn($filter, (array)$request->$filter);
            }
        }

        // Handle Source filter with normalization (e.g., "Cold Calls" matches "cold-call")
         if ($request->filled('source')) {
             $sources = (array)$request->source;
             $query->where(function($q) use ($sources) {
                 foreach ($sources as $s) {
                     $q->orWhere('source', $s)
                       ->orWhere('source', strtolower($s));
                     
                     // Normalize "Cold Calls" variations
                     $sNorm = strtolower(str_replace([' ', '_', '-'], '', $s));
                     if ($sNorm === 'coldcalls' || $sNorm === 'coldcall') {
                         $q->orWhereIn('source', [
                             'cold-call', 'Cold-Call', 'cold call', 'Cold Call', 
                             'coldcalls', 'ColdCalls', 'cold_call', 'Cold_Call'
                         ]);
                     }
                 }
             });
         }

        // 6. Manager Filter
        if ($request->filled('manager_id')) {
            $managerId = $request->manager_id;
            if (is_numeric($managerId)) {
                $subordinateIds = \App\Models\User::where('manager_id', $managerId)->pluck('id')->toArray();
                $query->where(function ($q) use ($managerId, $subordinateIds) {
                    $q->where('assigned_to', $managerId)
                      ->orWhere('manager_id', $managerId)
                      ->orWhereIn('assigned_to', $subordinateIds);
                });
            }
        }

        // 7. Assigned User Filter
        if ($request->filled('assigned_to')) {
            $assignedTo = (array)$request->assigned_to;
            $ids = array_filter($assignedTo, 'is_numeric');
            $names = array_diff($assignedTo, $ids);

            $query->where(function($q) use ($ids, $names) {
                if (!empty($ids)) $q->whereIn('assigned_to', $ids);
                if (!empty($names)) {
                    $q->orWhereHas('assignedAgent', function($sq) use ($names) {
                        $sq->whereIn('name', $names);
                    });
                }
            });
        }

        // 8. Date Range Filters
        if ($request->filled('created_from')) $query->whereDate('created_at', '>=', $request->created_from);
        if ($request->filled('created_to')) $query->whereDate('created_at', '<=', $request->created_to);
        
        if ($request->filled('last_action_from')) $query->whereDate('last_contact', '>=', $request->last_action_from);
        if ($request->filled('last_action_to')) $query->whereDate('last_contact', '<=', $request->last_action_to);

        return $query;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $query = $this->buildFilteredLeadsQuery($request, $user);

            $currentUserId = $user->id;
            $viewType = $request->get('view_type', 'all_leads');
            $isManager = !in_array(strtolower($user->role ?? ''), ['sales person', 'salesperson']);
            $isAllLeadsView = $viewType === 'all_leads';

            // Add virtual display_stage
            $query->select('leads.*');
            $query->selectRaw("
                CASE 
                    /* Case 1: Manager viewing All Leads - their own New leads appear as Pending */
                    WHEN " . ($isAllLeadsView && $isManager ? "1" : "0") . " = 1 
                         AND assigned_to = $currentUserId 
                         AND (lower(stage) = 'new' or lower(stage) = 'new lead' or (lower(status) = 'new' and stage is null)) 
                    THEN 'pending'
                    
                    /* Case 2: Standard Logic - New lead assigned to someone else appears as Pending */
                    WHEN (lower(stage) = 'new' or lower(stage) = 'new lead' or (lower(status) = 'new' and stage is null))
                         AND assigned_to IS NOT NULL 
                         AND assigned_to != $currentUserId
                    THEN 'pending'
                    
                    ELSE stage
                END as display_stage
            ");

            // Eager loading
            $query->with([
                'customFieldValues.field', 
                'assignedAgent:id,name', 
                'creator:id,name', 
                'latestAction' => function($q) use ($user) {
                    // Hide actions marked as manager-only for non-admins
                    $roleLower = strtolower($user->role ?? '');
                    $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
                    
                    $isAdmin = str_contains($roleLower, 'admin') || 
                               in_array('admin', $roles) || 
                               in_array('tenant admin', $roles) ||
                               $user->is_super_admin;
                    
                    if (!$isAdmin) {
                        $q->where(function($sub) {
                            $sub->whereNull('details->visibility')
                                ->orWhere('details->visibility', '!=', 'manager');
                        });
                    }
                }
            ]);

            // Sorting
            $sortBy = $request->get('sort_by', 'created_at');
            if ($sortBy === 'createdAt') $sortBy = 'created_at';
            $sortOrder = $request->get('sort_order', 'desc');
            
            if (in_array($sortBy, ['name', 'created_at', 'updated_at', 'estimated_value', 'stage'])) {
                $query->orderBy($sortBy, $sortOrder);
            } else {
                $query->latest();
            }

            return $query->paginate($request->get('per_page', 10));

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Leads Index Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch leads', 'error' => $e->getMessage(), 'data' => []], 500);
        }
    }

    public function stats(Request $request)
    {
        try {
            $user = $request->user();
            $query = $this->buildFilteredLeadsQuery($request, $user);

            $cacheKey = 'leads_stats:' . md5(json_encode([
                'user_id' => $user->id,
                'filters' => $request->all()
            ]));

            $data = Cache::remember($cacheKey, 5, function () use ($query, $user, $request) {
                $currentUserId = $user->id;
                $viewType = $request->get('view_type', 'all_leads');
                
                // Virtual Stage Logic: If in 'all_leads' view, leads assigned to the current user (if manager/admin)
                // should appear in 'pending' stage.
                $isManager = !in_array(strtolower($user->role ?? ''), ['sales person', 'salesperson']);
                $isAllLeadsView = $viewType === 'all_leads';
                
                $counts = (clone $query)->selectRaw("
                    count(*) as total,
                    count(case when (lower(stage) = 'new' or lower(stage) = 'new lead' or (lower(status) = 'new' and stage is null)) 
                        AND (
                            (assigned_to IS NULL) OR 
                            (assigned_to = $currentUserId AND " . ($isAllLeadsView && $isManager ? "0" : "1") . ")
                        ) then 1 end) as new_count,
                    count(case when 
                        (lower(stage) = 'pending' or lower(stage) = 'in-progress' or lower(status) = 'pending' or lower(status) = 'in-progress') 
                        OR 
                        ((lower(stage) = 'new' or lower(stage) = 'new lead' or (lower(status) = 'new' and stage is null)) 
                            AND assigned_to IS NOT NULL 
                            AND (assigned_to != $currentUserId OR " . ($isAllLeadsView && $isManager ? "1" : "0") . ")
                        ) 
                    then 1 end) as pending_count,
                    count(case when lower(stage) in ('coldcalls', 'cold calls', 'cold-call') then 1 end) as cold_call_count,
                    count(case when lower(status) = 'duplicate' or lower(stage) = 'duplicate' then 1 end) as duplicate_count
                ")->first();

                $byStage = (clone $query)->select(DB::raw("
                    CASE 
                        WHEN " . ($isAllLeadsView && $isManager ? "1" : "0") . " = 1 AND assigned_to = $currentUserId AND (lower(stage) = 'new' or lower(stage) = 'new lead') THEN 'pending'
                        ELSE stage
                    END as display_stage
                "), DB::raw('count(*) as count'))
                    ->groupBy('display_stage')
                    ->get()
                    ->pluck('count', 'display_stage');

                return [
                    'total' => $counts->total ?? 0,
                    'new' => $counts->new_count ?? 0,
                    'pending' => $counts->pending_count ?? 0,
                    'coldCall' => $counts->cold_call_count ?? 0,
                    'duplicate' => $counts->duplicate_count ?? 0,
                    'byStage' => $byStage
                ];
            });

            return response()->json($data);

        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Leads Stats Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to fetch stats', 'error' => $e->getMessage()], 500);
        }
    }

    public function analysis(Request $request)
    {
        try {
            $user = $request->user();
            $query = Lead::query();

            // Exclude referral leads
            $query->whereDoesntHave('referralUsers');
            
            $viewableIds = $this->getViewableUserIds($user);
            if ($viewableIds !== null) {
                $query->whereIn('assigned_to', $viewableIds);
            }

            // Hide duplicates from non-privileged users when duplication system enabled
            $crm = \App\Models\CrmSetting::first();
            $enableDup = is_array($crm?->settings) ? (bool)($crm->settings['duplicationSystem'] ?? false) : false;
            
            if ($enableDup && !$this->canViewDuplicates($user)) {
                    $query->where(function($q) {
                    $q->where(function($s) {
                        $s->whereRaw("status is null or status != 'duplicate'");
                    })->where(function($st) {
                        $st->whereRaw("stage is null or stage != 'duplicate'");
                    });
                });
            }

            // Apply Date Filters
            if ($request->has('created_from') && !empty($request->created_from)) {
                $query->whereDate('created_at', '>=', $request->created_from);
            }
            if ($request->has('created_to') && !empty($request->created_to)) {
                $query->whereDate('created_at', '<=', $request->created_to);
            }

            // Apply Employee Filter
            if ($request->has('assigned_to') && !empty($request->assigned_to)) {
                $query->where('assigned_to', $request->assigned_to);
            }

            // Clone query for different aggregations
            $monthlyQuery = clone $query;
            $sourceQuery = clone $query;
            $statusQuery = clone $query;

            // 1. Monthly (Last 6 months)
            $monthly = $monthlyQuery->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, DATE_FORMAT(created_at, "%M") as label, count(*) as value, sum(estimated_value) as revenue')
                ->selectRaw('sum(case when status="converted" then 1 else 0 end) as converted')
                ->selectRaw('sum(case when status="lost" then 1 else 0 end) as lost')
                ->selectRaw('sum(case when status not in ("converted", "lost") then 1 else 0 end) as inProgress')
                ->groupBy('month', 'label')
                ->orderBy('month', 'desc')
                ->limit(6)
                ->get()
                ->reverse()
                ->values();

            // 2. By Source
            $bySource = $sourceQuery->select('source', DB::raw('count(*) as count'))
                ->groupBy('source')
                ->orderByDesc('count')
                ->limit(10)
                ->get();

            // 3. By Status
            $byStatus = $statusQuery->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->orderByDesc('count')
                ->get();

            return response()->json([
                'monthly' => $monthly,
                'bySource' => $bySource,
                'byStatus' => $byStatus
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Leads Analysis Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch analysis',
                'error' => $e->getMessage(),
                'monthly' => [],
                'bySource' => [],
                'byStatus' => []
            ], 500);
        }
    }

    public function pipelineAnalysis(Request $request)
    {
        $user = $request->user();
        $query = Lead::query();

        // Exclude referral leads
        $query->whereDoesntHave('referralUsers');

        $viewableIds = $this->getViewableUserIds($user);
        if ($viewableIds !== null) {
            $query->whereIn('assigned_to', $viewableIds);
        }

        // Hide duplicates from non-privileged users when duplication system enabled
        $crm = \App\Models\CrmSetting::first();
        $enableDup = is_array($crm?->settings) ? (bool)($crm->settings['duplicationSystem'] ?? false) : false;
        
        if ($enableDup && !$this->canViewDuplicates($user)) {
                $query->where(function($q) {
                $q->where(function($s) {
                    $s->whereNull('status')->orWhere('status', '!=', 'duplicate');
                })->where(function($st) {
                    $st->whereNull('stage')->orWhere('stage', '!=', 'duplicate');
                });
            });
        }
        
        // Apply Date Filters
        if ($request->has('created_from') && !empty($request->created_from)) {
            $query->whereDate('created_at', '>=', $request->created_from);
        }
        if ($request->has('created_to') && !empty($request->created_to)) {
            $query->whereDate('created_at', '<=', $request->created_to);
        }

        // --- Apply Advanced Filters (Synced with index/stats) ---

        // Filter by Created By
        if ($request->has('created_by') && !empty($request->created_by)) {
            $createdBys = (array)$request->created_by;
            $query->whereIn('created_by', $createdBys);
        }

        // Filter by Manager (Special filter for Manager + Team)
        if ($request->has('manager_id') && !empty($request->manager_id)) {
             $managerIds = (array)$request->manager_id;
             $subordinateIds = \App\Models\User::whereIn('manager_id', $managerIds)->pluck('id')->toArray();
             
             $query->where(function ($q) use ($managerIds, $subordinateIds) {
                  $q->whereIn('assigned_to', $managerIds)
                    ->orWhereIn('manager_id', $managerIds)
                    ->orWhereIn('assigned_to', $subordinateIds);
             });
        }

        // Filter by Assigned User (Specific filter from frontend)
            if ($request->has('assigned_to') && !empty($request->assigned_to)) {
                 $assignedTos = $request->assigned_to;
                 
                 // Handle array or single value
                 if (!is_array($assignedTos)) {
                     $assignedTos = [$assignedTos];
                 }
                 
                 $ids = [];
                 $names = [];
                 
                 foreach ($assignedTos as $val) {
                     if (is_numeric($val)) {
                         $ids[] = $val;
                     } else {
                         $names[] = $val;
                     }
                 }
                 
                 $query->where(function($q) use ($ids, $names) {
                     if (!empty($ids)) {
                         $q->whereIn('assigned_to', $ids);
                     }
                     if (!empty($names)) {
                         $q->orWhereHas('assignedAgent', function($sq) use ($names) {
                             $sq->whereIn('name', $names);
                         });
                     }
                 });
            }

        // Filter by Source
        if ($request->has('source') && !empty($request->source)) {
            $sources = (array)$request->source;
            $query->whereIn('source', $sources);
        }

        // Filter by Priority
        if ($request->has('priority') && !empty($request->priority)) {
            $priorities = (array)$request->priority;
            $query->whereIn('priority', $priorities);
        }

        // Filter by Campaign
        if ($request->has('campaign') && !empty($request->campaign)) {
            $campaigns = (array)$request->campaign;
            $query->whereIn('campaign', $campaigns);
        }

        // Filter by Search
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('company', 'like', "%{$search}%")
                  ->orWhere('stage', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhereHas('assignedAgent', function($subQ) use ($search) {
                      $subQ->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Clone for different views
        $stageQuery = clone $query;
        $trendQuery = clone $query;
        $rawQuery = clone $query;

        $currentUserId = $user->id;
        // 1. Value by Stage
        // Use raw stage/status grouping to avoid inconsistent logic
        $byStage = $stageQuery->select(DB::raw("COALESCE(stage, status) as stage_name"), DB::raw('sum(estimated_value) as value'), DB::raw('count(*) as count'))
            ->groupBy('stage_name')
            ->get()
            ->map(function($item) {
                return [
                    'stage' => $item->stage_name,
                    'value' => $item->value,
                    'count' => $item->count
                ];
            });

        // 2. Trend (Value over time - Daily for last 30 days)
        $trend = $trendQuery->selectRaw('DATE(created_at) as date, sum(estimated_value) as value')
            ->whereDate('created_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // 3. Raw Data (for Pivot/List views)
        $rawData = $rawQuery->with('assignedAgent:id,name')
            ->select('id', 'created_at', 'name as leadName', 'assigned_to', 'stage', 'estimated_value as value')
            ->latest()
            ->limit(1000)
            ->get()
            ->map(function($lead) {
                return [
                    'date' => $lead->created_at->format('Y-m-d'),
                    'employee' => $lead->assignedAgent ? $lead->assignedAgent->name : 'Unassigned',
                    'leadName' => $lead->leadName,
                    'stage' => $lead->stage,
                    'value' => (float) $lead->value,
                    'prorated' => (float) $lead->value // Assuming 100% for now, or calculate based on probability
                ];
            });

        return response()->json([
            'byStage' => $byStage,
            'trend' => $trend,
            'raw_data' => $rawData
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // 1. Validate Standard Fields
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'company' => 'nullable|string|max:255',
            'campaign' => 'nullable|string|max:255',
            // ... add other standard validations as needed
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // 2. Validate Custom Fields
        $entity = Entity::where('key', 'leads')->first();
        if ($entity) {
            $customFields = $entity->fields;
            $customRules = [];
            
            foreach ($customFields as $field) {
                if ($field->required && $field->active) {
                    $customRules['custom_fields.' . $field->key] = 'required';
                }
            }
            
            if (!empty($customRules)) {
                $customValidator = Validator::make($request->all(), $customRules);
                if ($customValidator->fails()) {
                     return response()->json(['errors' => $customValidator->errors()], 422);
                }
            }
        }

        try {
            DB::beginTransaction();

            // Handle Attachments
            $data = $request->except('custom_fields', 'attachments');
            $phoneCountryHint = $request->input('phone_country');
            if (array_key_exists('phone_country', $data)) {
                unset($data['phone_country']);
            }

            // Normalize phone for consistent search/duplicate matching
            $rawPhone = isset($data['phone']) ? trim((string) $data['phone']) : '';
            if ($rawPhone !== '') {
                $data['phone'] = PhoneNormalizer::normalize($rawPhone, $phoneCountryHint);
            }
            
            // Sanitize numeric fields
            if (isset($data['estimated_value']) && $data['estimated_value'] === '') {
                $data['estimated_value'] = null;
            }

            // Set Created By
            $data['created_by'] = $request->user()->id;

            if ($request->hasFile('attachments')) {
                $paths = [];
                $files = $request->file('attachments');
                // Ensure it's an array
                if (!is_array($files)) {
                    $files = [$files];
                }
                foreach ($files as $file) {
                    $paths[] = $file->store('leads/attachments', 'public');
                }
                $data['attachments'] = $paths;
            }

            // 3. Create Lead
            $crm = CrmSetting::first();
            $enableDup = is_array($crm?->settings) ? (bool)($crm->settings['duplicationSystem'] ?? false) : false;
            
            // Set default stage if not provided
           if (empty($data['stage']) || strtolower($data['stage']) == 'new' || strtolower($data['stage']) == 'new lead') {
               $data['stage'] = 'New Lead';
           }

            if ($enableDup) {
                $isDuplicate = false;
                $duplicateOfId = null;
                if (!empty($data['phone']) && $rawPhone !== '') {
                    $variants = PhoneNormalizer::variantsForSearch($rawPhone, $phoneCountryHint);
                    $variants = !empty($variants) ? $variants : [$data['phone']];
                    $tenantId = $request->user()?->tenant_id;
                    $base = Lead::query();
                    if ($tenantId) {
                        $base->where('tenant_id', $tenantId);
                    }
                    $isDuplicate = (clone $base)->whereIn('phone', $variants)->exists();

                    if ($isDuplicate) {
                        $original = (clone $base)->whereIn('phone', $variants)
                            ->where(function ($q) {
                                $q->whereNull('status')->orWhere('status', '!=', 'duplicate');
                            })
                            ->orderBy('id', 'asc')
                            ->first();
                        if (!$original) {
                            $original = (clone $base)->whereIn('phone', $variants)->orderBy('id', 'asc')->first();
                        }
                        $duplicateOfId = $this->resolveDuplicateRootId($original, $tenantId);
                    }
                }
                
                if ($isDuplicate) {
                    $data['status'] = 'duplicate';
                    $data['stage'] = 'Duplicate'; // Override stage if duplicate
                }
            }

            // Keep phone country in meta_data (do not depend on a DB column existing)
            if ($phoneCountryHint) {
                $meta = is_array($data['meta_data'] ?? null) ? ($data['meta_data'] ?? []) : [];
                $meta['phone_country'] = $phoneCountryHint;
                $data['meta_data'] = $meta;
            }

            if (!empty($duplicateOfId)) {
                $meta = is_array($data['meta_data'] ?? null) ? ($data['meta_data'] ?? []) : [];
                $meta['duplicate_of'] = $duplicateOfId;
                $data['meta_data'] = $meta;
            }
            $lead = Lead::create($data);

            // 4. Save Custom Fields
            if ($request->has('custom_fields') && $entity) {
                $fieldsMap = $entity->fields->pluck('id', 'key'); // key => id map
                
                foreach ($request->input('custom_fields') as $key => $value) {
                    if (isset($fieldsMap[$key])) {
                        FieldValue::create([
                            'field_id' => $fieldsMap[$key],
                            'record_id' => $lead->id,
                            'value' => $value,
                        ]);
                    }
                }
            }

            // Logic 1: New lead automatically appears in "New Lead" for creator
            // Already handled by default stage = 'new' if not provided, and assigned_to/created_by logic.
            // If creator assigns to self, it's New Lead.
            // If creator assigns to someone else, check Logic 2.
            
            // Logic 2 & 4: Assignment logic on creation
            if (!empty($data['assigned_to'])) {
                 $assigneeId = $data['assigned_to'];
                 $creatorId = $request->user()->id;
                 
                 // If assigned to self -> New Lead (default)
                 
                 // If assigned to another person (Sales Person)
                 if ($assigneeId != $creatorId) {
                      // It should be 'New Lead' for Sales Person (default stage='new')
                      // But 'Pending' for Manager (Creator)
                      
                      // We need to set manager_id to creator if not set
                      if (empty($data['manager_id'])) {
                           $lead->manager_id = $creatorId;
                           $lead->save();
                      }
                 }
            } else {
                // If not assigned, assign to creator by default? Or keep unassigned?
                // Usually creator is the initial owner if not specified.
                if (empty($data['assigned_to'])) {
                    // Optional: auto-assign to creator
                    // $lead->assigned_to = $request->user()->id;
                    // $lead->save();
                }
            }

            DB::commit();

            if ($lead->assigned_to) {
                $assignee = User::with(['manager', 'team.leader'])->find($lead->assigned_to);
                $actor = $request->user();
                if ($assignee && $actor && $assignee->id !== $actor->id) {
                    $notification = new \App\Notifications\LeadAssigned($lead, $actor->name);
                    $recipients = $this->buildNotificationRecipients(
                        $assignee,
                        [
                            'owner' => $lead->creator,
                            'assignee' => $assignee,
                            'assigner' => $actor,
                        ],
                        'leads',
                        'notify_assigned_leads'
                    );
                    foreach ($recipients as $userRecipient) {
                        try {
                            $userRecipient->notify($notification);
                        } catch (\Throwable $e) {
                        }
                    }
                }
            }

            return response()->json($lead->load(['customFieldValues.field', 'creator:id,name', 'assignedAgent:id,name']), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Lead Store Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to create lead', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();
        \Illuminate\Support\Facades\Log::info("LeadController@show hit for Lead ID: $id. User Tenant: " . (Auth::check() ? $user->tenant_id : 'guest'));

        $lead = Lead::with([
            'customFieldValues.field', 
            'assignedAgent:id,name', 
            'creator:id,name',
            'actions' => function($query) use ($user) {
                $query->with('creator:id,name');
                
                // Hide actions marked as manager-only for non-admins
                $roleLower = strtolower($user->role ?? '');
                $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
                
                // Only Admin or Super Admin can see manager-only history
                $isAdmin = str_contains($roleLower, 'admin') || 
                           in_array('admin', $roles) || 
                           in_array('tenant admin', $roles) ||
                           $user->is_super_admin;
                
                if (!$isAdmin) {
                    $query->where(function($q) {
                        $q->whereNull('details->visibility')
                          ->orWhere('details->visibility', '!=', 'manager');
                    });
                }
            }
        ])->findOrFail($id);
        
        \Illuminate\Support\Facades\Log::info("Lead loaded. Actions count: " . $lead->actions->count());
        
        // Guard duplicate visibility if duplication system enabled
        $crm = \App\Models\CrmSetting::first();
        $enableDup = is_array($crm?->settings) ? (bool)($crm->settings['duplicationSystem'] ?? false) : false;
        if ($enableDup && (strtolower($lead->status ?? '') === 'duplicate' || strtolower($lead->stage ?? '') === 'duplicate')) {
            if (!$this->canViewDuplicates($user)) {
                abort(403, 'Unauthorized to view duplicate leads');
            }
        }

        // Append permissions
        $isReferral = $this->isReferralSupervisor($user, $lead);
        $permissions = [
            'can_edit' => $user->can('update', $lead) && !$isReferral,
            'can_delete' => $user->can('delete', $lead) && !$isReferral,
            'can_add_action' => !$isReferral, // Referral supervisors cannot add actions
            'is_referral_supervisor' => $isReferral,
        ];
        $lead->permissions = $permissions;

        return response()->json($lead);
    }

    public function delayed(Request $request)
    {
        try {
            $user = $request->user();
            $query = Lead::query();

            // Exclude referral leads
            $query->whereDoesntHave('referralUsers');
            
            // 1. Filter by User Permissions (Viewable)
            $viewableIds = $this->getViewableUserIds($user);
            if ($viewableIds !== null) {
                $query->where(function ($q) use ($viewableIds, $user) {
                    $q->whereIn('assigned_to', $viewableIds)
                      ->orWhere('manager_id', $user->id);
                });
            }

            // Hide duplicates from non-privileged users when duplication system enabled
            // EXCEPT if the lead is assigned to them directly
            $crm = \App\Models\CrmSetting::first();
            $enableDup = is_array($crm?->settings) ? (bool)($crm->settings['duplicationSystem'] ?? false) : false;
            
            if ($enableDup && !$this->canViewDuplicates($user)) {
                $query->where(function($q) use ($user) {
                    // Show if assigned to me OR NOT a duplicate
                    $q->where('assigned_to', $user->id)
                      ->orWhere(function($sub) {
                        $sub->where(function($s) {
                            $s->whereNull('status')->orWhere('status', '!=', 'duplicate');
                        })->where(function($st) {
                            $st->whereNull('stage')->orWhere('stage', '!=', 'duplicate');
                        });
                      });
                });
            }
            
            // 2. Filter by Employee (if requested)
            if ($request->has('assigned_to') && !empty($request->assigned_to)) {
                $query->where('assigned_to', $request->assigned_to);
            }
            
            // 3. Delayed Logic
            // We want leads that have at least one action that is:
            // - pending/in-progress
            // - scheduled time is < now - 1 minute
            
            $now = now();
            $oneMinuteAgo = $now->subMinute();
            $date = $oneMinuteAgo->toDateString();
            $time = $oneMinuteAgo->toTimeString();
            
            // Find leads with at least one delayed pending action
            $query->whereHas('actions', function ($q) use ($date, $time) {
                $q->whereIn('details->status', ['pending', 'in-progress'])
                  ->where(function ($sub) use ($date, $time) {
                      $sub->where('details->date', '<', $date)
                          ->orWhere(function ($s) use ($date, $time) {
                              $s->where('details->date', '=', $date)
                                ->where('details->time', '<', $time);
                          });
                  });
            });
            
            // Eager load the delayed actions and the assigned agent relationship
            $query->with([
                'assignedAgent:id,name',
                'actions' => function ($q) use ($date, $time) {
                    $q->whereIn('details->status', ['pending', 'in-progress'])
                      ->where(function ($sub) use ($date, $time) {
                          $sub->where('details->date', '<', $date)
                              ->orWhere(function ($s) use ($date, $time) {
                                  $s->where('details->date', '=', $date)
                                    ->where('details->time', '<', $time);
                              });
                      })
                      ->orderBy('details->date')
                      ->orderBy('details->time');
                }
            ]);

            // Sort by newest leads first
            $query->latest();

            return $query->paginate($request->get('per_page', 20));

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Leads Delayed Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch delayed leads',
                'error' => $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);
        
        // Enterprise Referral Supervision: Block Update
        if ($this->isReferralSupervisor($request->user(), $lead)) {
            abort(403, 'Referral supervisors cannot update leads.');
        }

        $oldAssigneeId = $lead->assigned_to;

        // Validation (similar to store, but maybe less strict on required if partial update)
        // For simplicity, assuming full update or handled similarly
        
        try {
            DB::beginTransaction();
            
            $data = $request->except('custom_fields');
            $phoneCountryHint = $request->input('phone_country');
            if (array_key_exists('phone_country', $data)) {
                unset($data['phone_country']);
            }

            $rawPhone = isset($data['phone']) ? trim((string) $data['phone']) : '';
            if ($rawPhone !== '') {
                $data['phone'] = PhoneNormalizer::normalize($rawPhone, $phoneCountryHint);
            }
            
            // Check for duplicate leads on update
            $crm = CrmSetting::first();
            $enableDup = is_array($crm?->settings) ? (bool)($crm->settings['duplicationSystem'] ?? false) : false;

            if ($enableDup) {
                $isDuplicate = false;
                $duplicateOfId = null;
                if (!empty($data['phone']) && $rawPhone !== '') {
                    $variants = PhoneNormalizer::variantsForSearch($rawPhone, $phoneCountryHint);
                    $variants = !empty($variants) ? $variants : [$data['phone']];
                    $tenantId = $request->user()?->tenant_id;
                    $base = Lead::query();
                    if ($tenantId) {
                        $base->where('tenant_id', $tenantId);
                    }

                    $isDuplicate = $isDuplicate || (clone $base)->whereIn('phone', $variants)
                        ->where('id', '!=', $lead->id)
                        ->exists();

                    if ($isDuplicate) {
                        $original = (clone $base)->whereIn('phone', $variants)
                            ->where('id', '!=', $lead->id)
                            ->where(function ($q) {
                                $q->whereNull('status')->orWhere('status', '!=', 'duplicate');
                            })
                            ->orderBy('id', 'asc')
                            ->first();
                        if (!$original) {
                            $original = (clone $base)->whereIn('phone', $variants)
                                ->where('id', '!=', $lead->id)
                                ->orderBy('id', 'asc')
                                ->first();
                        }
                        $duplicateOfId = $this->resolveDuplicateRootId($original, $tenantId);
                    }
                }
                if ($isDuplicate) {
                    $data['status'] = 'duplicate';
                    $data['stage'] = 'Duplicate';
                }

                // If phone changed and it is no longer a duplicate, clear duplicate flags/link.
                // This avoids showing "duplicate" comparisons for leads whose phone is now unique.
                $phoneWasProvided = array_key_exists('phone', $data) || $request->has('phone');
                if ($phoneWasProvided && !$isDuplicate) {
                    if (strtolower((string) $lead->status) === 'duplicate' && !array_key_exists('status', $data)) {
                        $data['status'] = 'new';
                    }
                    if (strtolower((string) $lead->stage) === 'duplicate' && !array_key_exists('stage', $data)) {
                        $data['stage'] = 'New Lead';
                    }

                    $meta = is_array($lead->meta_data ?? null) ? ($lead->meta_data ?? []) : [];
                    if (array_key_exists('duplicate_of', $meta)) {
                        unset($meta['duplicate_of']);
                        $data['meta_data'] = !empty($meta) ? $meta : null;
                    }
                }
            }
            
            // Map actions to actions_data if present
            if ($request->has('actions')) {
                $data['actions_data'] = $request->input('actions');
                unset($data['actions']);
            }

            // Handle assignment mapping: assigned_to_id -> assigned_to
            if ($request->has('assigned_to_id')) {
                $data['assigned_to'] = $request->input('assigned_to_id');
            }

            // Populate sales_person if assigned_to is being updated
            if (isset($data['assigned_to'])) {
                $user = \App\Models\User::find($data['assigned_to']);
                if ($user) {
                    $data['sales_person'] = $user->name;
                }
            } elseif ($request->has('assignedTo')) {
                // Fallback: use the name provided by frontend if ID lookup is skipped/failed but name is present
                $data['sales_person'] = $request->input('assignedTo');
            }

            if ($phoneCountryHint) {
                $meta = is_array($lead->meta_data ?? null) ? ($lead->meta_data ?? []) : [];
                $meta['phone_country'] = $phoneCountryHint;
                $data['meta_data'] = $meta;
            }

            if (!empty($duplicateOfId)) {
                $meta = is_array($data['meta_data'] ?? null) ? ($data['meta_data'] ?? []) : [];
                $meta['duplicate_of'] = $duplicateOfId;
                $data['meta_data'] = $meta;
            }

            $lead->update($data);

            if ($request->has('custom_fields')) {
                $entity = Entity::where('key', 'leads')->first();
                if ($entity) {
                    $fieldsMap = $entity->fields->pluck('id', 'key');

                    foreach ($request->input('custom_fields') as $key => $value) {
                        if (isset($fieldsMap[$key])) {
                            FieldValue::updateOrCreate(
                                [
                                    'field_id' => $fieldsMap[$key],
                                    'record_id' => $lead->id,
                                ],
                                ['value' => $value]
                            );
                        }
                    }
                }
            }
            
            DB::commit();

            if ($lead->assigned_to && $lead->assigned_to != $oldAssigneeId) {
                $assignee = User::with(['manager', 'team.leader'])->find($lead->assigned_to);
                $actor = $request->user();

                if ($assignee && $actor && $assignee->id !== $actor->id) {
                    $notification = new \App\Notifications\LeadAssigned($lead, $actor->name);
                    $previousOwner = $oldAssigneeId ? User::find($oldAssigneeId) : null;
                    $recipients = $this->buildNotificationRecipients(
                        $assignee,
                        [
                            'owner' => $lead->creator,
                            'assignee' => $assignee,
                            'assigner' => $actor,
                            'previous_owner' => $previousOwner,
                        ],
                        'leads',
                        'notify_assigned_leads'
                    );

                    foreach ($recipients as $userRecipient) {
                        try {
                            $userRecipient->notify($notification);
                        } catch (\Throwable $e) {
                        }
                    }
                }
            }

            return response()->json($lead->load(['customFieldValues.field', 'creator:id,name', 'assignedAgent:id,name']));

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update lead', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        if (!$this->canDeleteLead($user)) {
             return response()->json(['message' => 'You do not have permission to delete leads.'], 403);
        }

        // استخدام Transaction لضمان سلامة البيانات (إما أن تتم العمليتان معًا أو تفشلا معًا)
        \Illuminate\Support\Facades\DB::transaction(function () use ($id) {
            // 1. جلب بيانات الليد الأصلي
            $lead = Lead::findOrFail($id);

            // Enterprise Referral Supervision: Block Delete
            if ($this->isReferralSupervisor(\Illuminate\Support\Facades\Auth::user(), $lead)) {
                abort(403, 'Referral supervisors cannot delete leads.');
            }

            // 2. إنشاء سجل جديد في جدول Recycle
            \App\Models\RecycleLead::create([
                'original_lead_id' => $lead->id,
                'lead_data' => $lead->toArray(), // تخزين كامل البيانات كـ JSON
                'deleted_by' => \Illuminate\Support\Facades\Auth::id(),
                'deleted_at' => now(),
            ]);

            // 3. حذف الليد نهائيًا من الجدول الأصلي (لأنه تم نقله للأرشيف)
            // ملاحظة: نستخدم forceDelete لأننا احتفظنا بنسخة بالفعل في RecycleLead
            // إذا كنت تفضل إبقاءه SoftDeleted في الجدول الأصلي أيضًا، استبدل forceDelete بـ delete
            $lead->forceDelete();
        });

        return response()->json(['message' => 'Lead moved to recycle bin successfully']);
    }

    public function trashed(Request $request)
    {
        $query = Lead::onlyTrashed()
            ->with(['customFieldValues.field', 'deletedByUser', 'assignedAgent'])
            ->latest('deleted_at');

        if ($request->has('all')) {
            return $query->get();
        }

        return $query->paginate($request->input('per_page', 10));
    }

    public function restore($id)
    {
        $lead = Lead::withTrashed()->findOrFail($id);
        $lead->restore();

        return response()->json(['message' => 'Lead restored successfully']);
    }

    private function _restoreRecycleLead(RecycleLead $recycleLead)
    {
        // 1. استرجاع البيانات الأصلية
        $leadData = $recycleLead->lead_data;
        if (!is_array($leadData)) {
            $leadData = json_decode($leadData, true) ?? [];
        }
        
        // 2. تنظيف البيانات
        unset($leadData['deleted_at']);
        unset($leadData['created_at']); // Let DB handle timestamps
        unset($leadData['updated_at']);
        
        // Force Tenant ID to current context if available
        $tenantId = null;
        if (app()->bound('current_tenant_id')) {
            $tenantId = app('current_tenant_id');
        } elseif (\Illuminate\Support\Facades\Auth::check()) {
            $tenantId = \Illuminate\Support\Facades\Auth::user()->tenant_id;
        }

        if ($tenantId) {
            $leadData['tenant_id'] = $tenantId;
        }
        
        // تصفية البيانات لتشمل فقط الأعمدة الموجودة في جدول leads
        $columns = \Illuminate\Support\Facades\Schema::getColumnListing('leads');
        $validData = \Illuminate\Support\Arr::only($leadData, $columns);
        
        // 3. التحقق من تضارب الـ ID
        if (isset($validData['id'])) {
            $exists = Lead::withTrashed()->where('id', $validData['id'])->exists();
            if ($exists) {
                // إذا كان الـ ID موجوداً، نحذفه لإنشاء ID جديد
                unset($validData['id']);
            }
        }

        // التحقق من صلاحية المستخدم المسند إليه (assigned_to)
        if (isset($validData['assigned_to']) && $validData['assigned_to']) {
            if (!\App\Models\User::where('id', $validData['assigned_to'])->exists()) {
                $validData['assigned_to'] = null;
            }
        }

        // التحقق من صلاحية المشروع (project_id)
        if (isset($validData['project_id']) && $validData['project_id']) {
            if (!\App\Models\Project::where('id', $validData['project_id'])->exists()) {
                $validData['project_id'] = null;
            }
        }

        // التحقق من صلاحية العنصر (item_id)
        if (isset($validData['item_id']) && $validData['item_id']) {
            if (!\App\Models\Item::where('id', $validData['item_id'])->exists()) {
                $validData['item_id'] = null;
            }
        }

        // معالجة تكرار البريد الإلكتروني (Email Uniqueness)
        if (isset($validData['email']) && $validData['email']) {
            $emailExists = Lead::where('email', $validData['email'])->exists();
            if ($emailExists) {
                $validData['email'] = $validData['email'] . '_restored_' . time();
            }
        }
        
        // معالجة تكرار الهاتف (Phone Uniqueness)
        if (isset($validData['phone']) && $validData['phone']) {
            $phoneExists = Lead::where('phone', $validData['phone'])->exists();
            if ($phoneExists) {
                $validData['phone'] = $validData['phone'] . '_' . time();
            }
        }

        // تنظيف حقول الحذف
        unset($validData['deleted_by']);
        
        // 4. إنشاء الليد من جديد
        $lead = new Lead();
        $lead->forceFill($validData);
        $lead->save();
        
        // 5. حذف السجل من الأرشيف
        $recycleLead->delete();
        
        return $lead;
    }

    public function restoreFromRecycle($id)
    {
        \Illuminate\Support\Facades\Log::info("Restore request received for RecycleLead ID: " . $id);
        try {
            // استخدام Transaction لضمان سلامة البيانات
            return \Illuminate\Support\Facades\DB::transaction(function () use ($id) {
                $recycleLead = RecycleLead::findOrFail($id);
                $this->_restoreRecycleLead($recycleLead);
                return response()->json(['message' => 'Lead restored successfully']);
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Restore failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to restore lead', 'error' => $e->getMessage()], 500);
        }
    }

    public function forceDelete($id)
    {
        DB::transaction(function () use ($id) {
            $lead = Lead::withTrashed()->find($id);
            if ($lead) {
                $lead->forceDelete();
            }

            // Delete from Recycle Bin table as well
            \App\Models\RecycleLead::where('original_lead_id', $id)->delete();

            // Delete associated field values
            FieldValue::where('record_id', $id)
                ->whereIn('field_id', function($query) {
                    $query->select('id')->from('fields')->where('entity_id', function($q){
                        $q->select('id')->from('entities')->where('key', 'leads');
                    });
                })->delete();
        });

        return response()->json(['message' => 'Lead permanently deleted']);
    }

    public function bulkImport(Request $request)
    {
        $leads = $request->input('leads', []);
        $created = [];
        $errors = [];
        $duplicateCount = 0;
        $duplicateExistingCount = 0;
        $duplicateInFileCount = 0;

        $crm = \App\Models\CrmSetting::first();
        $enableDup = is_array($crm?->settings) ? (bool)($crm->settings['duplicationSystem'] ?? false) : false;
        $tenant = app()->bound('tenant') ? app('tenant') : null;
        $companyType = strtolower((string)($tenant?->company_type ?? ''));
        $currentUserId = \Illuminate\Support\Facades\Auth::id();
        $currentTenantId = $tenant?->id ?? (app()->bound('current_tenant_id') ? app('current_tenant_id') : null);
        
        if (!$currentTenantId && \Illuminate\Support\Facades\Auth::check()) {
            $currentTenantId = \Illuminate\Support\Facades\Auth::user()->tenant_id;
        }

        if (!$currentTenantId) {
            return response()->json(['message' => 'Tenant context not found.', 'count' => 0], 403);
        }

        $phonesInBatch = [];

        foreach ($leads as $index => $leadData) {
            try {
                $rowNum = $index + 2; 
                
                // 1. Strict Validation: Name, Phone, Source are REQUIRED
                $name = isset($leadData['name']) ? trim((string)$leadData['name']) : '';
                $rawPhone = isset($leadData['phone']) ? trim((string)$leadData['phone']) : '';
                $sourceName = isset($leadData['source']) ? trim((string)$leadData['source']) : '';
                $phoneCountryHint = isset($leadData['phone_country']) ? trim((string)$leadData['phone_country']) : null;
                $phone = PhoneNormalizer::normalize($rawPhone, $phoneCountryHint);
                
                if ($name === '' || $rawPhone === '' || $phone === '' || $sourceName === '') {
                    $missing = [];
                    if ($name === '') $missing[] = 'Name';
                    if ($rawPhone === '' || $phone === '') $missing[] = 'Phone';
                    if ($sourceName === '') $missing[] = 'Source';
                    $errors[] = "Row {$rowNum}: Missing required fields (" . implode(', ', $missing) . "). Row skipped.";
                    continue;
                }

                // 2. Project/Item handling - REQUIRED based on company type
                $projectName = trim((string)($leadData['project'] ?? ''));
                $itemName = trim((string)($leadData['item'] ?? ''));
                $projectId = null;
                $itemId = null;

                if ($companyType === 'general') {
                    if ($itemName === '') {
                        $errors[] = "Row {$rowNum}: Item is required for general companies. Row skipped.";
                        continue;
                    }
                    
                    $item = \App\Models\Item::where('tenant_id', $currentTenantId)
                        ->where(function($q) use ($itemName) {
                            $q->where('name', $itemName)->orWhere('code', $itemName);
                        })->first();
                    
                    if ($item) {
                        $itemId = $item->id;
                        $itemName = $item->name;
                    } else {
                        $errors[] = "Row {$rowNum}: Item '{$itemName}' not found. Row skipped.";
                        continue;
                    }
                } else {
                    if ($projectName === '') {
                        $errors[] = "Row {$rowNum}: Project is required. Row skipped.";
                        continue;
                    }
                    
                    $project = \App\Models\Project::where('tenant_id', $currentTenantId)
                        ->where(function($q) use ($projectName) {
                            $q->where('name', $projectName)->orWhere('name_ar', $projectName);
                        })->first();
                    
                    if ($project) {
                        $projectId = $project->id;
                        $projectName = $project->name;
                    } else {
                        $errors[] = "Row {$rowNum}: Project '{$projectName}' not found. Row skipped.";
                        continue;
                    }
                }

                // 3. Stage handling
                $incomingStage = isset($leadData['stage']) && trim($leadData['stage']) !== '' ? trim($leadData['stage']) : null;
                
                if (empty($incomingStage)) {
                    $stage = 'New Lead';
                } else {
                    $normIncoming = strtolower(str_replace([' ', '-'], '', trim($incomingStage)));
                    if (in_array($normIncoming, ['new', 'newlead', 'fresh'])) {
                        $stage = 'New Lead';
                    } elseif ($normIncoming === 'pending') {
                        $stage = 'Pending';
                    } elseif (in_array($normIncoming, ['coldcalls', 'coldcall'])) {
                        $stage = 'Cold Calls';
                    } elseif ($normIncoming === 'duplicate') {
                         $stage = 'Duplicate';
                    } else {
                        $stage = $incomingStage;
                    }
                }

                $status = 'new';
                
                // 4. Duplicate Logic Check
                $isDuplicate = false;
                $isExistingDuplicate = false;
                $isInFileDuplicate = false;
                if ($enableDup) {
                    if (!empty($phone)) {
                        $variants = PhoneNormalizer::variantsForSearch($rawPhone, $phoneCountryHint);
                        $variants = !empty($variants) ? $variants : [$phone];
                        $existsInDb = \App\Models\Lead::where('tenant_id', $currentTenantId)->whereIn('phone', $variants)->exists();
                        $existsInBatch = in_array($phone, $phonesInBatch, true);

                        $isExistingDuplicate = $existsInDb;
                        $isInFileDuplicate = !$existsInDb && $existsInBatch;

                        $isDuplicate = $existsInDb || $existsInBatch;

                        // Track in-file duplicates for the batch when not already present in DB.
                        if (!$existsInDb) {
                            $phonesInBatch[] = $phone;
                        }
                    }

                    if ($isDuplicate) {
                        $status = 'duplicate';
                        $stage = 'Duplicate';
                    }
                }

                $nextActionDate = trim((string)($leadData['next_action_date'] ?? ''));
                $nextActionTime = trim((string)($leadData['next_action_time'] ?? ''));
                if ($nextActionDate !== '' && !preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $nextActionDate)) {
                    $nextActionDate = '';
                }
                if ($nextActionTime !== '' && !preg_match('/^\\d{2}:\\d{2}$/', $nextActionTime)) {
                    $nextActionTime = '';
                }

                // 5. Source exists check (optional but good for data integrity)
                // We already checked $sourceName is not empty.
                $sourceExists = \App\Models\Source::where('tenant_id', $currentTenantId)
                    ->where('name', $sourceName)->exists();
                // If it doesn't exist, we will use it anyway but we could also log a warning.
                // For now, keeping it flexible as per previous requirement but strict on presence.

                // 6. Create Lead
                $metaData = [];
                $comment = isset($leadData['comment']) ? trim((string)$leadData['comment']) : '';
                if ($comment !== '') {
                    $metaData['comment'] = $comment;
                }
                $phoneCountry = isset($leadData['phone_country']) ? trim((string)$leadData['phone_country']) : '';
                if ($phoneCountry !== '') {
                    $metaData['phone_country'] = $phoneCountry;
                }
                $duplicateOfId = null;
                if ($status === 'duplicate' && $phone !== '') {
                    try {
                        $variants = PhoneNormalizer::variantsForSearch($rawPhone, $phoneCountryHint);
                        $variants = !empty($variants) ? $variants : [$phone];
                        $original = \App\Models\Lead::where('tenant_id', $currentTenantId)
                            ->whereIn('phone', $variants)
                            ->where(function ($q) {
                                $q->whereNull('status')->orWhere('status', '!=', 'duplicate');
                            })
                            ->orderBy('id', 'asc')
                            ->first();
                        if (!$original) {
                            $original = \App\Models\Lead::where('tenant_id', $currentTenantId)
                                ->whereIn('phone', $variants)
                                ->orderBy('id', 'asc')
                                ->first();
                        }
                        $duplicateOfId = $this->resolveDuplicateRootId($original, $currentTenantId);
                    } catch (\Throwable $e) {
                        $duplicateOfId = null;
                    }
                }
                if ($duplicateOfId) {
                    $metaData['duplicate_of'] = $duplicateOfId;
                }

                $lead = Lead::create([
                    'name' => $name,
                    'email' => $leadData['email'] ?? null,
                    'phone' => $phone,
                    'company' => $leadData['company'] ?? null,
                    'stage' => $stage,
                    'status' => $status,
                    'priority' => $leadData['priority'] ?? 'medium',
                    'source' => $sourceName,
                    'campaign' => $leadData['campaign'] ?? null,
                    'project' => $projectName !== '' ? $projectName : null,
                    'project_id' => $projectId,
                    'item_id' => $itemId,
                    'estimated_value' => $leadData['estimatedValue'] ?? 0,
                    'notes' => $leadData['notes'] ?? null,
                    'created_by' => $currentUserId,
                    'tenant_id' => $currentTenantId,
                    'meta_data' => !empty($metaData) ? $metaData : null,
                ]);
                
                // Sales Person Assignment
                $assignedToRaw = trim((string)($leadData['assignedTo'] ?? ''));
                if ($assignedToRaw !== '') {
                    $assignedUser = \App\Models\User::where('tenant_id', $currentTenantId)
                        ->where(function($q) use ($assignedToRaw) {
                            $q->where('id', $assignedToRaw)->orWhere('name', 'LIKE', "%{$assignedToRaw}%");
                        })->first();
                    
                    if ($assignedUser) {
                        $lead->assigned_to = $assignedUser->id;
                        $lead->sales_person = $assignedUser->name;
                        $lead->save();
                    } else {
                        $errors[] = "Row {$rowNum}: Sales Person '{$assignedToRaw}' not found.";
                    }
                }

                if ($status === 'duplicate') {
                    $duplicateCount++;
                    if ($isExistingDuplicate) {
                        $duplicateExistingCount++;
                    } elseif ($isInFileDuplicate) {
                        $duplicateInFileCount++;
                    }
                }

                if ($nextActionDate !== '') {
                    try {
                        \App\Models\LeadAction::create([
                            'lead_id' => $lead->id,
                            'tenant_id' => $currentTenantId,
                            'user_id' => $lead->assigned_to ?: $currentUserId,
                            'action_type' => 'call',
                            'description' => 'Imported next action',
                            'stage_id_at_creation' => null,
                            'next_action_type' => 'call',
                            'details' => array_filter([
                                'date' => $nextActionDate,
                                'time' => $nextActionTime !== '' ? $nextActionTime : null,
                                'status' => 'scheduled',
                                'source' => 'import',
                                'priority' => $lead->priority ?? 'medium',
                            ], fn($v) => $v !== null && $v !== ''),
                        ]);
                    } catch (\Throwable $e) {
                        $errors[] = "Row {$rowNum}: Failed to create next action ({$e->getMessage()}).";
                    }
                }
                
                $created[] = $lead->id;
            } catch (\Exception $e) {
                $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
                continue;
            }
        }

        $createdCount = count($created);
        $newCount = max(0, $createdCount - $duplicateCount);

        return response()->json([
            'message' => 'Import completed',
            'count' => $createdCount,
            'new_count' => $newCount,
            'duplicate_count' => $duplicateCount,
            'duplicate_existing_count' => $duplicateExistingCount,
            'duplicate_in_file_count' => $duplicateInFileCount,
            'errors' => $errors
        ], 200);
    }

    public function bulkAssign(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'assigned_to' => 'required',
            'assign_role' => 'nullable|in:sales,manager',
            'options' => 'nullable|array' // Accept options array
        ]);

        $role = $request->input('assign_role', 'sales');
        $userId = $request->assigned_to;
        $currentUserId = $request->user()->id;
        $options = $request->input('options', []);

        DB::transaction(function () use ($request, $role, $userId, $currentUserId, $options) {
            if ($role === 'manager') {
                Lead::whereIn('id', $request->ids)
                    ->orderBy('id')
                    ->chunk(200, function ($leads) use ($userId) {
                        foreach ($leads as $lead) {
                            $lead->manager_id = $userId;
                            $lead->assigned_to = null;
                            $lead->sales_person = null;
                            $lead->save();
                        }
                    });
            } else {
                // Assigning to Sales Person
                $user = \App\Models\User::find($userId);

                Lead::whereIn('id', $request->ids)
                    ->orderBy('id')
                    ->chunk(200, function ($leads) use ($currentUserId, $user, $userId) {
                        foreach ($leads as $lead) {
                            if (empty($lead->manager_id)) {
                                if ($user && !empty($user->manager_id)) {
                                    $lead->manager_id = $user->manager_id;
                                } else {
                                    $lead->manager_id = $currentUserId;
                                }
                            }

                            $lead->assigned_to = $userId;
                            if ($user) {
                                $lead->sales_person = $user->name;
                            }
                            $lead->save();
                        }
                    });
            }
        });

        return response()->json(['message' => 'Leads assigned successfully']);
    }

    public function bulkStatus(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'status' => 'required|string'
        ]);

        Lead::whereIn('id', $request->ids)->update(['status' => $request->status]);

        return response()->json(['message' => 'Leads status updated successfully']);
    }

    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array'
        ]);

        $ids = $request->ids;
        
        DB::transaction(function () use ($ids) {
            $leads = Lead::whereIn('id', $ids)->get();
            
            foreach ($leads as $lead) {
                \App\Models\RecycleLead::create([
                    'original_lead_id' => $lead->id,
                    'lead_data' => $lead->toArray(),
                    'deleted_by' => \Illuminate\Support\Facades\Auth::id(),
                    'deleted_at' => now(),
                ]);
            }

            // Then delete permanently from source
            Lead::whereIn('id', $ids)->forceDelete();
        });

        return response()->json(['message' => 'Leads moved to recycle bin successfully']);
    }

    public function bulkRestore(Request $request)
    {
        $request->validate([
            'ids' => 'required|array'
        ]);

        $ids = $request->ids;
        $restoredCount = 0;
        $errors = [];

        // Find RecycleLead entries where original_lead_id is in the list
        // OR id is in the list (in case frontend sends recycle_id)
        $recycleLeads = RecycleLead::whereIn('original_lead_id', $ids)
                                    ->orWhereIn('id', $ids)
                                    ->get();

        foreach ($recycleLeads as $recycleLead) {
            try {
                DB::transaction(function () use ($recycleLead) {
                    $this->_restoreRecycleLead($recycleLead);
                });
                $restoredCount++;
            } catch (\Exception $e) {
                $errors[] = "Failed to restore lead (Recycle ID: {$recycleLead->id}): " . $e->getMessage();
                \Illuminate\Support\Facades\Log::error("Bulk restore error for RecycleLead {$recycleLead->id}: " . $e->getMessage());
            }
        }

        if (count($errors) > 0) {
            return response()->json(['message' => "Restored $restoredCount leads with some errors", 'errors' => $errors], 207);
        }

        return response()->json(['message' => 'Leads restored successfully']);
    }

    public function bulkForceDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array'
        ]);

        $ids = $request->ids;

        DB::transaction(function () use ($ids) {
            // Delete from Recycle Bin table first
            \App\Models\RecycleLead::whereIn('original_lead_id', $ids)->delete();

            // Then delete permanently from Leads table
            Lead::withTrashed()->whereIn('id', $ids)->forceDelete();

            // Delete associated field values
            FieldValue::whereIn('record_id', $ids)
                ->whereIn('field_id', function($query) {
                    $query->select('id')->from('fields')->where('entity_id', function($q){
                        $q->select('id')->from('entities')->where('key', 'leads');
                    });
                })->delete();
        });

        return response()->json(['message' => 'Leads permanently deleted']);
    }

    public function recycleBin(Request $request)
    {
        try {
            $tenantId = null;
            if (app()->bound('current_tenant_id')) {
                $tenantId = app('current_tenant_id');
            } elseif (\Illuminate\Support\Facades\Auth::check()) {
                $tenantId = \Illuminate\Support\Facades\Auth::user()->tenant_id;
            }

            // Optimization: Select only necessary columns from RecycleLead
            $query = RecycleLead::select(['id', 'original_lead_id', 'lead_data', 'deleted_at', 'deleted_by']);
            
            if ($tenantId) {
                 // Filter by tenant_id in the JSON column
                 // Assuming MySQL 5.7+ or MariaDB compatible with JSON
                 $query->where('lead_data->tenant_id', $tenantId);
            }

            // Limit results to prevent memory exhaustion, or use pagination if frontend supported it
            // For now, limiting to 500 recent items for stability
            $recycledLeads = $query->orderBy('deleted_at', 'desc')->limit(500)->get();
            
            $data = $recycledLeads->map(function ($item) {
                $leadData = $item->lead_data;
                if (!is_array($leadData)) {
                    $leadData = json_decode($leadData, true) ?? [];
                }
                // Ensure we have an ID
                if (!isset($leadData['id'])) {
                    $leadData['id'] = $item->original_lead_id;
                }
                
                // Add recycle metadata
                $leadData['recycle_id'] = $item->id;
                $leadData['deleted_at'] = $item->deleted_at->toIso8601String();
                $leadData['deleted_by'] = $item->deleted_by;

                // Optimization: Filter returned fields to reduce payload size
                $allowedFields = [
                    'id', 'recycle_id', 'name', 'email', 'phone', 'company', 
                    'status', 'stage', 'priority', 'source', 'assigned_to', 
                    'assignedTo', 'created_at', 'lastContact', 'estimated_value', 
                    'estimatedValue', 'notes', 'deleted_at', 'deleted_by',
                    'old_stage', 'oldStage', 'project', 'project_id', 'item_id'
                ];
                
                return \Illuminate\Support\Arr::only($leadData, $allowedFields);
            });

            return response()->json($data);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Recycle Bin Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch recycle bin', 
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function reassignmentReport(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                abort(401, 'Unauthorized');
            }

            $dateFrom = $request->input('date_from', now()->startOfMonth());
            $dateTo = $request->input('date_to', now()->endOfDay());

            $query = Activity::query()
                ->where('subject_type', Lead::class)
                ->where('event', 'updated')
                ->whereDate('created_at', '>=', $dateFrom)
                ->whereDate('created_at', '<=', $dateTo);

            if ($user->tenant_id) {
                $query->where('tenant_id', $user->tenant_id);
            }

            // Hierarchy Filter: Only show logs where from_user, to_user, or causer is in the user's viewable scope
            $roleLower = strtolower($user->role ?? '');
            $isAdminOrDirector = $user->is_super_admin || 
                                in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

            $viewableUserIds = null;
            if (!$isAdminOrDirector) {
                $viewableUserIds = $this->getViewableUserIds($user);
            }

            $logs = $query->with(['causer', 'subject'])->latest()->get();

            $transactions = [];
            $userIds = [];
            // We don't need leadIds for the aggregated view, but we might need them if we want to show lead names in a tooltip or drilldown.
            // For the requested table (aggregated), we just need counts.

            $grouped = [];

            foreach ($logs as $log) {
                $props = $log->properties;
                
                // Ensure props is an array/collection, Spatie usually returns Collection or Array
                if (!is_array($props) && is_object($props) && method_exists($props, 'toArray')) {
                    $props = $props->toArray();
                }
                if (!is_array($props)) {
                    // Fallback or skip if properties are malformed
                    continue; 
                }

                $attrs = is_array($props['attributes'] ?? null) ? $props['attributes'] : [];
                $old = is_array($props['old'] ?? null) ? $props['old'] : [];

                $newAssignee = $attrs['assigned_to'] ?? null;
                $oldAssignee = $old['assigned_to'] ?? null;

                $newManager = $attrs['manager_id'] ?? null;
                $oldManager = $old['manager_id'] ?? null;

                // Check for stage/status changes in the same log
                // Note: If stage didn't change during assignment, these might be null.
                // We'll use 'N/A' or 'Unchanged' if not present in the log.
                $stageBefore = $old['stage'] ?? ($old['status'] ?? 'N/A');
                $stageAfter = $attrs['stage'] ?? ($attrs['status'] ?? 'N/A');

                if ($stageBefore === 'N/A' && $log->subject) {
                    $stageBefore = $log->subject->stage ?? 'N/A';
                }
                if ($stageAfter === 'N/A' && $log->subject) {
                    $stageAfter = $log->subject->stage ?? 'N/A';
                }

                // Ensure stage strings are safe for implode
                $stageBefore = is_string($stageBefore) ? $stageBefore : (string)$stageBefore;
                $stageAfter = is_string($stageAfter) ? $stageAfter : (string)$stageAfter;

                $assignedTouched = array_key_exists('assigned_to', $attrs);
                $managerTouched = array_key_exists('manager_id', $attrs);

                if (!$assignedTouched && !$managerTouched) {
                    continue;
                }

                $hasChange = false;
                if ($assignedTouched && $newAssignee !== $oldAssignee) {
                    $hasChange = true;
                }
                if ($managerTouched && $newManager !== $oldManager) {
                    $hasChange = true;
                }
                if (!$hasChange) {
                    continue;
                }

                // Apply Hierarchy Filter
                if ($viewableUserIds !== null) {
                    $userIdsInLog = array_filter([$log->causer_id, $oldAssignee, $newAssignee, $oldManager, $newManager]);
                    $isInScope = false;
                    foreach ($userIdsInLog as $uid) {
                        if (in_array((int)$uid, $viewableUserIds)) {
                            $isInScope = true;
                            break;
                        }
                    }
                    if (!$isInScope) {
                        continue;
                    }
                }

                $date = $log->created_at->format('Y-m-d');

                // Group Key
                $causer = $log->causer_id ?? 'system';
                $key = implode('|', [
                    $date,
                    $oldAssignee ?? 'null',
                    $newAssignee ?? 'null',
                    $oldManager ?? 'null',
                    $newManager ?? 'null',
                    $stageBefore,
                    $stageAfter,
                    $causer
                ]);

                if (!isset($grouped[$key])) {
                    $grouped[$key] = [
                        'date' => $date,
                        'from_sales_id' => $assignedTouched ? $oldAssignee : null,
                        'to_sales_id' => $assignedTouched ? $newAssignee : null,
                        'from_manager_id' => $managerTouched ? $oldManager : null,
                        'to_manager_id' => $managerTouched ? $newManager : null,
                        'stage_before' => $stageBefore,
                        'stage_after' => $stageAfter,
                        'count' => 0,
                        'causer_id' => $log->causer_id
                    ];
                }
                $grouped[$key]['count']++;

                if ($log->causer_id) $userIds[] = $log->causer_id;
                if ($oldAssignee) $userIds[] = $oldAssignee;
                if ($newAssignee) $userIds[] = $newAssignee;
                if ($oldManager) $userIds[] = $oldManager;
                if ($newManager) $userIds[] = $newManager;
            }

            if (empty($grouped)) {
                return response()->json([
                    'transactions' => [],
                    'stats' => [
                        'total_reassigned' => 0,
                        'unassigned_count' => 0,
                    ],
                    'aggregates' => [
                        'top_receivers' => [],
                        'top_senders' => [],
                    ]
                ]);
            }

            $users = User::with('manager')->whereIn('id', array_unique($userIds))->get()->keyBy('id');

            $filteredTransactions = [];
            $fromManagerId = $request->input('from_manager_id');
            $toManagerId = $request->input('to_manager_id');
            $fromSalesId = $request->input('from_sales_id');
            $toSalesId = $request->input('to_sales_id');

            foreach ($grouped as $group) {
                $fromSales = $group['from_sales_id'] ? ($users[$group['from_sales_id']] ?? null) : null;
                $toSales = $group['to_sales_id'] ? ($users[$group['to_sales_id']] ?? null) : null;
                $fromManager = $group['from_manager_id'] ? ($users[$group['from_manager_id']] ?? null) : null;
                $toManager = $group['to_manager_id'] ? ($users[$group['to_manager_id']] ?? null) : null;
                $byUser = $group['causer_id'] ? ($users[$group['causer_id']] ?? null) : null;
                
                // Apply Filters
                if ($fromManagerId && (string)($group['from_manager_id'] ?? '') !== (string)$fromManagerId) continue;
                if ($toManagerId && (string)($group['to_manager_id'] ?? '') !== (string)$toManagerId) continue;
                if ($fromSalesId && (string)($group['from_sales_id'] ?? '') !== (string)$fromSalesId) continue;
                if ($toSalesId && (string)($group['to_sales_id'] ?? '') !== (string)$toSalesId) continue;

                $fromUserPayload = $fromSales ? [
                    'id' => $fromSales->id,
                    'name' => $fromSales->name,
                    'manager' => $fromSales->manager ? ['id' => $fromSales->manager->id, 'name' => $fromSales->manager->name] : null
                ] : [
                    'id' => null,
                    'name' => '-',
                    'manager' => $fromManager ? ['id' => $fromManager->id, 'name' => $fromManager->name] : null
                ];

                $toUserPayload = $toSales ? [
                    'id' => $toSales->id,
                    'name' => $toSales->name,
                    'manager' => $toSales->manager ? ['id' => $toSales->manager->id, 'name' => $toSales->manager->name] : null
                ] : [
                    'id' => null,
                    'name' => '-',
                    'manager' => $toManager ? ['id' => $toManager->id, 'name' => $toManager->name] : null
                ];

                $filteredTransactions[] = [
                    'id' => uniqid(), // Virtual ID for key
                    'date' => $group['date'],
                    'quantity' => $group['count'],
                    'stage_before' => $group['stage_before'],
                    'stage_after' => $group['stage_after'],
                    'from_user' => $fromUserPayload,
                    'to_user' => $toUserPayload,
                    'by_user' => $byUser ? [
                        'id' => $byUser->id,
                        'name' => $byUser->name
                    ] : ['id' => null, 'name' => 'System'],
                ];
            }

            // Calculate Stats based on aggregated data
            $totalReassigned = collect($filteredTransactions)->sum('quantity');
            $unassignedCount = collect($filteredTransactions)->where('to_user.id', null)->sum('quantity');

            $receivers = collect($filteredTransactions)
                ->whereNotNull('to_user.id')
                ->groupBy('to_user.name')
                ->map(fn($rows) => $rows->sum('quantity'))
                ->sortDesc()
                ->take(5)
                ->map(fn($count, $name) => ['name' => $name, 'count' => $count])
                ->values(); // Reset keys for array
                
            $senders = collect($filteredTransactions)
                ->whereNotNull('from_user.id')
                ->groupBy('from_user.name')
                ->map(fn($rows) => $rows->sum('quantity'))
                ->sortDesc()
                ->take(5)
                ->map(fn($count, $name) => ['name' => $name, 'count' => $count])
                ->values();

            // Pagination
            $page = $request->input('page', 1);
            $perPage = $request->input('per_page', 10);
            $offset = ($page - 1) * $perPage;
            
            $paginatedTransactions = array_slice($filteredTransactions, $offset, $perPage);
            $total = count($filteredTransactions);

            return response()->json([
                'transactions' => [
                    'data' => $paginatedTransactions,
                    'total' => $total,
                    'per_page' => $perPage,
                    'current_page' => $page,
                    'last_page' => ceil($total / $perPage),
                ],
                'stats' => [
                    'total_reassigned' => $totalReassigned,
                    'unassigned_count' => $unassignedCount,
                ],
                'aggregates' => [
                    'top_receivers' => $receivers, // Already formatted as array of objects
                    'top_senders' => $senders,
                ]
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Reassignment Report Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            return response()->json([
                'message' => 'Failed to generate reassignment report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function resolveDuplicate(Request $request, $id)
    {
        try {
            $duplicateLead = Lead::findOrFail($id);
            
            $request->validate([
                'original_lead_id' => 'required|exists:leads,id',
                'action' => 'required|in:keep_original,keep_duplicate',
                'updated_data' => 'nullable|array'
            ]);
            
            $originalLead = Lead::findOrFail($request->original_lead_id);
            $action = $request->action;
            
            DB::transaction(function() use ($originalLead, $duplicateLead, $action, $request) {
                if ($action === 'keep_duplicate') {
                    // 1. Update original lead with data from request (which came from duplicate)
                    if ($request->has('updated_data')) {
                        // Exclude fields that shouldn't be overwritten
                        $data = $request->updated_data;
                        unset($data['id'], $data['_id'], $data['created_at'], $data['updated_at'], $data['deleted_at']);
                        
                        // Ensure we don't copy the 'duplicate' status/stage to the original lead
                        if (isset($data['status']) && strtolower($data['status']) === 'duplicate') {
                            $data['status'] = 'new'; // Reset to new if it was marked as duplicate
                        }
                        if (isset($data['stage']) && strtolower($data['stage']) === 'duplicate') {
                            $data['stage'] = 'New Lead'; // Reset to default stage
                        }
                        
                        $originalLead->update($data);
                    }
                    
                    // 2. Move history (actions) from duplicate to original
                    \App\Models\LeadAction::where('lead_id', $duplicateLead->id)
                        ->update(['lead_id' => $originalLead->id]);
                        
                    // 3. Move activity logs (Spatie)
                    \Spatie\Activitylog\Models\Activity::where('subject_type', Lead::class)
                        ->where('subject_id', $duplicateLead->id)
                        ->update(['subject_id' => $originalLead->id]);
                } else {
                    // keep_original: ensure original is NOT marked as duplicate
                    if (strtolower($originalLead->status) === 'duplicate') {
                        $originalLead->status = 'new';
                    }
                    if (strtolower($originalLead->stage) === 'duplicate') {
                        $originalLead->stage = 'New Lead';
                    }
                    $originalLead->save();

                    // only move history from duplicate to original
                    \App\Models\LeadAction::where('lead_id', $duplicateLead->id)
                        ->update(['lead_id' => $originalLead->id]);
                }
                
                // Finally delete the duplicate lead
                $duplicateLead->delete();
                
                // Log the merge on original lead
                activity()
                    ->performedOn($originalLead)
                    ->causedBy(Auth::user())
                    ->withProperties(['duplicate_lead_id' => $duplicateLead->id, 'action' => $action])
                    ->log("Lead resolved as duplicate. Action: {$action}");
            });
            
            return response()->json([
                'message' => 'Duplicate lead resolved successfully',
                'lead' => $originalLead->fresh(['actions', 'activities'])
            ]);
            
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Resolve Duplicate Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to resolve duplicate', 'error' => $e->getMessage()], 500);
        }
    }

    public function warnDuplicate(Request $request, $id)
    {
        try {
            $duplicateLead = Lead::findOrFail($id);
            
            // Validate request
            $request->validate([
                'original_lead_id' => 'required|exists:leads,id',
                'notes' => 'nullable|string'
            ]);
            
            $originalLead = Lead::findOrFail($request->original_lead_id);
            
            // Update the duplicate lead notes
            if ($request->has('notes')) {
                $duplicateLead->notes = $request->notes;
                $duplicateLead->save();
            }
            
            // Notify the assigned agent of the duplicate lead
            if ($duplicateLead->assigned_to) {
                // assigned_to stores user ID
                $assignedUser = User::find($duplicateLead->assigned_to);
                if ($assignedUser) {
                    $assignedUser->notify(new \App\Notifications\DuplicateLeadWarning($duplicateLead, $originalLead));
                }
            }
            
            return response()->json([
                'message' => 'Agent warned successfully',
                'lead' => $duplicateLead
            ]);
            
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Warn Duplicate Error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to warn agent', 'error' => $e->getMessage()], 500);
        }
    }

    public function transfer(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);
        
        // Prevent Sales Person from assigning leads
        // Role check: Sales Person cannot assign unless they have explicit permission (which they shouldn't by default)
        $user = $request->user();
        $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
        $roleLower = strtolower($user->role ?? '');
        $isSalesPerson = str_contains($roleLower, 'sales person') || str_contains($roleLower, 'salesperson') || in_array('sales person', $roles) || in_array('salesperson', $roles);
        
        // But Sales Admin/Manager/Team Leader can.
        // If strict "Sales Person" role (and not manager/admin), deny.
        // Assuming Sales Person role doesn't have 'assign-leads' permission or we check explicitly.
        // Let's rely on role check for strict adherence to the report.
        if ($isSalesPerson && 
            !str_contains($roleLower, 'manager') && 
            !str_contains($roleLower, 'admin') && 
            !str_contains($roleLower, 'leader') && 
            !str_contains($roleLower, 'director')) {
             return response()->json(['message' => 'Sales Persons cannot assign leads.'], 403);
        }

        $request->validate([
            'assigned_to' => 'required',
            'stage' => 'required',
            'history_option' => 'required|in:keep_history,assign_as_new'
        ]);

        $newAgentId = $request->assigned_to;
        $targetStage = $request->stage; // 'same_stage', 'new_lead', 'cold_calls'
        $historyOption = $request->history_option;
        $duplicateId = $request->duplicate_id;

        DB::transaction(function() use ($lead, $newAgentId, $targetStage, $historyOption, $duplicateId, $request) {
            // Resolve User
            $user = \App\Models\User::where('id', $newAgentId)->orWhere('name', $newAgentId)->first();
            
            // Scope Rule: Assignee must be in the manager's team (descendants)
            // Or self-assignment
            $currentUser = $request->user();
            if ($user && $user->id !== $currentUser->id && !$currentUser->is_super_admin) {
                 // Check if user is a descendant or managed by current user
                 // For Sales Manager, they can only assign to direct subordinates (Team Leaders, Sales Persons)
                 // We use the descendants() relationship or similar logic.
                 // Assuming descendants() is available on User model (e.g. via nested sets or recursive relationship)
                 
                 // If not using a specific package, we might check manager_id.
                 // Ideally, we trust the frontend list (which is filtered), but for strict backend enforcement:
                 $isSubordinate = false;
                 
                 // Check if target user is in the descendants list
                 if (method_exists($currentUser, 'descendants')) {
                     $isSubordinate = $currentUser->descendants()->where('id', $user->id)->exists();
                 } else {
                     // Fallback: check if target's manager is current user (direct)
                     $isSubordinate = $user->manager_id == $currentUser->id;
                 }
                 
                 // If not a subordinate, deny assignment
                 // Exception: Admin/Tenant Admin can assign to anyone
                 $roleLower = strtolower($currentUser->role ?? '');
                 $isAdmin = str_contains($roleLower, 'admin') || str_contains($roleLower, 'director') || str_contains($roleLower, 'operation manager') || str_contains($roleLower, 'branch manager'); 
                 
                 if (!$isSubordinate && !$isAdmin) {
                     // Sales Manager trying to assign outside team?
                     // Or Sales Admin trying to assign outside?
                     // If strictly following "Sales Manager can assign ONLY to team", we should block.
                     // But let's allow if they are Sales Admin/Branch Manager (broader scope).
                     
                     // If strictly Sales Manager:
                     if ($this->isSalesManager($currentUser) && !$isAdmin) {
                         abort(403, 'You can only assign leads to your team members.');
                     }
                     
                     // If Team Leader trying to assign outside team?
                     if ($this->isTeamLeader($currentUser) && !$isAdmin) {
                         abort(403, 'Team Leaders can only assign leads to their direct team members.');
                     }
                 }
            }

            if ($user) {
                $lead->assigned_to = $user->id;
                $lead->sales_person = $user->name;
            }

            // Stage Transition Logic
            if ($targetStage === 'new_lead') {
                $lead->stage = 'New Lead';
                $lead->status = 'new';
            } elseif ($targetStage === 'cold_calls') {
                $lead->stage = 'Cold Calls';
                // Keep status as "new" so the lead stays visible under its real stage (Cold Calls)
                // for both managers and sales persons. "Pending" is a virtual stage used for New Leads assignment flow.
                $lead->status = 'new';
            } elseif ($targetStage === 'same_stage') {
                // Keep current stage and status
                // But ensure it's not "duplicate" anymore if we're resolving it
                if (strtolower($lead->status) === 'duplicate') {
                    $lead->status = 'new';
                }
                if (strtolower($lead->stage) === 'duplicate') {
                    $lead->stage = 'New Lead';
                }
            } else {
                // Default fallback if something else is sent
                $lead->stage = 'New Lead';
                $lead->status = 'new';
            }

            // If resolving a duplicate via transfer
            if ($duplicateId) {
                $duplicateLead = Lead::find($duplicateId);
                if ($duplicateLead) {
                    // Move actions from duplicate to original
                    \App\Models\LeadAction::where('lead_id', $duplicateLead->id)
                        ->update(['lead_id' => $lead->id]);
                    
                    // Move activities
                    \Spatie\Activitylog\Models\Activity::where('subject_type', Lead::class)
                        ->where('subject_id', $duplicateLead->id)
                        ->update(['subject_id' => $lead->id]);

                    // Delete the duplicate
                    $duplicateLead->delete();
                }
            }

            $lead->save();

            // Handle History Visibility
            if ($historyOption === 'assign_as_new') {
                // Hide existing actions from non-managers
                // We use DB::raw for JSON update to be safe and performant
                $lead->actions()->update([
                    'details' => DB::raw("JSON_SET(COALESCE(details, '{}'), '$.visibility', 'manager')")
                ]);

                // Hide Spatie Activity Logs
                $activities = \Spatie\Activitylog\Models\Activity::forSubject($lead)->get();
                foreach ($activities as $activity) {
                    $props = $activity->properties; 
                    if (is_object($props) && method_exists($props, 'toArray')) {
                        $props = $props->toArray();
                    } elseif (!is_array($props)) {
                        $props = [];
                    }
                    
                    $props['visibility'] = 'manager';
                    $activity->properties = $props;
                    $activity->save();
                }
            }
            
            // Log the transfer
            activity()
               ->performedOn($lead)
               ->causedBy($request->user())
               ->withProperties(['old' => ['assigned_to' => $lead->getOriginal('assigned_to')], 'attributes' => ['assigned_to' => $lead->assigned_to]])
               ->log('Lead transferred');
        });

        return response()->json(['message' => 'Lead transferred successfully', 'lead' => $lead]);
    }

    /**
     * Apply stage filtering logic consistently.
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param array|string $stages
     * @param \App\Models\User $user
     * @return \Illuminate\Database\Eloquent\Builder
     */
    protected function isSalesManager($user): bool
    {
        if (!$user) return false;
        $roleLower = strtolower($user->role ?? '');
        return str_contains($roleLower, 'sales manager');
    }

    protected function isTeamLeader($user): bool
    {
        if (!$user) return false;
        $roleLower = strtolower($user->role ?? '');
        return str_contains($roleLower, 'team leader');
    }

    private function applyStageFilter($query, $stages, $user)
    {
        // Manager Visibility Logic (including Team Leader):
        // - Can see leads assigned to themselves (as Sales Person) -> "New Lead"
        // - Can see leads assigned to their subordinates (Direct or Indirect) -> "Pending"
        // - Cannot see unassigned leads or leads assigned to others outside their scope
        
        $isBranchManager = $this->isBranchManager($user);
        $isSalesAdmin = $this->isSalesAdmin($user);
        $isSalesManager = $this->isSalesManager($user);
        $isTeamLeader = $this->isTeamLeader($user);
        
        // Sales Person Logic:
        // - Can ONLY see leads assigned to themselves
        // - Cannot see team leads or others
        $roleLower = strtolower($user->role ?? '');
        $isSalesPerson = !$isBranchManager && !$isSalesAdmin && !$isSalesManager && !$isTeamLeader && !$user->is_super_admin && 
                         (str_contains($roleLower, 'sales person') || str_contains($roleLower, 'salesperson'));
        
        $stages = (array)$stages;
        
        return $query->where(function($q) use ($stages, $user, $isBranchManager, $isSalesAdmin, $isSalesManager, $isTeamLeader, $isSalesPerson) {
            $isNewRequested = false;
            $isPendingRequested = false;
            $otherStages = [];

            foreach ($stages as $s) {
                $sLower = strtolower($s);
                if ($sLower === 'new' || $sLower === 'new lead') {
                    $isNewRequested = true;
                } elseif ($sLower === 'pending' || $sLower === 'in-progress' || $sLower === 'assigned') {
                    $isPendingRequested = true;
                } elseif ($sLower === 'coldcall' || $sLower === 'cold_call' || $sLower === 'cold calls' || $sLower === 'cold_calls') {
                     $otherStages[] = 'cold calls';
                     $otherStages[] = 'cold-call';
                     $otherStages[] = 'cold_calls';
                     $otherStages[] = 'coldcalls';
                } else {
                    $otherStages[] = $s;
                }
            }
            // Remove duplicates
            $otherStages = array_unique($otherStages);

            $hasCondition = false;
            
            // 1. New Lead Logic
            if ($isNewRequested) {
                $condition = function($sub) use ($user, $isBranchManager, $isSalesAdmin, $isSalesManager, $isTeamLeader, $isSalesPerson) {
                     // قاعدة الورقة 2: الليد يظهر في New Lead إذا:
                     // 1. مرحلته New Lead (أو ما يعادلها)
                     // 2. غير مسند لموظف (assigned_to IS NULL) - للجميع
                     // 3. مسند للمستخدم الحالي
                     
                     $sub->where(function($k) use ($user) {
                         $k->whereIn('stage', ['new', 'new lead'])
                           ->where(function($in) use ($user) {
                               $in->where('assigned_to', $user->id)
                                  ->orWhereNull('assigned_to');
                           });
                     });
                };
                $hasCondition ? $q->orWhere($condition) : $q->where($condition);
                $hasCondition = true;
            }

            // 2. Pending Logic
            if ($isPendingRequested) {
                $condition = function($sub) use ($user, $isBranchManager, $isSalesAdmin, $isSalesManager, $isTeamLeader, $isSalesPerson) {
                    if ($isSalesPerson) {
                        // Sales Person CANNOT see "Pending" in the manager sense.
                        $sub->where('assigned_to', $user->id)
                            ->whereIn('stage', ['pending', 'in-progress']);
                    } elseif ($isBranchManager || $isSalesAdmin || $isSalesManager || $isTeamLeader) {
                        // Managers/Leaders see "Pending" if:
                        // 1. Leads assigned to subordinates AND stage is 'new' (Pending for Manager)
                        // 2. Leads that are actually in 'pending' stage
                        
                        $descendantIds = $user->descendants()->pluck('id')->toArray();
                        
                        $sub->where(function($k) use ($descendantIds, $user) {
                            $k->whereIn('assigned_to', $descendantIds)
                              ->whereNotNull('assigned_to') // Ensure it is assigned
                              ->whereIn('stage', ['new', 'new lead']);
                        })
                        ->orWhereIn('stage', ['pending', 'in-progress'])
                        ->orWhereIn('status', ['pending', 'in-progress']);
                    } else {
                        // Standard Logic (Admin/Owner)
                        $sub->where(function($k) use ($user) {
                            // Any lead assigned to someone else (not me) is Pending for me
                            // EXCLUDE unassigned (they are New Lead)
                            $k->where('assigned_to', '!=', $user->id)
                              ->whereNotNull('assigned_to')
                              ->whereIn('stage', ['new', 'new lead']);
                        })
                        ->orWhereIn('stage', ['pending', 'in-progress'])
                        ->orWhereIn('status', ['pending', 'in-progress']);
                    }
                };
                $hasCondition ? $q->orWhere($condition) : $q->where($condition);
                $hasCondition = true;
            }

            // 3. Other Stages
            if (!empty($otherStages)) {
                if ($isSalesPerson) {
                     // Sales Person: Only assigned to self
                     $condition = function($sub) use ($otherStages, $user) {
                         $sub->whereIn('stage', $otherStages)
                             ->where('assigned_to', $user->id);
                     };
                     $hasCondition ? $q->orWhere($condition) : $q->where($condition);
                         
                } elseif ($isBranchManager || $isSalesAdmin || $isSalesManager || $isTeamLeader) {
                    // Restrict visibility to branch/team only
                    $descendantIds = $user->descendants()->pluck('id')->toArray();
                    $descendantIds[] = $user->id;
                    
                    $condition = function($sub) use ($otherStages, $descendantIds) {
                        $sub->whereIn('stage', $otherStages)
                            ->where(function ($k) use ($descendantIds) {
                                $k->whereIn('assigned_to', $descendantIds)
                                  ->orWhereIn('manager_id', $descendantIds);
                            });
                    };
                    $hasCondition ? $q->orWhere($condition) : $q->where($condition);
                } else {
                    $hasCondition ? $q->orWhereIn('stage', $otherStages) : $q->whereIn('stage', $otherStages);
                }
            }
        });
    }
}
