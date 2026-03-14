<?php

namespace App\Http\Controllers;

use App\Models\ItemBrand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ItemBrandController extends Controller
{
    public function index()
    {
        return ItemBrand::latest()->get();
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

        $brand = ItemBrand::create($request->all());

        return response()->json($brand, 201);
    }

    public function update(Request $request, $id)
    {
        $brand = ItemBrand::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $brand->update($request->all());

        return response()->json($brand);
    }

    public function destroy($id)
    {
        ItemBrand::findOrFail($id)->delete();
        return response()->noContent();
    }
}
