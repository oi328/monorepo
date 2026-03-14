<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Entity;
use App\Models\Field;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FieldController extends Controller
{
    /**
     * Get fields for a specific entity.
     */
    public function index(Request $request)
    {
        $request->validate([
            'entity' => 'required|string',
        ]);

        $entity = Entity::where('key', $request->entity)->first();
        if (!$entity) {
            return response()->json([]);
        }

        // Global scope in Field model handles tenant isolation
        $fields = $entity->fields; 

        return response()->json($fields);
    }

    /**
     * Store a new field.
     */
    public function store(Request $request)
    {
        $request->validate([
            'entity_key' => 'required|exists:entities,key',
            'key' => [
                'required',
                'string',
                'max:255',
                Rule::unique('fields')->where(function ($query) use ($request) {
                    $entity = Entity::where('key', $request->entity_key)->first();
                    return $query->where('entity_id', $entity ? $entity->id : null)
                                 ->where('tenant_id', Auth::user()->tenant_id);
                }),
            ],
            'label_en' => 'required|string|max:255',
            'label_ar' => 'required|string|max:255',
            'placeholder_en' => 'nullable|string|max:255',
            'placeholder_ar' => 'nullable|string|max:255',
            'type' => 'required|string|in:text,number,email,date,select,checkbox,textarea',
            'required' => 'boolean',
            'active' => 'boolean',
            'can_filter' => 'boolean',
            'is_landing_page' => 'boolean',
            'show_my_lead' => 'boolean',
            'show_sales' => 'boolean',
            'show_manager' => 'boolean',
            'is_exportable' => 'boolean',
            'options' => 'nullable|array',
        ]);

        $entity = Entity::where('key', $request->entity_key)->firstOrFail();

        // Field model's boot method will automatically set tenant_id
        $field = $entity->fields()->create($request->all());

        return response()->json($field, 201);
    }

    /**
     * Update the specified field.
     */
    public function update(Request $request, $id)
    {
        $field = Field::findOrFail($id);

        $request->validate([
            'key' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('fields')->where(function ($query) use ($field) {
                    return $query->where('entity_id', $field->entity_id)
                                 ->where('tenant_id', Auth::user()->tenant_id);
                })->ignore($field->id),
            ],
            'label_en' => 'sometimes|required|string|max:255',
            'label_ar' => 'sometimes|required|string|max:255',
            'placeholder_en' => 'nullable|string|max:255',
            'placeholder_ar' => 'nullable|string|max:255',
            'type' => 'sometimes|required|string|in:text,number,email,date,select,checkbox,textarea',
            'options' => 'nullable|array',
            'can_filter' => 'boolean',
            'is_landing_page' => 'boolean',
            'show_my_lead' => 'boolean',
            'show_sales' => 'boolean',
            'show_manager' => 'boolean',
            'is_exportable' => 'boolean',
        ]);

        $field->update($request->all());

        return response()->json($field);
    }

    /**
     * Delete the specified field.
     */
    public function destroy($id)
    {
        $field = Field::findOrFail($id);
        $field->delete();

        return response()->json(null, 204);
    }

    /**
     * Toggle active status.
     */
    public function toggleActive($id)
    {
        $field = Field::findOrFail($id);
        $field->update(['active' => !$field->active]);

        return response()->json($field);
    }

    /**
     * Reorder fields.
     */
    public function reorder(Request $request)
    {
        $request->validate([
            'fields' => 'required|array',
            'fields.*.id' => 'required|exists:fields,id',
            'fields.*.sort_order' => 'required|integer',
        ]);

        foreach ($request->fields as $item) {
            // Find with scope to ensure we own the field
            $field = Field::find($item['id']);
            if ($field) {
                $field->update(['sort_order' => $item['sort_order']]);
            }
        }

        return response()->json(['message' => 'Reordered successfully']);
    }
}
