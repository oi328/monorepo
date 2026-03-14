<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\CrmSetting;
use App\Traits\UserHierarchyTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    use UserHierarchyTrait;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        // Explicitly bypass global scope for debugging, and manually filter
        $query = Order::withoutGlobalScope('tenant');
        
        // Manual Tenant Scope
        if (Auth::check() && !$user->is_super_admin) {
            $query->where('tenant_id', $user->tenant_id);
        } elseif (app()->bound('current_tenant_id')) {
            $query->where('tenant_id', app('current_tenant_id'));
        }

        $roleLower = strtolower($user->role ?? '');
        $isAdminOrManager = $user->is_super_admin || 
                            in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

        if (!$isAdminOrManager) {
            $viewableUserIds = $this->getViewableUserIds($user);
            if ($viewableUserIds !== null) {
                // Orders store creator name in created_by, or sales_person name.
                // We'll use names since ID columns are missing.
                $userNames = \App\Models\User::whereIn('id', $viewableUserIds)->pluck('name')->toArray();
                $query->whereIn('sales_person', $userNames);
            } else {
                $query->where('sales_person', $user->name);
            }
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhere('uuid', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_code', 'like', "%{$search}%")
                  ->orWhere('quotation_id', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Debug Log
        \Illuminate\Support\Facades\Log::info('Fetching orders for user: ' . Auth::id() . ', Tenant: ' . Auth::user()->tenant_id);
        
        return $query->latest()->paginate(15);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'required|string',
            'customer_code' => 'nullable|string',
            'sales_person' => 'nullable|string',
            'items' => 'required|array',
            'total' => 'required|numeric',
            'amount' => 'nullable|numeric', // Accept amount (subtotal)
            'status' => 'nullable|string',
            'payment_terms' => 'nullable|string',
            'delivery_date' => 'nullable|date',
            'quotation_id' => 'nullable|string',
            'tax' => 'nullable|numeric',
            'discount_rate' => 'nullable|numeric',
            'notes' => 'nullable|string',
        ]);

        if (!isset($validated['amount'])) {
            $validated['amount'] = $validated['total']; // Default amount to total if missing
        }

        $validated['created_by'] = Auth::user()->name ?? 'System';
        
        // Auto-generate UUID or ID if needed, but ID is auto-increment.
        // Frontend generates "SO-..." IDs sometimes, but backend ID is integer.
        // We can ignore frontend ID for creation and let backend assign it.
        // Or if 'uuid' field is used for SO number.
        
        $order = Order::create($validated);
        $crm = CrmSetting::first();
        $settings = is_array($crm?->settings) ? $crm->settings : [];
        $start = (int)($settings['startOrderCode'] ?? 1000);
        if (empty($order->uuid)) {
            // Use Start Code + (ID - 1) to ensure uniqueness
            $next = $start + (int)$order->id - 1;
            $order->uuid = 'SO-' . $next;
            $order->save();
        }

        return response()->json($order, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Order $order) // Route binding automatically handles tenant scope
    {
        return $order;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Order $order) // Route binding automatically handles tenant scope
    {
        // Note: Route Model Binding with BelongsToTenant trait handles authorization implicitly (404 if not found/wrong tenant)
        
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'sometimes|string',
            'items' => 'sometimes|array',
            'total' => 'sometimes|numeric',
            'status' => 'sometimes|string',
            'payment_terms' => 'nullable|string',
            'delivery_date' => 'nullable|date',
            'confirmed_at' => 'nullable|date',
            'shipped_at' => 'nullable|date',
            'cancel_reason' => 'nullable|string',
            'hold_reason' => 'nullable|string',
        ]);

        // Enforce CRM setting: allowCustomerPaymentPlan
        $crm = CrmSetting::first();
        $settings = is_array($crm?->settings) ? $crm->settings : [];
        $allowCustomerPaymentPlan = (bool)($settings['allowCustomerPaymentPlan'] ?? true);
        if (!$allowCustomerPaymentPlan) {
            unset($validated['payment_terms']);
        }

        $order->update($validated);

        return response()->json($order);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Order $order)
    {
        $order->delete();
        return response()->noContent();
    }
}
