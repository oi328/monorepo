<?php

namespace App\Http\Controllers;

use App\Models\RealEstateRequest;
use App\Models\CrmSetting;
use App\Models\User;
use App\Notifications\RequestCreated;
use App\Traits\InventoryDeleteAuthorization;
use App\Traits\ResolvesNotificationRecipients;
use App\Traits\UserHierarchyTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class RealEstateRequestController extends Controller
{
    use ResolvesNotificationRecipients, UserHierarchyTrait, InventoryDeleteAuthorization;
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = RealEstateRequest::latest();

        $roleLower = strtolower($user->role ?? '');
        $isAdminOrManager = $user->is_super_admin || 
                            in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

        if (!$isAdminOrManager) {
            $viewableUserIds = $this->getViewableUserIds($user);
            if ($viewableUserIds !== null) {
                $query->whereIn('meta_data->created_by_id', $viewableUserIds);
            } else {
                $query->where('meta_data->created_by_id', $user->id);
            }
        }

        return $query->paginate($request->input('per_page', 10));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_name' => 'nullable|string|max:255',
            'project' => 'nullable|string|max:255',
            'unit' => 'nullable|string|max:255',
            'amount' => 'nullable|numeric',
            'status' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'notes' => 'nullable|string',
            'phone' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->all();

        $crm = CrmSetting::first();
        $requiresApproval = is_array($crm?->settings) ? (bool)($crm->settings['requestApprovals'] ?? false) : false;
        if ($requiresApproval) {
            $data['status'] = 'pending_approval';
        }

        $realEstateRequest = RealEstateRequest::create($data);

        if (Auth::check()) {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $assignee = null;
            if (!empty($realEstateRequest->assigned_to)) {
                $assignee = User::with(['manager', 'team.leader'])->find($realEstateRequest->assigned_to);
            }

            $baseUser = $assignee ?: $user;
            $notification = new RequestCreated($realEstateRequest, $user->name);

            $recipients = $this->buildNotificationRecipients(
                $baseUser,
                [
                    'owner' => $user,
                    'assignee' => $assignee,
                    'assigner' => $user,
                ],
                'leads',
                'notify_requests'
            );

            foreach ($recipients as $recipient) {
                try {
                    $recipient->notify($notification);
                } catch (\Throwable $e) {
                }
            }
        }

        return response()->json($realEstateRequest, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(RealEstateRequest $realEstateRequest)
    {
        return $realEstateRequest;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, RealEstateRequest $realEstateRequest)
    {
        $validator = Validator::make($request->all(), [
            'customer_name' => 'nullable|string|max:255',
            'project' => 'nullable|string|max:255',
            'unit' => 'nullable|string|max:255',
            'amount' => 'nullable|numeric',
            'status' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'notes' => 'nullable|string',
            'phone' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $realEstateRequest->update($request->all());

        return response()->json($realEstateRequest);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, RealEstateRequest $realEstateRequest)
    {
        if ($resp = $this->authorizeInventoryDelete($request, 'realestate')) {
            return $resp;
        }
        $realEstateRequest->delete();

        return response()->noContent();
    }
}
