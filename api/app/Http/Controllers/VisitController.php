<?php

namespace App\Http\Controllers;

use App\Models\Visit;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class VisitController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        $query = Visit::query();

        if ($request->has('lead_id')) {
            $query->where('lead_id', $request->lead_id);
        }

        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }

        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('from_date')) {
            $query->whereDate('check_in_at', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $query->whereDate('check_in_at', '<=', $request->to_date);
        }

        $limit = (int) $request->input('limit', 2000);
        if ($limit <= 0) {
            $limit = 2000;
        }

        $visits = $query->orderByDesc('check_in_at')->limit($limit)->get();

        return $visits->map(function (Visit $visit) {
            return [
                'id' => $visit->id,
                'type' => $visit->type,
                'leadId' => $visit->lead_id,
                'taskId' => $visit->task_id,
                'customerId' => $visit->customer_id,
                'customerName' => $visit->customer_name,
                'salesPerson' => $visit->sales_person_name,
                'salesPersonId' => $visit->sales_person_id,
                'checkInDate' => $visit->check_in_at ? $visit->check_in_at->toISOString() : null,
                'checkOutDate' => $visit->check_out_at ? $visit->check_out_at->toISOString() : null,
                'location' => [
                    'lat' => $visit->check_in_lat,
                    'lng' => $visit->check_in_lng,
                    'address' => $visit->check_in_address,
                ],
                'checkOutLocation' => [
                    'lat' => $visit->check_out_lat,
                    'lng' => $visit->check_out_lng,
                    'address' => $visit->check_out_address,
                ],
                'status' => $visit->status,
            ];
        });
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        $validator = Validator::make($request->all(), [
            'type' => 'required|string',
            'lead_id' => 'nullable|exists:leads,id',
            'task_id' => 'nullable|exists:tasks,id',
            'customer_id' => 'nullable|integer',
            'customer_name' => 'nullable|string',
            'sales_person_id' => 'nullable|integer',
            'sales_person_name' => 'nullable|string',
            'check_in_date' => 'required|date',
            'lat' => 'nullable|numeric',
            'lng' => 'nullable|numeric',
            'address' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $lead = null;
        if ($request->lead_id) {
            $lead = Lead::find($request->lead_id);
        }

        $salesPersonId = $request->sales_person_id ?: $user->id;
        $salesPerson = User::find($salesPersonId);

        $visit = new Visit();
        $visit->lead_id = $request->lead_id;
        $visit->task_id = $request->task_id;
        $visit->customer_id = $request->customer_id;
        $visit->type = $request->type;
        $visit->customer_name = $request->customer_name ?: ($lead ? $lead->name : null);
        $visit->sales_person_id = $salesPerson ? $salesPerson->id : $user->id;
        $visit->sales_person_name = $request->sales_person_name ?: ($salesPerson ? $salesPerson->name : $user->name);
        $visit->check_in_at = $request->check_in_date;
        $visit->check_in_lat = $request->lat;
        $visit->check_in_lng = $request->lng;
        $visit->check_in_address = $request->address;
        $visit->status = 'pending';
        $visit->created_by = $user->id;

        $visit->save();

        return response()->json([
            'id' => $visit->id,
            'type' => $visit->type,
            'leadId' => $visit->lead_id,
            'taskId' => $visit->task_id,
            'customerId' => $visit->customer_id,
            'customerName' => $visit->customer_name,
            'salesPerson' => $visit->sales_person_name,
            'checkInDate' => $visit->check_in_at ? $visit->check_in_at->toISOString() : null,
            'checkOutDate' => null,
            'location' => [
                'lat' => $visit->check_in_lat,
                'lng' => $visit->check_in_lng,
                'address' => $visit->check_in_address,
            ],
            'checkOutLocation' => [
                'lat' => null,
                'lng' => null,
                'address' => null,
            ],
            'status' => $visit->status,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        $visit = Visit::findOrFail($id);

        if ($request->has('status') && $request->status) {
            $visit->status = $request->status;
        }

        if ($request->has('check_out_date')) {
            $visit->check_out_at = $request->check_out_date;
        }

        if ($request->has('lat') || $request->has('lng') || $request->has('address')) {
            $visit->check_out_lat = $request->lat;
            $visit->check_out_lng = $request->lng;
            $visit->check_out_address = $request->address;
        }

        $visit->updated_by = $user->id;
        $visit->save();

        return response()->json([
            'id' => $visit->id,
            'type' => $visit->type,
            'leadId' => $visit->lead_id,
            'taskId' => $visit->task_id,
            'customerId' => $visit->customer_id,
            'customerName' => $visit->customer_name,
            'salesPerson' => $visit->sales_person_name,
            'checkInDate' => $visit->check_in_at ? $visit->check_in_at->toISOString() : null,
            'checkOutDate' => $visit->check_out_at ? $visit->check_out_at->toISOString() : null,
            'location' => [
                'lat' => $visit->check_in_lat,
                'lng' => $visit->check_in_lng,
                'address' => $visit->check_in_address,
            ],
            'checkOutLocation' => [
                'lat' => $visit->check_out_lat,
                'lng' => $visit->check_out_lng,
                'address' => $visit->check_out_address,
            ],
            'status' => $visit->status,
        ]);
    }
}

