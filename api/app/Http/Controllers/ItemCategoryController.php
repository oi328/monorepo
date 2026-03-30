<?php

namespace App\Http\Controllers;

use App\Models\ItemCategory;
use App\Traits\InventoryDeleteAuthorization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ItemCategoryController extends Controller
{
    use InventoryDeleteAuthorization;

    public function index()
    {
        return ItemCategory::withCount('items')->latest()->get();
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'applies_to' => 'nullable|string|in:Product,Service,Subscription,Package',
            'status' => 'nullable|string|in:Active,Inactive',
            'parent' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->all();

        if (empty($data['code'])) {
            $nextNumber = (ItemCategory::max('id') ?? 0) + 1;
            $data['code'] = 'CAT-' . str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
        }

        $category = ItemCategory::create($data);

        return response()->json($category, 201);
    }

    public function update(Request $request, $id)
    {
        $category = ItemCategory::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'applies_to' => 'nullable|string|in:Product,Service,Subscription,Package',
            'status' => 'nullable|string|in:Active,Inactive',
            'parent' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $category->update($request->all());

        return response()->json($category);
    }

    public function destroy(Request $request, $id)
    {
        if ($resp = $this->authorizeInventoryDelete($request, 'general')) {
            return $resp;
        }
        ItemCategory::findOrFail($id)->delete();
        return response()->noContent();
    }
}
