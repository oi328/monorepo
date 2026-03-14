<?php

namespace App\Http\Controllers;

use App\Models\ThirdParty;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ThirdPartyController extends Controller
{
    public function index()
    {
        return ThirdParty::latest()->get();
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'nullable|string',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:255',
            'supply_type' => 'nullable|string|in:product,service,both',
            'catalog_name' => 'nullable|string|max:255',
            'service_description' => 'nullable|string',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $thirdParty = ThirdParty::create($request->all());

        return response()->json($thirdParty, 201);
    }

    public function update(Request $request, $id)
    {
        $thirdParty = ThirdParty::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'nullable|string',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:255',
            'supply_type' => 'nullable|string|in:product,service,both',
            'catalog_name' => 'nullable|string|max:255',
            'service_description' => 'nullable|string',
            'address' => 'nullable|string',
            'tax_number' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $thirdParty->update($request->all());

        return response()->json($thirdParty);
    }

    public function destroy($id)
    {
        ThirdParty::findOrFail($id)->delete();
        return response()->noContent();
    }
}
