<?php

namespace App\Http\Controllers;

use App\Models\SmsTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SmsTemplateController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $templates = SmsTemplate::where('tenant_id', $user->tenant_id)->latest()->get();
        return response()->json($templates);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string',
            'body' => 'required|string',
            'status' => 'boolean',
        ]);

        $validated['tenant_id'] = $user->tenant_id;
        $template = SmsTemplate::create($validated);
        return response()->json($template, 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $template = SmsTemplate::where('tenant_id', $user->tenant_id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string',
            'body' => 'sometimes|string',
            'status' => 'boolean',
        ]);

        $template->update($validated);
        return response()->json($template);
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $template = SmsTemplate::where('tenant_id', $user->tenant_id)->findOrFail($id);
        $template->delete();
        return response()->json(null, 204);
    }
}
