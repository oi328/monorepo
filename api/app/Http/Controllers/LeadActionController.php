<?php

namespace App\Http\Controllers;

use App\Models\LeadAction;
use App\Models\LeadActionStatusAudit;
use App\Models\Lead;
use App\Models\User;
use App\Models\Property;
use App\Notifications\LeadActionCreated;
use App\Notifications\LeadActionCommentNotification;
use Illuminate\Support\Facades\Notification;
use App\Traits\ResolvesNotificationRecipients;
use App\Traits\UserHierarchyTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LeadActionController extends Controller
{
    use ResolvesNotificationRecipients, UserHierarchyTrait;

    private function normalizeMeetingStatus($status, $doneMeeting = null): string
    {
        $s = strtolower(trim((string) ($status ?? '')));
        if ($s === 'done') return 'done';
        if ($s === 'no_show' || $s === 'no show' || $s === 'noshow' || $s === 'missed') return 'no_show';
        if ($s === 'cancelled' || $s === 'canceled' || $s === 'cancel') return 'cancelled';
        if ($s === 'scheduled' || $s === 'schedule' || $s === 'arranged') return 'scheduled';

        $dm = $doneMeeting;
        if (is_string($dm)) {
            $dm = strtolower(trim($dm));
        }
        if ($dm === true || $dm === 1 || $dm === '1' || $dm === 'true') return 'done';

        return 'scheduled';
    }

    private function isMeetingCorrectionRequested(Request $request, array $details): bool
    {
        try {
            if ($request->boolean('correction')) return true;
            if ($request->boolean('reopen')) return true;
        } catch (\Throwable $e) {
        }

        $c = $details['correction'] ?? $details['reopen'] ?? null;
        if ($c === true || $c === 1 || $c === '1') return true;
        if (is_string($c) && strtolower(trim($c)) === 'true') return true;

        return false;
    }

    private function meetingKeyFromDetails(int $leadId, array $details): string
    {
        $date = trim((string)($details['date'] ?? ''));
        $time = trim((string)($details['time'] ?? ''));
        $type = trim((string)($details['meetingType'] ?? ''));
        $location = trim((string)($details['meetingLocation'] ?? ''));
        return $leadId . '|' . $date . '|' . $time . '|' . $type . '|' . $location;
    }

    private function meetingIdentityFromDetails(int $leadId, array $details): string
    {
        $date = trim((string)($details['date'] ?? ''));
        $time = trim((string)($details['time'] ?? ''));
        return $leadId . '|' . $date . '|' . $time;
    }

    private function loadRecentMeetingActions(int $leadId, int $limit = 200)
    {
        return LeadAction::query()
            ->where('lead_id', $leadId)
            ->where(function ($q) {
                $q->where('action_type', 'meeting')
                    ->orWhere('next_action_type', 'meeting');
            })
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    private function maxFinalRankForMeetingKey($meetingActions, string $meetingKey): int
    {
        $rank = 0;
        foreach ($meetingActions as $a) {
            $d = $a->details;
            if (!is_array($d)) {
                $d = json_decode($d, true) ?? [];
            }
            $key = $this->meetingKeyFromDetails((int)$a->lead_id, $d);
            if ($key !== $meetingKey) continue;

            $status = $this->extractMeetingStatus($d);
            if ($status === 'done') $rank = max($rank, 2);
            elseif ($status === 'no_show') $rank = max($rank, 1);
        }
        return $rank;
    }

    private function findLatestActionForMeetingKey($meetingActions, string $meetingKey): ?LeadAction
    {
        foreach ($meetingActions as $a) {
            $d = $a->details;
            if (!is_array($d)) {
                $d = json_decode($d, true) ?? [];
            }
            $key = $this->meetingKeyFromDetails((int)$a->lead_id, $d);
            if ($key === $meetingKey) return $a;
        }
        return null;
    }

    private function extractMeetingStatus(array $details): string
    {
        return $this->normalizeMeetingStatus($details['meeting_status'] ?? null, $details['doneMeeting'] ?? null);
    }

    private function applyMeetingStatus(array $details, string $status): array
    {
        $nowIso = now()->toISOString();

        if (empty($details['arranged_at'])) {
            $details['arranged_at'] = $nowIso;
        }

        if ($status === 'scheduled' && empty($details['scheduled_at'])) {
            $details['scheduled_at'] = $nowIso;
        }

        if ($status === 'done') {
            if (empty($details['done_at'])) {
                $details['done_at'] = $nowIso;
            }
            $details['doneMeeting'] = 'true';
        }

        if ($status === 'no_show') {
            if (empty($details['missed_at'])) {
                $details['missed_at'] = $nowIso;
            }
            $details['doneMeeting'] = 'false';
        }

        $details['meeting_status'] = $status;
        $details['meeting_status_changed_at'] = $nowIso;

        return $details;
    }

    private function writeMeetingAudit(LeadAction $leadAction, ?string $fromStatus, string $toStatus, ?int $userId): void
    {
        try {
            $lead = $leadAction->lead ?? Lead::find($leadAction->lead_id);
            LeadActionStatusAudit::create([
                'tenant_id' => $lead?->tenant_id,
                'lead_action_id' => $leadAction->id,
                'lead_id' => $leadAction->lead_id,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'changed_by' => $userId,
                'changed_at' => now(),
                'meta' => [
                    'action_type' => $leadAction->action_type,
                ],
            ]);
        } catch (\Throwable $e) {
        }
    }

    private function isManagerLike($user): bool
    {
        if (!$user) return false;

        $roles = [];
        try {
            if (method_exists($user, 'getRoleNames')) {
                $roles = $user->getRoleNames()->map(fn ($r) => strtolower($r))->toArray();
            }
        } catch (\Throwable $e) {
            $roles = [];
        }

        $roleLower = strtolower($user->role ?? '');

        $isSalesPerson =
            str_contains($roleLower, 'sales person') ||
            str_contains($roleLower, 'salesperson') ||
            in_array('sales person', $roles) ||
            in_array('salesperson', $roles) ||
            in_array('sales_person', $roles);

        // Sales persons are generally not allowed to see manager-only history,
        // except when they are acting as a manager in the hierarchy (have subordinates).
        if ($isSalesPerson) {
            try {
                $hasSubordinates = User::where('tenant_id', $user->tenant_id)
                    ->where('manager_id', $user->id)
                    ->exists();
                if ($hasSubordinates) return true;
            } catch (\Throwable $e) {
            }

            return false;
        }

        $candidates = array_merge([$roleLower], $roles);
        foreach ($candidates as $r) {
            $r = strtolower((string) $r);
            if (str_contains($r, 'manager') || str_contains($r, 'team leader') || str_contains($r, 'teamleader') || str_contains($r, 'director')) {
                return true;
            }
        }

        return false;
    }
    use ResolvesNotificationRecipients;

    private function handleBase64Attachment($data, $folder = 'lead_actions/attachments')
    {
        if (!is_array($data) || !isset($data['data']) || !isset($data['name'])) {
            return null;
        }

        try {
            // Extract base64 data
            // Format: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
            $fileData = $data['data'];
            if (strpos($fileData, 'base64,') !== false) {
                $fileData = explode('base64,', $fileData)[1];
            }

            $decodedData = base64_decode($fileData);
            if ($decodedData === false) {
                return null;
            }

            // Generate filename (use provided name if available, otherwise random)
            $providedName = $data['name'] ?? null;
            $extension = pathinfo($providedName, PATHINFO_EXTENSION);
            if (!$extension && isset($data['type'])) {
                $extension = explode('/', $data['type'])[1] ?? 'bin';
            }
            
            if ($providedName) {
                // Use the name from frontend, but ensure it's safe and unique
                $baseName = pathinfo($providedName, PATHINFO_FILENAME);
                $safeBaseName = Str::slug($baseName, '_'); // Sanitize with underscores
                $filename = $safeBaseName . '_' . time() . '_' . Str::random(5) . '.' . $extension;
            } else {
                $filename = Str::random(40) . '.' . $extension;
            }
            
            $path = $folder . '/' . $filename;

            // Store file
            Storage::disk('public')->put($path, $decodedData);

            return $path;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Attachment upload failed: ' . $e->getMessage());
            return null;
        }
    }

    protected function isPrivilegedDuplicateManager($user): bool
    {
        if (!$user)
            return false;
        if ($user->is_super_admin)
            return true;
        $allowed = ['sales admin', 'admin', 'branch manager', 'sales manager'];
        $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
        $roleLower = strtolower($user->role ?? '');
        if (in_array($roleLower, $allowed))
            return true;
        foreach ($allowed as $a) {
            if (in_array($a, $roles))
                return true;
        }
        return false;
    }
    protected function isReferralSupervisor($user, $leadId)
    {
        if (!$user || !$leadId) return false;
        $lead = Lead::find($leadId);
        if (!$lead) return false;
        
        return $lead->assigned_to != $user->id && 
               \App\Models\LeadReferral::where('lead_id', $leadId)
                                       ->where('user_id', $user->id)
                                       ->exists();
    }

    /**
     * Display a listing of the resource.
     */
    public function activityReport(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        $query = LeadAction::query();

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $employeeIds = $request->input('employee_ids', []);
        if (!is_array($employeeIds)) {
            $employeeIds = [];
        }
        $managerId = $request->input('manager_id');
        $ids = [];
        $shouldFilter = false;

        if (!empty($employeeIds)) {
            $ids = array_map('intval', $employeeIds);
        } else {
            $roleLower = strtolower($user->role ?? '');
            $isAdminOrManager = $user->is_super_admin || 
                                in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

            if (!$isAdminOrManager) {
                $viewableUserIds = $this->getViewableUserIds($user);
                if ($viewableUserIds !== null) {
                    $ids = $viewableUserIds;
                    $shouldFilter = true;
                } else {
                    $ids = [(int)$user->id];
                    $shouldFilter = true;
                }
            } elseif (!empty($managerId)) {
                $root = User::where('tenant_id', $user->tenant_id)->find($managerId);
                if ($root) {
                    $ids = $this->collectSubordinatesIds($root);
                    $ids[] = (int)$root->id;
                    $shouldFilter = true;
                }
            }
        }

        if ($shouldFilter) {
            $query->whereIn('user_id', $ids);
        } elseif (!empty($ids)) {
            $query->whereIn('user_id', $ids);
        }

        $report = $query
            ->selectRaw('user_id, count(*) as actions_count')
            ->groupBy('user_id')
            ->with('user')
            ->get();

        return response()->json($report);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        $query = LeadAction::query()->with(['user', 'lead.assignedAgent']);

        // Handle History Visibility (assign_as_new)
        // Manager-only history should be visible to admin and manager-like roles,
        // but hidden from sales persons/agents.
        $roleLower = strtolower($user->role ?? '');
        $roles = $user->getRoleNames()->map(fn($r) => strtolower($r))->toArray();
        
        $isAdmin = str_contains($roleLower, 'admin') || 
                   in_array('admin', $roles) || 
                   in_array('tenant admin', $roles) ||
                   $user->is_super_admin;
                     
        $canSeeManagerOnlyHistory = $isAdmin || $this->isManagerLike($user);

        if (!$canSeeManagerOnlyHistory) {
             $query->where(function($q) {
                 $q->whereNull('details->visibility')
                   ->orWhere('details->visibility', '!=', 'manager');
             });
        }

        if ($request->has('lead_id')) {
            $query->where('lead_id', $request->lead_id);
        }

        if ($request->has('type') && $request->type) {
            $type = $request->type;
            $query->where(function ($q) use ($type) {
                $q->where('action_type', $type);
            });
        }

        if ($request->has('next_action_type') && $request->next_action_type) {
            $next = $request->next_action_type;
            $query->where('next_action_type', $next);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->has('scheduled_date_from')) {
            $query->where('details->date', '>=', $request->scheduled_date_from);
        }

        if ($request->has('scheduled_date_to')) {
            $query->where('details->date', '<=', $request->scheduled_date_to);
        }

        if (!$request->has('lead_id')) {
            $employeeIds = $request->input('employee_ids', []);
            if (!is_array($employeeIds)) {
                $employeeIds = [];
            }
            $managerId = $request->input('manager_id');
            $ids = [];
            $shouldFilter = false;

            if (!empty($employeeIds)) {
                $ids = array_map('intval', $employeeIds);
            } else {
                $roleLower = strtolower($user->role ?? '');
                $isAdminOrManager = $user->is_super_admin || 
                                    in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

                if (!$isAdminOrManager) {
                    $viewableUserIds = $this->getViewableUserIds($user);
                    if ($viewableUserIds !== null) {
                        $ids = $viewableUserIds;
                        $shouldFilter = true;
                    } else {
                        $ids = [(int)$user->id];
                        $shouldFilter = true;
                    }
                } elseif (!empty($managerId)) {
                    $root = User::where('tenant_id', $user->tenant_id)->find($managerId);
                    if ($root) {
                        $ids = $this->collectSubordinatesIds($root);
                        $ids[] = (int)$root->id;
                        $shouldFilter = true;
                    }
                }
            }

            if ($shouldFilter) {
                $query->whereIn('user_id', $ids);
            } elseif (!empty($ids)) {
                $query->whereIn('user_id', $ids);
            }
        }

        if ($request->has('lead_id')) {
            $actions = $query->with('user')->latest()->get();
        } else {
            $limit = (int) $request->input('limit', 2000);
            if ($limit <= 0) {
                $limit = 2000;
            }
            $actions = $query->with('user')->orderByDesc('id')->limit($limit)->get();
        }

        return response()->json($actions);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lead_id' => 'required|exists:leads,id',
            'type' => 'required|string', // Maps to action_type
            'status' => 'required|string', // Maps to details.status
            'date' => 'nullable|date', // Maps to details.date
            'time' => 'nullable', // Maps to details.time
            'description' => 'nullable|string',
            'outcome' => 'nullable|string', // Maps to details.outcome
            'stage_id' => 'nullable|exists:stages,id', // Maps to stage_id_at_creation
            'next_action_type' => 'nullable|string',
            'meeting_status' => 'nullable|string|in:scheduled,done,no_show,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $lead = Lead::find($request->lead_id);
        if (!$lead) {
            return response()->json(['message' => 'Lead not found'], 404);
        }

        $user = $request->user();
        $isOwner = $lead->assigned_to == $user->id;

        // Strict Rule: Only Lead Owner can perform actions.
        // Managers/Admins can only add comments/notes.
        if (!$isOwner && !$user->is_super_admin) {
            $allowedTypes = ['comment', 'note', 'internal_comment'];
            // Check if it's a comment/note
            if (!in_array($request->type, $allowedTypes)) {
                 return response()->json(['message' => 'Only the Lead Owner can perform actions. Managers/Admins can only add comments or notes.'], 403);
            }
            
            // Managers cannot change stage - explicitly block any stage update attempt
            if ($request->has('stage_id') || $request->has('stage')) {
                 return response()->json(['message' => 'Managers cannot change the lead stage. Only Lead Owner can change stage.'], 403);
            }
        }

        // Enterprise Referral Supervision: Block Action Creation
        if ($this->isReferralSupervisor($request->user(), $lead->id)) {
             // Allow comments/notes
             $allowedTypes = ['note', 'comment', 'internal_comment'];
             if (!in_array($request->type, $allowedTypes)) {
                 abort(403, 'Referral supervisors cannot add actions.');
             }
        }

        // If lead is duplicate, restrict actions to privileged managers
        $isDuplicate = strtolower($lead->status ?? '') === 'duplicate' || strtolower($lead->stage ?? '') === 'duplicate';
        if ($isDuplicate) {
            $user = $request->user();
            if (!$user || (!$user->is_super_admin && !$user->can('act-on-duplicate-leads'))) {
                abort(403, 'Unauthorized to act on duplicate leads');
            }
        }

        // Assignment workflow rule:
        // Once the lead owner takes the first action, it should leave "Pending" and show its real stage.
        // This keeps managers/sales views consistent with the Lead lifecycle (Assigned -> Pending -> Action -> Real Stage).
        $shouldSaveLead = false;
        if ($isOwner && strtolower((string) ($lead->status ?? '')) === 'pending') {
            $lead->status = 'new';
            $shouldSaveLead = true;
        }

        // Update Lead Stage if provided
        if ($request->has('stage_id') && $request->stage_id) {
            // Fetch stage name to update 'stage' string column in leads table
            $stage = \App\Models\Stage::find($request->stage_id);
            if ($stage) {
                $lead->stage = $stage->name;
                $shouldSaveLead = true;
                
                // Add stage name to details for permanent record
                $request->merge(['stage_at_creation_name' => $stage->name]);
            }
        }

        if ($shouldSaveLead) {
            $lead->save();
        }

        // Prepare Description with "On Behalf Of" logic
        $description = $request->description;
        // If description is empty, check notes or title from request as fallback
        if (empty($description)) {
            $description = $request->notes ?? $request->title;
        }

        $actor = Auth::user();
        $assignee = $lead->assigned_to ? User::find($lead->assigned_to) : null;

        if ($assignee && $actor && $actor->id !== $assignee->id) {
             $stageName = '';
             if ($request->has('stage_id') && $request->stage_id) {
                 $stageObj = \App\Models\Stage::find($request->stage_id);
                 if ($stageObj) {
                     $stageName = $stageObj->name;
                 }
             }

             if ($stageName && (stripos($stageName, 'won') !== false || stripos($stageName, 'deal') !== false)) {
                 $specialLog = "Stage changed to {$stageName} by {$actor->name} on behalf of {$assignee->name}";
                 if (empty($description)) {
                     $description = $specialLog;
                 } else {
                     $description .= " ({$specialLog})";
                 }
             } else {
                 $description .= " (Performed by {$actor->name} on behalf of {$assignee->name})";
             }
        }

        $mainColumns = ['lead_id', 'type', 'description', 'stage_id', 'next_action_type'];
        $details = $request->except($mainColumns);
        
        // Ensure action priority matches lead priority
        $details['priority'] = $lead->priority ?? ($details['priority'] ?? 'medium');

        // Meeting Logic & Scoring
        if ($request->type === 'meeting' || $request->next_action_type === 'meeting') {
            $mStatus = $this->normalizeMeetingStatus($request->meeting_status ?? null, $request->doneMeeting ?? null);
            $details = $this->applyMeetingStatus($details, $mStatus);
            
            // Track missed meetings count for warnings
            $missedCount = $lead->missed_meetings_count ?? 0;
            
            if ($mStatus === 'no_show') {
                $missedCount++;
            } elseif ($mStatus === 'done') {
            }
            
            $lead->missed_meetings_count = $missedCount;
            // The score is now calculated as (Done / Arrange) * 100 in reports
            $lead->save();

            // Trigger Warning if missed count >= 3
            if ($missedCount >= 3) {
                $details['warning'] = "This lead has missed $missedCount meetings. Exercise caution.";
            }
        }

        // --- Handle Attachments (Base64) ---
        if (isset($details['proposalAttachment'])) {
            $path = $this->handleBase64Attachment($details['proposalAttachment']);
            if ($path) {
                $details['proposalAttachment'] = $path; // Store path instead of base64
            } else {
                unset($details['proposalAttachment']); // Remove invalid/empty attachment
            }
        }

        if (isset($details['rentAttachment'])) {
            $path = $this->handleBase64Attachment($details['rentAttachment']);
            if ($path) {
                $details['rentAttachment'] = $path;
            } else {
                unset($details['rentAttachment']);
            }
        }
        
        // Also handle generic attachments if any
        if (isset($details['attachments']) && is_array($details['attachments'])) {
             $processedAttachments = [];
             foreach ($details['attachments'] as $att) {
                 $path = $this->handleBase64Attachment($att);
                 if ($path) {
                     $processedAttachments[] = $path;
                 }
             }
             if (!empty($processedAttachments)) {
                 $details['attachments'] = $processedAttachments;
             }
        }
        // -----------------------------------

        $meetingStatus = ($request->type === 'meeting' || $request->next_action_type === 'meeting')
            ? $this->normalizeMeetingStatus($details['meeting_status'] ?? null, $details['doneMeeting'] ?? null)
            : null;

        // --- Level 1 Data Integrity (Meetings) ---
        // Enforce single final state per meetingKey and prevent multiple open meetings per lead.
        if (($request->type === 'meeting' || $request->next_action_type === 'meeting')) {
            $recentMeetings = $this->loadRecentMeetingActions((int) $request->lead_id, 200);
            $meetingKey = $this->meetingKeyFromDetails((int) $request->lead_id, $details);
            $allowCorrection = $this->isMeetingCorrectionRequested($request, $details) && ($user->is_super_admin || $this->isManagerLike($user));

            // Rule: can't create Arrange if there is any open meeting for the lead.
            if ($meetingStatus === 'scheduled') {
                foreach ($recentMeetings as $m) {
                    $d = $m->details;
                    if (!is_array($d)) {
                        $d = json_decode($d, true) ?? [];
                    }
                    if ($this->extractMeetingStatus($d) === 'scheduled') {
                        return response()->json([
                            'message' => 'Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø¹Ù…Ù„ Arrange Meeting Ø¬Ø¯ÙŠØ¯ Ù„Ø£Ù† Ù‡Ù†Ø§Ùƒ Ø§Ø¬ØªÙ…Ø§Ø¹ Ù…ÙØªÙˆØ­ (Scheduled) Ù„Ù… ÙŠØªÙ… Ø¥ØºÙ„Ø§Ù‚Ù‡. Ù‚Ù… Ø¨ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ Ø§Ù„Ø­Ø§Ù„ÙŠ Ø¥Ù„Ù‰ Done/Missed Ø£Ùˆ Ø¹Ø¯Ù‘Ù„ Ù…ÙˆØ¹Ø¯Ù‡.'
                        ], 422);
                    }
                }

                // Rule: same meetingKey can't be re-arranged if it already has a final outcome.
                $finalRank = $this->maxFinalRankForMeetingKey($recentMeetings, $meetingKey);
                if ($finalRank > 0) {
                    if (!$allowCorrection) {
                        return response()->json([
                            'message' => 'Ù‡Ø°Ø§ Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ Ù…ØºÙ„Ù‚ Ø¨Ø§Ù„ÙØ¹Ù„ (Done/Missed) Ù„Ù†ÙØ³ Ù…ÙˆØ¹Ø¯ Ø§Ù„Ù…ÙŠØªÙ†Ø¬. Ù„Ù„ØªØµØ­ÙŠØ­ Ø§Ø³ØªØ®Ø¯Ù… Correction/Reopen.'
                        ], 422);
                    }

                    // Correction: reopen by updating the latest action with this meetingKey.
                    $existing = $this->findLatestActionForMeetingKey($recentMeetings, $meetingKey);
                    if ($existing) {
                        $existingDetails = is_array($existing->details ?? []) ? ($existing->details ?? []) : (json_decode($existing->details, true) ?? []);
                        $oldStatus = $this->extractMeetingStatus($existingDetails);
                        $merged = array_merge($existingDetails, $details);
                        $merged = $this->applyMeetingStatus($merged, 'scheduled');
                        $existing->details = $merged;
                        $existing->save();
                        $this->writeMeetingAudit($existing, $oldStatus, 'scheduled', Auth::id());
                        return response()->json([
                            'message' => 'Lead action updated successfully',
                            'action' => $existing->load('user')
                        ], 200);
                    }
                }
            }

            // Rule: final state is exclusive per meetingKey (Done vs Missed).
            if (in_array($meetingStatus, ['done', 'no_show'], true)) {
                // Rule: Done/Missed is only allowed if there is an open (Scheduled) meeting first.
                $openMeeting = null;
                foreach ($recentMeetings as $m) {
                    $d = $m->details;
                    if (!is_array($d)) {
                        $d = json_decode($d, true) ?? [];
                    }
                    if ($this->extractMeetingStatus($d) === 'scheduled') {
                        $openMeeting = $m;
                        break;
                    }
                }

                if (!$openMeeting) {
                    return response()->json([
                        'message' => 'ممنوع تسجيل Done/Missed بدون وجود Meeting مفتوحة (Scheduled) أولاً.'
                    ], 422);
                }

                // Prefer closing the same meetingKey; fallback to closing the current open meeting (single-open-meeting rule).
                $existing = $this->findLatestActionForMeetingKey($recentMeetings, $meetingKey);
                if (!$existing) {
                    $existing = $openMeeting;
                }

                $existingDetails = is_array($existing->details ?? []) ? ($existing->details ?? []) : (json_decode($existing->details, true) ?? []);
                $targetKey = $this->meetingKeyFromDetails((int) $existing->lead_id, $existingDetails);
                $targetIdentity = $this->meetingIdentityFromDetails((int) $existing->lead_id, $existingDetails);
                $candidateDetails = array_merge($existingDetails, $details);
                $candidateIdentity = $this->meetingIdentityFromDetails((int) $existing->lead_id, $candidateDetails);
                if ($candidateIdentity !== $targetIdentity) {
                    if (!$allowCorrection) {
                        return response()->json([
                            'message' => 'ممنوع تغيير تاريخ/وقت الميتنج أثناء الإغلاق إلا عبر Correction/Reopen.'
                        ], 422);
                    }
                    $targetKey = $this->meetingKeyFromDetails((int) $existing->lead_id, $candidateDetails);
                }

                $finalRank = $this->maxFinalRankForMeetingKey($recentMeetings, $targetKey);

                if ($finalRank === 2 && $meetingStatus === 'no_show' && !$allowCorrection) {
                    return response()->json([
                        'message' => 'Ù…Ù…Ù†ÙˆØ¹ ØªØ³Ø¬ÙŠÙ„ Missed Ù„Ù†ÙØ³ Ù…ÙŠØªÙ†Ø¬ Ø¨Ø¹Ø¯ Ø¥ØºÙ„Ø§Ù‚Ù‡Ø§ Done. Ø§Ø³ØªØ®Ø¯Ù… Correction/Reopen Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù‡Ø±Ù„ÙŠØ§.'
                    ], 422);
                }
                if ($finalRank === 1 && $meetingStatus === 'done' && !$allowCorrection) {
                    return response()->json([
                        'message' => 'Ù…Ù…Ù†ÙˆØ¹ ØªØ³Ø¬ÙŠÙ„ Done Ù„Ù†ÙØ³ Ù…ÙŠØªÙ†Ø¬ Ø¨Ø¹Ø¯ Ø¥ØºÙ„Ø§Ù‚Ù‡Ø§ Missed. Ø§Ø³ØªØ®Ø¯Ù… Correction/Reopen Ø¥Ø°Ø§ ÙƒØ§Ù† Ø§Ù‡Ø±Ù„ÙŠØ§.'
                    ], 422);
                }

                // Close/update the chosen meeting action (avoid duplicates / enforce lifecycle).
                if ($existing) {
                    $oldStatus = $this->extractMeetingStatus($existingDetails);

                    if ($oldStatus !== 'scheduled' && !$allowCorrection) {
                        return response()->json([
                            'message' => 'لا يمكن تسجيل Done/Missed إلا لميتينج مفتوحة (Scheduled).'
                        ], 422);
                    }

                    if (in_array($oldStatus, ['done', 'no_show'], true) && $oldStatus !== $meetingStatus && !$allowCorrection) {
                        return response()->json([
                            'message' => 'Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ¹Ø¯ÙŠÙ„ Ø­Ø§Ù„Ø© Ø§Ù„Ø§Ø¬ØªÙ…Ø§Ø¹ Ø¨Ø¹Ø¯ Ø¥ØºÙ„Ø§Ù‚Ù‡Ø§ (Done/Missed). Ø§Ø³ØªØ®Ø¯Ù… Correction/Reopen.'
                        ], 422);
                    }

                    $merged = array_merge($existingDetails, $details);
                    $merged = $this->applyMeetingStatus($merged, $meetingStatus);
                    $existing->details = $merged;
                    $existing->save();
                    if ($meetingStatus !== $oldStatus) {
                        $this->writeMeetingAudit($existing, $oldStatus, $meetingStatus, Auth::id());
                    }

                    return response()->json([
                        'message' => 'Lead action updated successfully',
                        'action' => $existing->load('user')
                    ], 200);
                }
            }
        }

        if (false && ($request->type === 'meeting' || $request->next_action_type === 'meeting') && $meetingStatus === 'scheduled') {
            $recentMeetings = LeadAction::query()
                ->where('lead_id', $request->lead_id)
                ->where(function ($q) {
                    $q->where('action_type', 'meeting')
                      ->orWhere('next_action_type', 'meeting');
                })
                ->orderByDesc('id')
                ->limit(50)
                ->get();

            foreach ($recentMeetings as $m) {
                $d = $m->details;
                if (!is_array($d)) {
                    $d = json_decode($d, true) ?? [];
                }
                $status = $this->extractMeetingStatus($d);
                if ($status !== 'done' && $status !== 'no_show') {
                    return response()->json([
                        'message' => 'لا يمكن عمل Arrange Meeting جديد لأن هناك اجتماع مفتوح (Scheduled) لم يتم إغلاقه. قم بتحديث الاجتماع الحالي إلى Done/Missed أو عدّل موعده.'
                    ], 422);
                }
            }
        }

        if (false && ($request->type === 'meeting' || $request->next_action_type === 'meeting') && in_array($meetingStatus, ['done', 'no_show'], true)) {
            $date = $details['date'] ?? $request->date ?? null;
            $time = $details['time'] ?? $request->time ?? null;

            $existingQuery = LeadAction::query()
                ->where('lead_id', $request->lead_id)
                ->where('action_type', 'meeting')
                ->orderByDesc('id');

            if ($date) {
                $existingQuery->where('details->date', $date);
            }
            if ($time) {
                $existingQuery->where('details->time', $time);
            }

            $existing = $existingQuery->first();
            if ($existing) {
                $existingDetails = is_array($existing->details ?? []) ? ($existing->details ?? []) : (json_decode($existing->details, true) ?? []);
                $oldStatus = $this->extractMeetingStatus($existingDetails);
                if ($oldStatus !== 'done' && $oldStatus !== 'no_show') {
                    $merged = array_merge($existingDetails, $details);
                    $merged = $this->applyMeetingStatus($merged, $meetingStatus);
                    $existing->details = $merged;
                    $existing->save();
                    $this->writeMeetingAudit($existing, $oldStatus, $meetingStatus, Auth::id());
                    return response()->json([
                        'message' => 'Lead action updated successfully',
                        'action' => $existing->load('user')
                    ], 200);
                }
            }
        }

        $leadAction = LeadAction::create([
            'lead_id' => $request->lead_id,
            'user_id' => Auth::id(), // The Actor (who performed the action)
            'action_type' => $request->type,
            'description' => $description,
            'stage_id_at_creation' => $request->stage_id,
            'next_action_type' => $request->next_action_type,
            'details' => $details,
        ]);

        if ($leadAction->action_type === 'meeting' || $leadAction->next_action_type === 'meeting') {
            $status = $this->extractMeetingStatus(is_array($leadAction->details ?? []) ? ($leadAction->details ?? []) : []);
            $this->writeMeetingAudit($leadAction, null, $status, Auth::id());
        }

        // Revenue Creation Logic: Attribute to Salesperson (Lead Assignee)
        $revenueAmount = $details['closingRevenue'] ?? $details['revenue'] ?? 0;
        $isClosing = ($request->type === 'closing_deals' || $request->next_action_type === 'closing_deals');
        
        if ($isClosing && $revenueAmount > 0) {
            \App\Models\Revenue::create([
                'tenant_id' => $lead->tenant_id ?? Auth::user()->tenant_id,
                'user_id' => $lead->assigned_to ?? Auth::id(), // The Owner (Salesperson)
                'lead_id' => $lead->id,
                'action_id' => $leadAction->id,
                'amount' => floatval($revenueAmount),
                'currency' => $details['currency'] ?? 'EGP',
                'source' => $lead->source ?? 'Unknown',
                'meta_data' => [
                    'created_by_id' => Auth::id(),
                    'created_by_name' => Auth::user()->name ?? 'Unknown',
                    'notes' => 'Generated automatically from Lead Action'
                ]
            ]);
        }

        // Reservation hold settings (hours). null = lifetime (no auto-expiry).
        $reservationHoldHours = null;
        try {
            $crm = \App\Models\CrmSetting::first();
            $crmSettings = is_array($crm?->settings) ? $crm->settings : [];
            $rawHold = $crmSettings['reservationHoldHours'] ?? $crmSettings['reservation_hold_hours'] ?? null;
            if (is_numeric($rawHold) && (float) $rawHold > 0) {
                $reservationHoldHours = (float) $rawHold;
            }
        } catch (\Throwable $e) {
        }
        $reservationExpiresAt = $reservationHoldHours ? now()->addHours($reservationHoldHours) : null;

        // Closed deal: mark reserved unit/property as sold (if we can resolve it)
        if ($isClosing) {
            $targetUnit = null;
            $targetProperty = null;

            $reservationUnitId = $request->reservationUnit;
            if (!empty($reservationUnitId)) {
                $targetUnit = \App\Models\Unit::find($reservationUnitId);
                if (!$targetUnit) {
                    $targetProperty = Property::find($reservationUnitId);
                }
            }

            if (!$targetProperty) {
                $targetProperty = Property::query()
                    ->where('reserved_lead_id', $lead->id)
                    ->whereIn('status', ['Reserved', 'reserved'])
                    ->orderByDesc('id')
                    ->first();
            }
            if (!$targetUnit) {
                $targetUnit = \App\Models\Unit::query()
                    ->where('reserved_lead_id', $lead->id)
                    ->whereIn('status', ['Reserved', 'reserved', 'available'])
                    ->orderByDesc('id')
                    ->first();
            }

            if ($targetProperty) {
                $targetProperty->status = 'Sold';
                $targetProperty->sold_at = now();
                $targetProperty->sold_lead_id = $lead->id;
                $targetProperty->reserved_at = null;
                $targetProperty->reserved_expires_at = null;
                $targetProperty->reserved_lead_id = null;
                $targetProperty->save();
            }
            if ($targetUnit) {
                $targetUnit->status = 'sold';
                $targetUnit->sold_at = now();
                $targetUnit->sold_lead_id = $lead->id;
                $targetUnit->reserved_at = null;
                $targetUnit->reserved_expires_at = null;
                $targetUnit->reserved_lead_id = null;
                $targetUnit->save();
            }
        }

        if ($request->next_action_type === 'reservation' || $request->type === 'reservation') {
            $reservationLead = $lead;
            if ($reservationLead) {
                if ($request->reservationType === 'project') {
                    $project = \App\Models\Project::find($request->reservationProject);

                    $unitName = null;
                    $unit = \App\Models\Unit::find($request->reservationUnit);
                    if ($unit) {
                        $unitName = $unit->name;
                    } else {
                        $property = Property::find($request->reservationUnit);
                        if ($property) {
                            $unitName = $property->unit_code ?? $property->name ?? $property->title ?? (string)$property->id;
                        }
                    }

                    // Mark reserved (Property/Unit) for inventory
                    if ($property) {
                        $curStatus = strtolower(trim((string) ($property->status ?? '')));
                        $isSoldOrRented = in_array($curStatus, ['sold', 'rented', 'rent'], true);
                        if ($isSoldOrRented) {
                            return response()->json(['message' => 'Unit is not available for reservation'], 422);
                        }
                        if ($curStatus === 'reserved' && $property->reserved_expires_at && now()->lt($property->reserved_expires_at)) {
                            return response()->json(['message' => 'Unit is already reserved'], 422);
                        }
                        $property->status = 'Reserved';
                        $property->reserved_at = now();
                        $property->reserved_expires_at = $reservationExpiresAt;
                        $property->reserved_lead_id = $reservationLead->id;
                        $property->sold_at = null;
                        $property->sold_lead_id = null;
                        $property->save();
                    }
                    if ($unit) {
                        $curStatus = strtolower(trim((string) ($unit->status ?? '')));
                        if (in_array($curStatus, ['sold', 'rented'], true)) {
                            return response()->json(['message' => 'Unit is not available for reservation'], 422);
                        }
                        if ($curStatus === 'reserved' && $unit->reserved_expires_at && now()->lt($unit->reserved_expires_at)) {
                            return response()->json(['message' => 'Unit is already reserved'], 422);
                        }
                        $unit->status = 'reserved';
                        $unit->reserved_at = now();
                        $unit->reserved_expires_at = $reservationExpiresAt;
                        $unit->reserved_lead_id = $reservationLead->id;
                        $unit->sold_at = null;
                        $unit->sold_lead_id = null;
                        $unit->save();
                    }

                    \App\Models\RealEstateRequest::create([
                        'tenant_id' => $reservationLead->tenant_id ?? Auth::user()->tenant_id,
                        'customer_name' => $reservationLead->name,
                        'project' => $project ? $project->name : $request->reservationProject,
                        'unit' => $unitName ?? (string)$request->reservationUnit,
                        'amount' => floatval($request->reservationAmount ?: 0),
                        'status' => 'Pending',
                        'type' => 'Booking',
                        'date' => now()->toDateString(),
                        'notes' => $request->reservationNotes,
                        'phone' => $reservationLead->phone,
                        'source' => $reservationLead->source ?? '',
                        'meta_data' => [
                            'created_by_name' => Auth::user()->name ?? '',
                            'created_by_id' => Auth::id()
                        ]
                    ]);
                }
                elseif ($request->reservationType === 'general') {
                    $items = is_array($request->reservationGeneralItems) ? $request->reservationGeneralItems : [];
                    foreach ($items as $itemData) {
                        $itemModel = \App\Models\Item::find($itemData['item'] ?? null);

                        $qty = intval($itemData['quantity'] ?? 1);
                        $price = floatval($itemData['price'] ?? 0);

                        \App\Models\InventoryRequest::create([
                            'tenant_id' => $reservationLead->tenant_id ?? Auth::user()->tenant_id,
                            'customer_name' => $reservationLead->name,
                            'product' => $itemModel ? $itemModel->name : ($itemData['item'] ?? ''),
                            'quantity' => $qty,
                            'description' => $request->reservationNotes,
                            'status' => 'Pending',
                            'type' => 'Booking',
                            'source' => $reservationLead->source ?? '',
                            'meta_data' => [
                                'price' => $price,
                                'total' => $price * $qty,
                                'customer_phone' => $reservationLead->phone,
                                'created_by_name' => Auth::user()->name ?? '',
                                'created_by_id' => Auth::id()
                            ]
                        ]);
                    }
                }
            }
        }

        // --- Auto-resolve delayed actions ---
        // When a new action is added, any *past* pending actions for this lead are considered handled/superseded.
        // This removes the lead from the "Delayed Leads" list.
        $now = now();
        $pastPendingActions = LeadAction::where('lead_id', $request->lead_id)
            ->where('id', '!=', $leadAction->id) // Exclude the new one
            ->where(function($q) {
                $q->where('details->status', 'pending')
                  ->orWhere('details->status', 'in-progress');
            })
            ->get();

        foreach ($pastPendingActions as $ppa) {
            $details = $ppa->details;
            // Ensure details is array (due to casting)
            if (!is_array($details)) {
                // Fallback if casting fails or data is weird
                $details = json_decode($details, true) ?? [];
            }
            
            $date = $details['date'] ?? null;
            $time = $details['time'] ?? '00:00';
            
            if ($date) {
                try {
                    // Combine date and time
                    $scheduled = \Carbon\Carbon::parse("$date $time");
                    if ($scheduled->lt($now)) {
                        $details['status'] = 'superseded';
                        $details['completion_note'] = 'Superseded by new action #' . $leadAction->id;
                        $ppa->details = $details;
                        $ppa->saveQuietly();
                    }
                } catch (\Exception $e) {
                    // Ignore parsing errors
                }
            }
        }
        // ------------------------------------

        $lead = Lead::with(['creator'])->find($request->lead_id);
        if ($lead && $lead->assigned_to) {
            $assignee = User::with(['manager', 'team.leader'])->find($lead->assigned_to);
            $actor = $request->user();

            if ($assignee && $actor) {
                $notification = new LeadActionCreated($leadAction);

                $recipients = $this->buildNotificationRecipients(
                    $assignee,
                [
                    'owner' => $lead->creator,
                    'assignee' => $assignee,
                    'assigner' => $actor,
                ],
                    'leads',
                    'add_action'
                );

                $unique = [];
                foreach ($recipients as $recipient) {
                    if ($recipient instanceof User && $recipient->id !== $actor->id) {
                        $unique[$recipient->id] = $recipient;
                    }
                }

                foreach ($unique as $recipient) {
                    try {
                        $recipient->notify($notification);
                    }
                    catch (\Throwable $e) {
                    }
                }
            }
        }

        return response()->json([
            'message' => 'Lead action created successfully',
            'action' => $leadAction->load('user')
        ], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, LeadAction $leadAction)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        // Basic permission check: User must be able to view the lead
        // We can reuse the logic from LeadController or just check tenant_id
        if ($leadAction->tenant_id !== $user->tenant_id) {
            abort(403, 'Unauthorized');
        }

        $lead = $leadAction->lead ?? Lead::find($leadAction->lead_id);
        // Relaxing the manager restriction here. If they created the action or are an admin, they can edit it.
        // Actually, if it's a comment they added, they should be able to edit it.
        // For now, let's just make sure we don't block them globally if they aren't the owner.
        // The Policy or simple role check below will suffice.

        // Validate request
        $validator = Validator::make($request->all(), [
            'details' => 'nullable|array',
            'details.comments' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Enterprise Referral Supervision: Restrict Updates
        if ($this->isReferralSupervisor($user, $leadAction->lead_id)) {
            // Allow ONLY comment updates
            // Check if request has anything other than details.comments
            $details = $request->input('details', []);
            $otherDetails = \Illuminate\Support\Arr::except($details, ['comments']);
            
            // If there are other fields in details OR top-level fields being updated (though this method mainly updates details)
            // Ideally we should check if top level fields like 'type' are in request, but this controller's update seems focused on details.
            // Safe bet: if any key in details is NOT 'comments', abort.
            if (!empty($otherDetails)) {
                 abort(403, 'Referral supervisors can only add comments.');
            }
        }

        // Update details
        if ($request->has('details')) {
            $currentDetails = $leadAction->details ?? [];
            if (!is_array($currentDetails)) {
                $currentDetails = json_decode($currentDetails, true) ?? [];
            }

            $incomingDetails = $request->input('details', []);
            if (!is_array($incomingDetails)) {
                $incomingDetails = [];
            }

            if ($leadAction->action_type === 'meeting' || ($leadAction->next_action_type === 'meeting')) {
                $hasMeetingUpdate = array_key_exists('meeting_status', $incomingDetails) || array_key_exists('doneMeeting', $incomingDetails);
                if ($hasMeetingUpdate) {
                    unset($incomingDetails['arranged_at']);
                    $oldStatus = $this->extractMeetingStatus($currentDetails);
                    $newStatus = $this->normalizeMeetingStatus($incomingDetails['meeting_status'] ?? null, $incomingDetails['doneMeeting'] ?? null);
                    if ($newStatus !== $oldStatus) {
                        $merged = array_merge($currentDetails, $incomingDetails);

                        $isCorrectionRequested = $this->isMeetingCorrectionRequested($request, $merged);
                        $userCanCorrect = ($user->is_super_admin || $this->isManagerLike($user));
                        $allowCorrection = $isCorrectionRequested && $userCanCorrect;

                        if ($isCorrectionRequested && !$userCanCorrect) {
                            return response()->json([
                                'message' => 'صلاحيات غير كافية لاستخدام Correction/Reopen.'
                            ], 403);
                        }

                        $meetingKey = $this->meetingKeyFromDetails((int)$leadAction->lead_id, $merged);
                        $meetingActions = $this->loadRecentMeetingActions((int)$leadAction->lead_id, 500);
                        $currentIdentity = $this->meetingIdentityFromDetails((int)$leadAction->lead_id, $currentDetails);
                        $newIdentity = $this->meetingIdentityFromDetails((int)$leadAction->lead_id, $merged);
                        if ($newIdentity !== $currentIdentity && !$allowCorrection) {
                            return response()->json([
                                'message' => 'ممنوع تغيير تاريخ/وقت الميتنج بدون Correction/Reopen.'
                            ], 422);
                        }

                        if ($newStatus === 'scheduled') {
                            foreach ($meetingActions as $a) {
                                if ((int)$a->id === (int)$leadAction->id) continue;
                                $d = $a->details;
                                if (!is_array($d)) {
                                    $d = json_decode($d, true) ?? [];
                                }
                                if ($this->extractMeetingStatus($d) === 'scheduled') {
                                    return response()->json([
                                        'message' => 'ممنوع إنشاء Arrange جديد طالما يوجد Meeting مفتوح لنفس الـ Lead.'
                                    ], 422);
                                }
                            }
                        }

                        $otherFinalRank = 0; // 2=done, 1=no_show, 0=open
                        foreach ($meetingActions as $a) {
                            if ((int)$a->id === (int)$leadAction->id) continue;
                            $d = $a->details;
                            if (!is_array($d)) {
                                $d = json_decode($d, true) ?? [];
                            }
                            $key = $this->meetingKeyFromDetails((int)$a->lead_id, $d);
                            if ($key !== $meetingKey) continue;
                            $status = $this->extractMeetingStatus($d);
                            if ($status === 'done') $otherFinalRank = max($otherFinalRank, 2);
                            elseif ($status === 'no_show') $otherFinalRank = max($otherFinalRank, 1);
                        }

                        $oldIsFinal = in_array($oldStatus, ['done', 'no_show'], true);

                        // Rule: Done/Missed is only allowed for a currently open (Scheduled) meeting.
                        if (in_array($newStatus, ['done', 'no_show'], true) && !$allowCorrection && $oldStatus !== 'scheduled') {
                            return response()->json([
                                'message' => 'ممنوع تسجيل Done/Missed إلا لميتينج مفتوحة (Scheduled) أولاً.'
                            ], 422);
                        }

                        // Reopen/reschedule for a meetingKey that was already closed requires explicit Correction/Reopen.
                        if ($newStatus === 'scheduled' && $otherFinalRank > 0 && !$allowCorrection) {
                            return response()->json([
                                'message' => 'لا يمكن إعادة فتح/إعادة جدولة meetingKey مغلق إلا عبر Correction/Reopen.'
                            ], 422);
                        }

                        if (!$allowCorrection) {
                            if ($newStatus === 'no_show' && $otherFinalRank === 2) {
                                return response()->json([
                                    'message' => 'لا يمكن تسجيل Missed لنفس meetingKey بعد إغلاقه Done إلا عبر Correction/Reopen.'
                                ], 422);
                            }
                            if ($newStatus === 'done' && $otherFinalRank === 1) {
                                return response()->json([
                                    'message' => 'لا يمكن تسجيل Done لنفس meetingKey بعد إغلاقه Missed إلا عبر Correction/Reopen.'
                                ], 422);
                            }
                            if ($oldIsFinal && $newStatus !== $oldStatus) {
                                return response()->json([
                                    'message' => 'لا يمكن تعديل حالة الاجتماع بعد إغلاقه (Done/Missed) إلا عبر Correction/Reopen.'
                                ], 422);
                            }
                        }

                        $merged = $this->applyMeetingStatus($merged, $newStatus);
                        $leadAction->details = $merged;
                        $leadAction->save();
                        $this->writeMeetingAudit($leadAction, $oldStatus, $newStatus, $user->id);
                        return response()->json(['message' => 'Updated', 'action' => $leadAction->fresh()->load('user')]);

                        if (false && !$user->is_super_admin && in_array($oldStatus, ['done', 'no_show'], true)) {
                            return response()->json([
                                'message' => 'لا يمكن تعديل حالة الاجتماع بعد إغلاقها (Done/Missed). قم بإنشاء اجتماع جديد.'
                            ], 422);
                        }
                        $merged = array_merge($currentDetails, $incomingDetails);
                        $merged = $this->applyMeetingStatus($merged, $newStatus);
                        $leadAction->details = $merged;
                        $leadAction->save();
                        $this->writeMeetingAudit($leadAction, $oldStatus, $newStatus, $user->id);
                        return response()->json(['message' => 'Updated', 'action' => $leadAction->fresh()->load('user')]);
                    }
                }
            }

            // Check if this is a comment update
            $isCommentUpdate = false;
            $newComment = null;
            
            if (isset($request->details['comments'])) {
                $oldComments = $currentDetails['comments'] ?? [];
                $incomingComments = $request->details['comments'];
                
                // If the count increased, we have a new comment
                if (count($incomingComments) > count($oldComments)) {
                    $isCommentUpdate = true;
                    // Assuming the last one is the new one
                    $newComment = end($incomingComments);
                }
            }

            // Merge or replace? 
            // If we are adding a comment, we probably send the whole details object or just the comments.
            // Let's assume we merge the new details into the existing ones.
            $safeIncoming = $request->details;
            if (is_array($safeIncoming)) {
                unset($safeIncoming['arranged_at']);
            }
            $newDetails = array_merge($currentDetails, $safeIncoming);
            $leadAction->details = $newDetails;
        }

        $leadAction->save();

        // Dispatch Notifications & Broadcast
        if (isset($isCommentUpdate) && $isCommentUpdate && $newComment) {
            try {
                // 1. Broadcast Event for Real-time Updates (Pusher/Reverb)
                // This updates the UI for everyone viewing the lead immediately
                broadcast(new \App\Events\LeadActionCommented($leadAction, $newComment, $user))->toOthers();

                // 2. Identify Notification Recipients
                // Logic: Notify Lead Owner, Action Creator, and anyone who commented before
                // excluding the current user.
                
                $recipients = collect();
                
                // Add Lead Assignee and their Manager
                if ($leadAction->lead && $leadAction->lead->assigned_to) {
                     $assignee = User::find($leadAction->lead->assigned_to);
                     if ($assignee) {
                        $recipients->push($assignee);
                        // Add Assignee's Manager
                        if ($assignee->manager_id) {
                            $manager = User::find($assignee->manager_id);
                            if ($manager) $recipients->push($manager);
                        }
                     }
                }
                
                // Add Action Creator
                if ($leadAction->user_id) {
                    $creator = User::find($leadAction->user_id);
                    if ($creator) $recipients->push($creator);
                }

                // Add previous commenters
                $comments = $leadAction->details['comments'] ?? [];
                foreach ($comments as $c) {
                    if (isset($c['userId'])) {
                        $u = User::find($c['userId']);
                        if ($u) $recipients->push($u);
                    }
                }

                // Filter out current user and duplicates
                $recipients = $recipients->unique('id')->filter(function ($r) use ($user) {
                    return $r->id !== $user->id;
                });

                // Send Notification
                Notification::send($recipients, new LeadActionCommentNotification($leadAction, $user, $newComment['text'] ?? ''));

            } catch (\Exception $e) {
                // Log error but don't fail the request
                \Illuminate\Support\Facades\Log::error('Failed to send comment notification: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Lead action updated successfully',
            'action' => $leadAction->load(['user', 'lead'])
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(LeadAction $leadAction)
    {
        $user = request()->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        if ($leadAction->tenant_id !== $user->tenant_id) {
            abort(403, 'Unauthorized');
        }

        $lead = $leadAction->lead ?? Lead::find($leadAction->lead_id);
        // Only allow if tenant matches (checked above).
        // Managers can delete if they own the lead or are an admin.
        if ($lead && $this->isManagerLike($user) && $lead->assigned_to != $user->id && !$user->is_super_admin) {
             // Managers can only delete their OWN actions/comments? 
             if ($leadAction->user_id != $user->id) {
                 abort(403, 'Managers can only delete their own actions.');
             }
        }

        // Enterprise Referral Supervision: Block Delete
        if ($this->isReferralSupervisor($user, $leadAction->lead_id)) {
            abort(403, 'Referral supervisors cannot delete actions.');
        }
        
        // Prevent deletion of "Missed" meetings (No Show) for analysis
        $details = $leadAction->details;
        if (!is_array($details)) {
            $details = json_decode($details, true) ?? [];
        }
        
        $mStatus = $details['meeting_status'] ?? null;
        if ($mStatus === 'no_show') {
            return response()->json([
                'message' => 'Cannot delete a missed meeting record. This is kept for behavioral analysis.'
            ], 403);
        }

        $leadAction->delete();

        return response()->json(['message' => 'Lead action deleted successfully']);
    }

    /**
     * Display the specified resource.
     */
    public function show(LeadAction $leadAction)
    {
        return response()->json($leadAction->load(['user', 'lead']));
    }
}
