<?php

namespace App\Http\Controllers;

use App\Models\Broker;
use App\Models\Entity;
use App\Models\FieldValue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BrokerController extends Controller
{
    public function index()
    {
        return Broker::with('customFieldValues.field')->latest()->paginate(10);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'agencyName' => 'nullable|string',
            'address' => 'nullable|string',
            'email' => 'nullable|email',
            'commissionRate' => 'nullable|numeric',
            'status' => 'nullable|string',
            'brokerType' => 'nullable|string',
            'contracted' => 'boolean',
            'taxId' => 'nullable|string',
            'nationalId' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Custom Fields Validation
        $entity = Entity::where('key', 'brokers')->first();
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

            $data = $request->only(['name']);
            
            // Map camelCase to snake_case
            if ($request->has('agencyName')) $data['agency_name'] = $request->input('agencyName');
            if ($request->has('address')) $data['address'] = $request->input('address');
            if ($request->has('email')) $data['email'] = $request->input('email');
            if ($request->has('commissionRate')) $data['commission_rate'] = $request->input('commissionRate');
            if ($request->has('status')) $data['status'] = $request->input('status');
            if ($request->has('brokerType')) $data['broker_type'] = $request->input('brokerType');
            if ($request->has('contracted')) $data['contracted'] = $request->input('contracted');
            if ($request->has('taxId')) $data['tax_id'] = $request->input('taxId');
            if ($request->has('nationalId')) $data['national_id'] = $request->input('nationalId');

            if ($request->has('phones') && is_array($request->input('phones'))) {
                $data['phone'] = implode(',', $request->input('phones'));
            } elseif ($request->has('phone')) {
                $data['phone'] = $request->input('phone');
            }

            $broker = Broker::create($data);

            if ($request->has('custom_fields') && $entity) {
                $fieldsMap = $entity->fields->pluck('id', 'key');
                foreach ($request->input('custom_fields') as $key => $value) {
                    if (isset($fieldsMap[$key])) {
                        FieldValue::create([
                            'field_id' => $fieldsMap[$key],
                            'record_id' => $broker->id,
                            'value' => $value,
                        ]);
                    }
                }
            }

            DB::commit();
            return response()->json($broker->load('customFieldValues.field'), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create broker', 'error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        return Broker::with('customFieldValues.field')->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $broker = Broker::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'agencyName' => 'nullable|string',
            'address' => 'nullable|string',
            'email' => 'nullable|email',
            'commissionRate' => 'nullable|numeric',
            'status' => 'nullable|string',
            'brokerType' => 'nullable|string',
            'contracted' => 'boolean',
            'taxId' => 'nullable|string',
            'nationalId' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        $data = $request->only(['name']);
        
        // Map camelCase to snake_case
        if ($request->has('agencyName')) $data['agency_name'] = $request->input('agencyName');
        if ($request->has('address')) $data['address'] = $request->input('address');
        if ($request->has('email')) $data['email'] = $request->input('email');
        if ($request->has('commissionRate')) $data['commission_rate'] = $request->input('commissionRate');
        if ($request->has('status')) $data['status'] = $request->input('status');
        if ($request->has('brokerType')) $data['broker_type'] = $request->input('brokerType');
        if ($request->has('contracted')) $data['contracted'] = $request->input('contracted');
        if ($request->has('taxId')) $data['tax_id'] = $request->input('taxId');
        if ($request->has('nationalId')) $data['national_id'] = $request->input('nationalId');

        if ($request->has('phones') && is_array($request->input('phones'))) {
            $data['phone'] = implode(',', $request->input('phones'));
        } elseif ($request->has('phone')) {
            $data['phone'] = $request->input('phone');
        }
        
        $broker->update($data);
        
        $entity = Entity::where('key', 'brokers')->first();
        if ($request->has('custom_fields') && $entity) {
            $fieldsMap = $entity->fields->pluck('id', 'key');
            foreach ($request->input('custom_fields') as $key => $value) {
                if (isset($fieldsMap[$key])) {
                    FieldValue::updateOrCreate(
                        ['field_id' => $fieldsMap[$key], 'record_id' => $broker->id],
                        ['value' => $value]
                    );
                }
            }
        }
        
        return response()->json($broker->load('customFieldValues.field'));
    }

    public function destroy($id)
    {
        Broker::findOrFail($id)->delete();
        return response()->json(['message' => 'Broker deleted']);
    }
}
