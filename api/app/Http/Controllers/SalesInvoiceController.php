<?php

namespace App\Http\Controllers;

use App\Models\SalesInvoice;
use App\Models\SalesInvoicePayment;
use App\Models\Order;
use App\Models\User;
use App\Notifications\InvoiceCreated;
use App\Traits\ResolvesNotificationRecipients;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SalesInvoiceController extends Controller
{
    use ResolvesNotificationRecipients;

    private function recalculateInvoiceFinancials(SalesInvoice $invoice): SalesInvoice
    {
        $paid = (float) $invoice->payments()
            ->where('status', 'confirmed')
            ->sum('amount');

        $invoice->paid_amount = $paid;

        $advanceApplied = (float) ($invoice->advance_applied_amount ?? 0);
        $total = (float) ($invoice->total ?? 0);
        $invoice->balance_due = max(0, $total - $paid - $advanceApplied);

        if (strtolower((string) $invoice->status) !== 'cancelled') {
            if ($invoice->balance_due <= 0) {
                $invoice->status = 'Paid';
                $invoice->payment_status = 'Paid';
            } elseif ($paid > 0 || $advanceApplied > 0) {
                $invoice->status = 'Partially Paid';
                $invoice->payment_status = 'Partial';
            } else {
                $invoice->status = 'Unpaid';
                $invoice->payment_status = 'Unpaid';
            }
        }

        $invoice->save();
        return $invoice;
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = SalesInvoice::query()->with([
            'order:id,uuid',
        ]);

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
            'advance_applied_amount' => 'nullable|numeric|min:0',
            'status' => 'nullable|string',
            'payment_method' => 'nullable|string',
            'payment_terms' => 'nullable|string',
            'currency' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $invoiceTypeLower = strtolower((string) ($validated['invoice_type'] ?? 'full'));
        $orderId = $validated['order_id'] ?? null;

        if ($orderId) {
            $order = Order::find($orderId);
            if (!$order) {
                return response()->json(['message' => 'Invalid order_id.'], 422);
            }

            // Prevent over-invoicing (full+partial cannot exceed order.total)
            if ($invoiceTypeLower !== 'advance') {
                $existingInvoiced = (float) SalesInvoice::where('order_id', $orderId)
                    ->where('status', '!=', 'Cancelled')
                    ->whereRaw("LOWER(COALESCE(invoice_type,'')) != 'advance'")
                    ->sum('total');

                $newTotal = (float) ($validated['total'] ?? 0);
                $orderTotal = (float) ($order->total ?? 0);
                if (($existingInvoiced + $newTotal) > ($orderTotal + 0.0001)) {
                    return response()->json([
                        'message' => 'Invoice total exceeds Sales Order total.',
                    ], 422);
                }

                // Prevent over-application of advance for the same order (simple per-order advance policy)
                $availableAdvance = (float) SalesInvoice::where('order_id', $orderId)
                    ->whereRaw("LOWER(COALESCE(invoice_type,'')) = 'advance'")
                    ->sum('paid_amount');

                $usedAdvance = (float) SalesInvoice::where('order_id', $orderId)
                    ->where('status', '!=', 'Cancelled')
                    ->whereRaw("LOWER(COALESCE(invoice_type,'')) != 'advance'")
                    ->sum('advance_applied_amount');

                $requestedAdvance = (float) ($validated['advance_applied_amount'] ?? 0);
                if (($usedAdvance + $requestedAdvance) > ($availableAdvance + 0.0001)) {
                    return response()->json([
                        'message' => 'Advance applied amount exceeds available advance for this order.',
                    ], 422);
                }
            } else {
                // Advance invoice itself should not have advance_applied_amount.
                $validated['advance_applied_amount'] = 0;
            }
        }

        $validated['created_by'] = Auth::user()->name ?? 'System';
        $invoice = SalesInvoice::create(array_merge($validated, [
            'paid_amount' => 0,
            'payment_status' => 'Unpaid',
            'balance_due' => max(0, (float) ($validated['total'] ?? 0) - (float) ($validated['advance_applied_amount'] ?? 0)),
        ]));
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
        return $salesInvoice->load([
            'order:id,uuid',
        ]);
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
            'advance_applied_amount' => 'nullable|numeric|min:0',
            'status' => 'nullable|string',
            'payment_method' => 'nullable|string',
            'payment_terms' => 'nullable|string',
            'currency' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $invoiceTypeLower = strtolower((string) ($validated['invoice_type'] ?? $salesInvoice->invoice_type ?? 'full'));
        $orderId = $validated['order_id'] ?? $salesInvoice->order_id ?? null;

        if ($orderId) {
            $order = Order::find($orderId);
            if (!$order) {
                return response()->json(['message' => 'Invalid order_id.'], 422);
            }

            if ($invoiceTypeLower !== 'advance') {
                $existingInvoiced = (float) SalesInvoice::where('order_id', $orderId)
                    ->where('id', '!=', $salesInvoice->id)
                    ->where('status', '!=', 'Cancelled')
                    ->whereRaw("LOWER(COALESCE(invoice_type,'')) != 'advance'")
                    ->sum('total');

                $newTotal = (float) ($validated['total'] ?? $salesInvoice->total ?? 0);
                $orderTotal = (float) ($order->total ?? 0);
                if (($existingInvoiced + $newTotal) > ($orderTotal + 0.0001)) {
                    return response()->json([
                        'message' => 'Invoice total exceeds Sales Order total.',
                    ], 422);
                }

                $availableAdvance = (float) SalesInvoice::where('order_id', $orderId)
                    ->whereRaw("LOWER(COALESCE(invoice_type,'')) = 'advance'")
                    ->sum('paid_amount');

                $usedAdvance = (float) SalesInvoice::where('order_id', $orderId)
                    ->where('id', '!=', $salesInvoice->id)
                    ->where('status', '!=', 'Cancelled')
                    ->whereRaw("LOWER(COALESCE(invoice_type,'')) != 'advance'")
                    ->sum('advance_applied_amount');

                $requestedAdvance = (float) ($validated['advance_applied_amount'] ?? $salesInvoice->advance_applied_amount ?? 0);
                if (($usedAdvance + $requestedAdvance) > ($availableAdvance + 0.0001)) {
                    return response()->json([
                        'message' => 'Advance applied amount exceeds available advance for this order.',
                    ], 422);
                }
            } else {
                $validated['advance_applied_amount'] = 0;
            }
        }

        $salesInvoice->update($validated);
        $this->recalculateInvoiceFinancials($salesInvoice);

        return response()->json($salesInvoice);
    }

    public function payments(SalesInvoice $salesInvoice)
    {
        $payments = $salesInvoice->payments()->latest('payment_date')->get();
        return response()->json([
            'data' => $payments,
        ]);
    }

    public function storePayment(Request $request, SalesInvoice $salesInvoice)
    {
        $validated = $request->validate([
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string',
            'reference' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $salesInvoice) {
            $currentDue = max(0, (float) ($salesInvoice->total ?? 0) - (float) ($salesInvoice->advance_applied_amount ?? 0) - (float) ($salesInvoice->paid_amount ?? 0));
            if ((float) $validated['amount'] > $currentDue + 0.0001) {
                return response()->json([
                    'message' => 'Payment amount cannot exceed balance due.',
                ], 422);
            }

            $payment = SalesInvoicePayment::create([
                'sales_invoice_id' => $salesInvoice->id,
                'payment_date' => $validated['payment_date'],
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'] ?? null,
                'reference' => $validated['reference'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => 'confirmed',
                'created_by' => Auth::user()->name ?? 'System',
            ]);

            $invoice = $this->recalculateInvoiceFinancials($salesInvoice->fresh());

            return response()->json([
                'payment' => $payment,
                'invoice' => $invoice,
            ], 201);
        });
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
