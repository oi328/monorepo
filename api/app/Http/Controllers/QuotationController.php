<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Traits\UserHierarchyTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class QuotationController extends Controller
{
    use UserHierarchyTrait;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Quotation::query()->with('customer');

        $roleLower = strtolower($user->role ?? '');
        $isAdminOrManager = $user->is_super_admin || 
                            in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin', 'director', 'operation manager']);

        if (!$isAdminOrManager) {
            $viewableUserIds = $this->getViewableUserIds($user);
            if ($viewableUserIds !== null) {
                // Get the names of the users in the hierarchy to filter by sales_person string
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
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_id', 'like', "%{$search}%");
            });
        }

        if ($request->has('dateFrom')) {
            $query->whereDate('created_at', '>=', $request->dateFrom);
        }
        if ($request->has('dateTo')) {
            $query->whereDate('created_at', '<=', $request->dateTo);
        }
        if ($request->has('customer')) {
            $query->where('customer_name', $request->customer);
        }
        if ($request->has('createdBy')) {
            $query->where('created_by', $request->createdBy);
        }
        if ($request->has('salesPerson')) {
            $query->where('sales_person', $request->salesPerson);
        }
        if ($request->has('minTotal')) {
            $query->where('total', '>=', $request->minTotal);
        }
        if ($request->has('maxTotal')) {
            $query->where('total', '<=', $request->maxTotal);
        }
        // For items count, we need to check the JSON array length or fetch related items if relational.
        // Assuming items is a JSON column.
        if ($request->has('minItems')) {
            $query->whereRaw('JSON_LENGTH(items) >= ?', [$request->minItems]);
        }
        if ($request->has('maxItems')) {
            $query->whereRaw('JSON_LENGTH(items) <= ?', [$request->maxItems]);
        }

        if ($request->has('all')) {
            return response()->json($query->latest()->get());
        }
        
        return response()->json($query->latest()->paginate(15));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Allow items to be string (JSON) for FormData support
        if ($request->has('items') && is_string($request->input('items'))) {
            $request->merge(['items' => json_decode($request->input('items'), true)]);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|string',
            'customer_name' => 'nullable|string',
            'status' => 'nullable|string',
            'date' => 'nullable|date',
            'valid_until' => 'nullable|date',
            'subtotal' => 'nullable|numeric',
            'total' => 'nullable|numeric',
            'items' => 'nullable|array',
            'notes' => 'nullable|string',
            'sales_person' => 'nullable|string',
            'attachment' => 'nullable|file|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->except('attachment');

        // Handle File Upload
        $meta = [];
        if ($request->hasFile('attachment')) {
            $path = $request->file('attachment')->store('quotations', 'public');
            $meta['attachment'] = $path;
            $meta['attachment_name'] = $request->file('attachment')->getClientOriginalName();
            $meta['attachment_type'] = $request->file('attachment')->getClientMimeType();
            $meta['attachment_size'] = $request->file('attachment')->getSize();
        }

        // Generate Code
        $crm = \App\Models\CrmSetting::first();
        $settings = is_array($crm?->settings) ? $crm->settings : [];
        $start = (int)($settings['startQuotationCode'] ?? 1000);
        
        // Use transaction to ensure code uniqueness if possible, or just generate
        // For now, simple logic as before
        // Create first to get ID
        
        $quotation = new Quotation($data);
        $quotation->meta_data = $meta;
        $quotation->save();
        
        // Code Generation
        // Logic: Start Code + (ID - 1) to ensure unique incremental codes starting from the setting value
        $startCode = (int)($settings['startQuotationCode'] ?? 1000);
        // If we want the first ID (1) to be Start Code (1000):
        // Code = 1000 + 1 - 1 = 1000.
        // If ID is 100, Code = 1000 + 100 - 1 = 1099.
        $next = $startCode + (int)$quotation->id - 1;
        
        $meta = $quotation->meta_data ?? []; // Refresh meta
        if (empty($meta['quotation_code'])) {
            $meta['quotation_code'] = 'Q-' . $next;
            $quotation->meta_data = $meta;
            $quotation->save();
        }
        
        return response()->json($quotation, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Quotation $quotation)
    {
        return response()->json($quotation);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Quotation $quotation)
    {
        $quotation->update($request->all());
        return response()->json($quotation);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Quotation $quotation)
    {
        $quotation->delete();
        return response()->json(null, 204);
    }
}
