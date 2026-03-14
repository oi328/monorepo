<?php

namespace App\Http\Controllers;

use App\Models\ItemFamily;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ItemFamilyController extends Controller
{
    public function index()
    {
        return ItemFamily::latest()->get();
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $family = ItemFamily::create($request->all());

        return response()->json($family, 201);
    }

    public function update(Request $request, $id)
    {
        $family = ItemFamily::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $family->update($request->all());

        return response()->json($family);
    }

    public function destroy($id)
    {
        ItemFamily::findOrFail($id)->delete();
        return response()->noContent();
    }
}
