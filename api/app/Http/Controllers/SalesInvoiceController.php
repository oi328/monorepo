<?php

namespace App\Http\Controllers;

use App\Models\SalesInvoice;
use App\Models\User;
use App\Notifications\InvoiceCreated;
use App\Traits\ResolvesNotificationRecipients;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SalesInvoiceController extends Controller
{
    use ResolvesNotificationRecipients;
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = SalesInvoice::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

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
            'order_id' => 'nullable|exists:orders,id',
            'invoice_type' => 'nullable|string',
            'issue_date' => 'required|date',
            'due_date' => 'nullable|date',
            'items' => 'required|array',
            'total' => 'required|numeric',
            'subtotal' => 'nullable|numeric',
            'tax' => 'nullable|numeric',
            'discount' => 'nullable|numeric',
            'status' => 'nullable|string',
            'payment_status' => 'nullable|string',
            'paid_amount' => 'nullable|numeric',
            'currency' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::user()->name ?? 'System';
        $invoice = SalesInvoice::create($validated);
        $crm = \App\Models\CrmSetting::first();
        $settings = is_array($crm?->settings) ? $crm->settings : [];
        $start = (int)($settings['startInvoiceCode'] ?? 1000);
        if (empty($invoice->invoice_number)) {
            $next = max($start, (int)$invoice->id);
            $invoice->invoice_number = 'INV-' . $next;
            $invoice->save();
        }

        if (Auth::check()) {
            /** @var \App\Models\User $user */
            $user = Auth::user();

            $assignee = null;
            if (!empty($invoice->sales_person)) {
                $assignee = User::where('name', $invoice->sales_person)->first();
            }

            $baseUser = $assignee ?: $user;
            $notification = new InvoiceCreated($invoice, $user->name);

            $recipients = $this->buildNotificationRecipients(
                $baseUser,
                [
                    'owner' => $user,
                    'assignee' => $assignee,
                    'assigner' => $user,
                ],
                'customers',
                'notify_create_invoice'
            );

            foreach ($recipients as $recipient) {
                try {
                    $recipient->notify($notification);
                } catch (\Throwable $e) {
                }
            }
        }

        return response()->json($invoice, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(SalesInvoice $salesInvoice)
    {
        return $salesInvoice;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, SalesInvoice $salesInvoice)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'sometimes|string',
            'customer_code' => 'nullable|string',
            'sales_person' => 'nullable|string',
            'order_id' => 'nullable|exists:orders,id',
            'invoice_type' => 'nullable|string',
            'issue_date' => 'sometimes|date',
            'due_date' => 'nullable|date',
            'items' => 'sometimes|array',
            'total' => 'sometimes|numeric',
            'subtotal' => 'nullable|numeric',
            'tax' => 'nullable|numeric',
            'discount' => 'nullable|numeric',
            'status' => 'nullable|string',
            'payment_status' => 'nullable|string',
            'paid_amount' => 'nullable|numeric',
            'currency' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $salesInvoice->update($validated);

        return response()->json($salesInvoice);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(SalesInvoice $salesInvoice)
    {
        $salesInvoice->delete();
        return response()->noContent();
    }
}
