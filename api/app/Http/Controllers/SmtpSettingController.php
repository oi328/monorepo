<?php

namespace App\Http\Controllers;

use App\Models\SmtpSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;

class SmtpSettingController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        if (!$user->tenant_id) {
            return response()->json(['message' => 'User does not belong to a tenant'], 403);
        }

        $settings = SmtpSetting::firstOrCreate(
            ['tenant_id' => $user->tenant_id],
            [
                'provider' => 'custom',
                'port' => 587,
                'encryption' => 'TLS'
            ]
        );

        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $user = Auth::user();
        if (!$user->tenant_id) {
            return response()->json(['message' => 'User does not belong to a tenant'], 403);
        }

        $settings = SmtpSetting::firstOrCreate(['tenant_id' => $user->tenant_id]);

        $validated = $request->validate([
            'provider' => 'required|string',
            'host' => 'nullable|string',
            'port' => 'required|integer',
            'encryption' => 'required|string',
            'username' => 'nullable|string',
            'password' => 'nullable|string',
            'from_email' => 'nullable|email',
            'from_name' => 'nullable|string',
            'reply_to' => 'nullable|email',
            'signature' => 'nullable|string',
            'recipients_config' => 'nullable|array',
        ]);

        // Don't overwrite password with null/empty if not provided
        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $settings->update($validated);

        return response()->json($settings);
    }

    public function test(Request $request)
    {
        $request->validate([
            'host' => 'required',
            'port' => 'required',
            'encryption' => 'required',
            'username' => 'required',
            'password' => 'nullable',
            'from_email' => 'required|email',
            'from_name' => 'required',
        ]);

        $password = $request->password;

        if (empty($password)) {
             $user = Auth::user();
             if ($user && $user->tenant_id) {
                 $settings = SmtpSetting::where('tenant_id', $user->tenant_id)->first();
                 if ($settings) {
                     $password = $settings->password;
                 }
             }
        }

        if (empty($password)) {
            return response()->json(['message' => 'Password is required for testing.'], 422);
        }

        // Dynamically configure mailer
        Config::set('mail.mailers.smtp_test', [
            'transport' => 'smtp',
            'host' => $request->host,
            'port' => $request->port,
            'encryption' => strtolower($request->encryption) === 'none' ? null : strtolower($request->encryption),
            'username' => $request->username,
            'password' => $password,
            'timeout' => 10,
        ]);

        Config::set('mail.from.address', $request->from_email);
        Config::set('mail.from.name', $request->from_name);

        try {
            Mail::mailer('smtp_test')->raw('This is a test email from your CRM configuration.', function ($message) use ($request) {
                $message->to($request->from_email)
                    ->subject('SMTP Configuration Test');
            });

            return response()->json(['message' => 'Connection successful. Test email sent to ' . $request->from_email]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Connection failed: ' . $e->getMessage()], 422);
        }
    }
}
