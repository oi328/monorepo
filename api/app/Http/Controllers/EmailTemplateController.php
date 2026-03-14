<?php

namespace App\Http\Controllers;

use App\Models\EmailTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EmailTemplateController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $templates = EmailTemplate::where('tenant_id', $user->tenant_id)->latest()->get();
        return response()->json($templates);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'related' => 'nullable|string|max:255',
            'subject' => 'nullable|string|max:255',
            'body' => 'required|string',
            'status' => 'nullable|string|max:50',
        ]);
        $validated['tenant_id'] = $user->tenant_id;
        $validated['status'] = $validated['status'] ?? 'Draft';
        $tpl = EmailTemplate::create($validated);
        return response()->json($tpl, 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $tpl = EmailTemplate::where('tenant_id', $user->tenant_id)->findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'related' => 'sometimes|string|max:255',
            'subject' => 'sometimes|string|max:255',
            'body' => 'sometimes|string',
            'status' => 'nullable|string|max:50',
        ]);
        $tpl->update($validated);
        return response()->json($tpl);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $tpl = EmailTemplate::where('tenant_id', $user->tenant_id)->findOrFail($id);
        $tpl->delete();
        return response()->json(null, 204);
    }
}
