<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Entity;
use App\Models\FieldValue;
use App\Models\Order;
use App\Models\SalesInvoice;
use App\Models\User;
use App\Notifications\NewCustomer;
use App\Traits\ResolvesNotificationRecipients;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    use ResolvesNotificationRecipients;
    
    private function normalizePhone($value)
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        if ($digits === '') {
            return '';
        }
        if (str_starts_with($digits, '20')) {
            if (strlen($digits) === 13 && substr($digits, 2, 1) === '0') {
                return substr($digits, 2);
            }
            if (strlen($digits) === 12) {
                return '0' . substr($digits, 2);
            }
        }
        return $digits;
    }

    private function currentTenantId()
    {
        if (app()->bound('current_tenant_id')) {
            return app('current_tenant_id');
        }
        if (Auth::check()) {
            return Auth::user()?->tenant_id;
        }
        return null;
    }

    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);
        if ($perPage < 1) {
            $perPage = 10;
        }
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = strtolower($request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = Customer::with(['customFieldValues.field', 'assignee']);

        // Search
        if ($q = trim((string) $request->input('q'))) {
            $query->where(function ($qbuilder) use ($q) {
                $qbuilder->where('name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('customer_code', 'like', "%{$q}%")
                    ->orWhere('company_name', 'like', "%{$q}%");
            });
        }

        // Filters
        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }
        if ($source = $request->input('source')) {
            $query->where('source', $source);
        }
        if ($country = $request->input('country')) {
            $query->where('country', $country);
        }
        if ($city = $request->input('city')) {
            $query->where('city', $city);
        }
        if ($createdBy = $request->input('created_by')) {
            $query->where('created_by', $createdBy);
        }
        if ($assignedSalesRep = $request->input('assigned_sales_rep')) {
            $query->where('assigned_to', $assignedSalesRep);
        }
        // Date range
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // Sorting (whitelist)
        $allowedSort = ['created_at', 'name', 'customer_code', 'company_name', 'country', 'city', 'source'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'created_at';
        }
        $query->orderBy($sortBy, $sortOrder);

        if ($request->boolean('all')) {
            return $query->get();
        }
        return $query->paginate($perPage);
    }

    public function report(Request $request)
    {
        $perPage = (int) $request->input('per_page', 100);
        if ($perPage < 1) {
            $perPage = 100;
        }

        $paginator = Customer::with(['assignee.manager', 'customFieldValues.field'])->orderByDesc('created_at')->paginate($perPage);
        $customerIds = $paginator->pluck('id')->all();

        if (empty($customerIds)) {
            return response()->json($paginator);
        }

        $ordersAgg = Order::select(
            'customer_id',
            DB::raw('COUNT(*) as orders_count'),
            DB::raw('COALESCE(SUM(total), 0) as orders_total'),
            DB::raw('MAX(created_at) as last_order_at')
        )
            ->whereIn('customer_id', $customerIds)
            ->groupBy('customer_id')
            ->get()
            ->keyBy('customer_id');

        $invoicesAgg = SalesInvoice::select(
            'customer_id',
            DB::raw('COALESCE(SUM(total), 0) as invoices_total'),
            DB::raw('MAX(issue_date) as last_invoice_at'),
            DB::raw('MAX(created_at) as last_invoice_created_at'),
            DB::raw('MAX(sales_person) as last_sales_person'),
            DB::raw('SUM(CASE WHEN payment_status = \'Paid\' THEN total ELSE 0 END) as paid_total'),
            DB::raw('SUM(CASE WHEN payment_status = \'Partial\' THEN total ELSE 0 END) as partial_total'),
            DB::raw('SUM(CASE WHEN payment_status = \'Unpaid\' THEN total ELSE 0 END) as unpaid_total')
        )
            ->whereIn('customer_id', $customerIds)
            ->groupBy('customer_id')
            ->get()
            ->keyBy('customer_id');

        $quotationAgg = \App\Models\Quotation::select(
            'customer_id',
            DB::raw('COUNT(*) as quotations_count'),
            DB::raw('SUM(CASE WHEN LOWER(status) IN (\'converted\', \'accepted\') THEN 1 ELSE 0 END) as converted_count'),
            DB::raw('SUM(CASE WHEN LOWER(status) IN (\'pending\', \'sent\', \'draft\') THEN 1 ELSE 0 END) as pending_count'),
            DB::raw('SUM(CASE WHEN LOWER(status) IN (\'lost\', \'cancelled\', \'canceled\') THEN 1 ELSE 0 END) as lost_count')
        )
            ->whereIn('customer_id', $customerIds)
            ->groupBy('customer_id')
            ->get()
            ->keyBy('customer_id');

        $collection = $paginator->getCollection()->map(function (Customer $customer) use ($ordersAgg, $invoicesAgg, $quotationAgg) {
            $orderStats = $ordersAgg->get($customer->id);
            $invoiceStats = $invoicesAgg->get($customer->id);
            $quoteStats = $quotationAgg->get($customer->id);

            $ordersCount = $orderStats ? (int) $orderStats->orders_count : 0;
            $ordersTotal = $orderStats ? (float) $orderStats->orders_total : 0.0;
            $invoicesTotal = $invoiceStats ? (float) $invoiceStats->invoices_total : 0.0;

            $totalRevenue = $invoicesTotal > 0 ? $invoicesTotal : $ordersTotal;

            $lastOrderAt = $orderStats ? $orderStats->last_order_at : null;
            $lastInvoiceAt = $invoiceStats ? ($invoiceStats->last_invoice_at ?: $invoiceStats->last_invoice_created_at) : null;

            $lastActivity = collect([
                $lastOrderAt,
                $lastInvoiceAt,
                $customer->updated_at,
                $customer->created_at,
            ])
                ->filter()
                ->max();

            $salesperson = $customer->assignee ? $customer->assignee->name : ($invoiceStats && $invoiceStats->last_sales_person ? $invoiceStats->last_sales_person : null);
            $manager = $customer->assignee && $customer->assignee->manager ? $customer->assignee->manager->name : null;

            $project = null;
            if ($customer->customFieldValues) {
                $projectField = $customer->customFieldValues->first(function($cfv) {
                     return $cfv->field && (
                         strtolower($cfv->field->name) === 'project' || 
                         strtolower($cfv->field->key) === 'project'
                     );
                });
                if ($projectField) {
                    $project = $projectField->value;
                }
            }

            $clientType = $customer->company_name ? 'Company' : 'Individual';

            $paidTotal = $invoiceStats ? (float) $invoiceStats->paid_total : 0.0;
            $partialTotal = $invoiceStats ? (float) $invoiceStats->partial_total : 0.0;
            $unpaidTotal = $invoiceStats ? (float) $invoiceStats->unpaid_total : 0.0;

            $quotationTotal = $quoteStats ? (int) $quoteStats->quotations_count : 0;
            $quotationConverted = $quoteStats ? (int) $quoteStats->converted_count : 0;
            $quotationPending = $quoteStats ? (int) $quoteStats->pending_count : 0;
            $quotationLost = $quoteStats ? (int) $quoteStats->lost_count : 0;

            return [
                'id' => $customer->id,
                'name' => $customer->name,
                'type' => $customer->type,
                'clientType' => $clientType,
                'manager' => $manager,
                'source' => $customer->source,
                'project' => $project,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'joinedDate' => optional($customer->created_at)->toDateString(),
                'totalRevenue' => $totalRevenue,
                'orders' => $ordersCount,
                'lastActivity' => $lastActivity ? $lastActivity->toDateString() : optional($customer->created_at)->toDateString(),
                'salesperson' => $salesperson,
                'invoicePaidTotal' => $paidTotal,
                'invoicePartialTotal' => $partialTotal,
                'invoiceUnpaidTotal' => $unpaidTotal,
                'quotationTotal' => $quotationTotal,
                'quotationConverted' => $quotationConverted,
                'quotationPending' => $quotationPending,
                'quotationLost' => $quotationLost,
            ];
        });

        $paginator->setCollection($collection);

        return response()->json($paginator);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $tenantId = $this->currentTenantId();
        $request->merge(['phone' => $this->normalizePhone($request->input('phone'))]);

        // 1. Validate Standard Fields
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'customer_code' => 'nullable|string|max:50',
            'phone' => [
                'required',
                'string',
                'max:255',
                Rule::unique('customers', 'phone')->where(function ($q) use ($tenantId) {
                    return $tenantId ? $q->where('tenant_id', $tenantId) : $q->whereNull('tenant_id');
                }),
            ],
            'email' => 'nullable|email|max:255',
            'type' => 'nullable|string|max:50',
            'source' => 'nullable|string|max:100',
            'company_name' => 'nullable|string|max:255',
            'tax_number' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:255',
            'assigned_to' => 'nullable|string|max:255',
            'created_by' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ], [
            'phone.unique' => 'رقم التليفون مسجل بالفعل لعميل آخر',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // 2. Validate Custom Fields
        $entity = Entity::where('key', 'customers')->first();
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

            // 3. Create Customer
            $customer = Customer::create($request->except('custom_fields'));
            $crm = \App\Models\CrmSetting::first();
            $settings = is_array($crm?->settings) ? $crm->settings : [];
            
            if (!$request->filled('customer_code')) {
                $startCode = $settings['startCustomerCode'] ?? 'C-1000';
                
                // Extract prefix and number (e.g., "C-" and "1000")
                if (preg_match('/^([^\d]*)(\d+)$/', $startCode, $matches)) {
                    $prefix = $matches[1];
                    $startNumber = intval($matches[2]);

                    // Find the max number currently used with this prefix
                    // We look for codes starting with prefix and followed by digits
                    // Since SQL regex is limited, we fetch candidates and parse in PHP 
                    // (Not optimal for huge datasets but safe for now)
                    $maxCodeCustomer = Customer::where('customer_code', 'like', $prefix . '%')
                        ->where('id', '!=', $customer->id) // Exclude current if it somehow got a code
                        ->get()
                        ->filter(function($c) use ($prefix) {
                            return preg_match('/^' . preg_quote($prefix, '/') . '\d+$/', $c->customer_code);
                        })
                        ->sortByDesc(function($c) use ($prefix) {
                            return intval(substr($c->customer_code, strlen($prefix)));
                        })
                        ->first();

                    $nextNumber = $startNumber;
                    if ($maxCodeCustomer) {
                        $currentMax = intval(substr($maxCodeCustomer->customer_code, strlen($prefix)));
                        if ($currentMax >= $startNumber) {
                            $nextNumber = $currentMax + 1;
                        }
                    }

                    $customer->customer_code = $prefix . $nextNumber;
                } else {
                    // Fallback if pattern doesn't match
                    $customer->customer_code = $startCode . '-' . $customer->id;
                }
                $customer->save();
            }

            // 4. Save Custom Fields
            if ($request->has('custom_fields') && $entity) {
                $fieldsMap = $entity->fields->pluck('id', 'key');
                
                foreach ($request->input('custom_fields') as $key => $value) {
                    if (isset($fieldsMap[$key])) {
                        FieldValue::create([
                            'field_id' => $fieldsMap[$key],
                            'record_id' => $customer->id,
                            'value' => $value,
                        ]);
                    }
                }
            }

            DB::commit();

            try {
                if (Auth::check()) {
                    /** @var \App\Models\User $user */
                    $user = Auth::user();
                    $assignee = null;
                    if (!empty($customer->assigned_to) && is_numeric($customer->assigned_to)) {
                        $assignee = User::with(['manager', 'team.leader'])->find($customer->assigned_to);
                    }

                    $baseUser = $assignee ?: $user;
                    $notification = new NewCustomer($customer, $user->name);

                    $recipients = $this->buildNotificationRecipients(
                        $baseUser,
                        [
                            'owner' => $user,
                            'assignee' => $assignee,
                            'assigner' => $user,
                        ],
                        'customers',
                        'notify_add_customer'
                    );

                    foreach ($recipients as $recipient) {
                        try {
                            $recipient->notify($notification);
                        } catch (\Throwable $e) {
                            Log::error("Failed to send customer notification to recipient {$recipient->id}: " . $e->getMessage());
                        }
                    }
                }
            } catch (\Exception $ne) {
                Log::error("Failed to build or send customer notifications: " . $ne->getMessage());
            }

            return response()->json($customer->load(['customFieldValues.field', 'assignee']), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create customer', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        return Customer::with('customFieldValues.field')->findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);
        $tenantId = $this->currentTenantId();

        if ($request->has('phone')) {
            $request->merge(['phone' => $this->normalizePhone($request->input('phone'))]);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'customer_code' => 'nullable|string|max:50',
            'phone' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('customers', 'phone')->ignore($customer->id)->where(function ($q) use ($tenantId) {
                    return $tenantId ? $q->where('tenant_id', $tenantId) : $q->whereNull('tenant_id');
                }),
            ],
            'email' => 'nullable|email|max:255',
            'type' => 'nullable|string|max:50',
            'source' => 'nullable|string|max:100',
            'company_name' => 'nullable|string|max:255',
            'tax_number' => 'nullable|string|max:50',
            'country' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'address' => 'nullable|string|max:255',
            'assigned_to' => 'nullable|string|max:255',
            'created_by' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ], [
            'phone.unique' => 'رقم التليفون مسجل بالفعل لعميل آخر',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            $customer->update($request->except('custom_fields'));

            // Update Custom Fields
            $entity = Entity::where('key', 'customers')->first();
            if ($request->has('custom_fields') && $entity) {
                $fieldsMap = $entity->fields->pluck('id', 'key');
                
                foreach ($request->input('custom_fields') as $key => $value) {
                    if (isset($fieldsMap[$key])) {
                        FieldValue::updateOrCreate(
                            [
                                'field_id' => $fieldsMap[$key],
                                'record_id' => $customer->id,
                            ],
                            ['value' => $value]
                        );
                    }
                }
            }

            DB::commit();
            return response()->json($customer->load(['customFieldValues.field', 'assignee']));

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update customer', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();
        return response()->json(['message' => 'Customer deleted successfully']);
    }
}
