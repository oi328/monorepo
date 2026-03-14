<?php

namespace App\Http\Controllers;

use App\Models\ItemGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ItemGroupController extends Controller
{
    public function index()
    {
        return ItemGroup::latest()->get();
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $group = ItemGroup::create($request->all());

        return response()->json($group, 201);
    }

    public function update(Request $request, $id)
    {
        $group = ItemGroup::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $group->update($request->all());

        return response()->json($group);
    }

    public function destroy($id)
    {
        ItemGroup::findOrFail($id)->delete();
        return response()->noContent();
    }
}
