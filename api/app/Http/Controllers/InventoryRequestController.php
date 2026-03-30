<?php

namespace App\Http\Controllers;

use App\Models\InventoryRequest;
use App\Models\CrmSetting;
use App\Models\User;
use App\Notifications\RequestCreated;
use App\Traits\InventoryDeleteAuthorization;
use App\Traits\ResolvesNotificationRecipients;
use App\Traits\UserHierarchyTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class InventoryRequestController extends Controller
{
    use ResolvesNotificationRecipients, UserHierarchyTrait, InventoryDeleteAuthorization;
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = InventoryRequest::latest();

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
            'property_unit' => 'nullable|string|max:255',
            'product' => 'nullable|string|max:255',
            'quantity' => 'nullable|integer',
            'status' => 'nullable|string|max:255',
            'priority' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|string|max:255',
            'payment_plan' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        $crm = CrmSetting::first();
        $requiresApproval = is_array($crm?->settings) ? (bool)($crm->settings['requestApprovals'] ?? false) : false;
        if ($requiresApproval) {
            $data['status'] = 'pending_approval';
        }

        $inventoryRequest = InventoryRequest::create($data);

        if (Auth::check()) {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $assignee = null;
            if (!empty($inventoryRequest->assigned_to)) {
                $assignee = User::with(['manager', 'team.leader'])->find($inventoryRequest->assigned_to);
            }

            $baseUser = $assignee ?: $user;
            $notification = new RequestCreated($inventoryRequest, $user->name);

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

        return response()->json($inventoryRequest, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(InventoryRequest $inventoryRequest)
    {
        return $inventoryRequest;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, InventoryRequest $inventoryRequest)
    {
        $validator = Validator::make($request->all(), [
            'customer_name' => 'nullable|string|max:255',
            'property_unit' => 'nullable|string|max:255',
            'product' => 'nullable|string|max:255',
            'quantity' => 'nullable|integer',
            'status' => 'nullable|string|max:255',
            'priority' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|string|max:255',
            'payment_plan' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $inventoryRequest->update($request->all());

        return response()->json($inventoryRequest);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, InventoryRequest $inventoryRequest)
    {
        if ($resp = $this->authorizeInventoryDelete($request, 'general')) {
            return $resp;
        }
        $inventoryRequest->delete();

        return response()->noContent();
    }
}
