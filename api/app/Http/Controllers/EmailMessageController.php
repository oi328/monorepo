<?php

namespace App\Http\Controllers;

use App\Models\EmailMessage;
use App\Models\Lead;
use App\Models\OauthToken;
use App\Models\SmtpSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Config;

class EmailMessageController extends Controller
{
    protected $googleAuthService;

    public function __construct(\App\Services\GoogleAuthService $googleAuthService)
    {
        $this->googleAuthService = $googleAuthService;
    }

    public function leadMessages(Request $request, $leadId)
    {
        $user = Auth::user();
        $lead = Lead::findOrFail($leadId);
        $email = $lead->email ?? '';

        $messages = EmailMessage::where('tenant_id', $user->tenant_id)
            ->where(function($q) use ($leadId, $email) {
                $q->where('lead_id', $leadId);
                if ($email) {
                    $q->orWhere('from', $email)->orWhere('to', $email);
                }
            })
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function(EmailMessage $m) {
                return [
                    'id' => $m->id,
                    'subject' => $m->subject,
                    'body' => $m->body,
                    'direction' => $m->direction,
                    'status' => $m->status ?: 'delivered',
                    'timestamp' => $m->created_at?->toISOString(),
                ];
            });

        return response()->json($messages);
    }

    public function send(Request $request)
    {
        $user = Auth::user();
        $validated = $request->validate([
            'lead_id' => 'nullable|integer|exists:leads,id',
            'recipient_email' => 'required|email',
            'subject' => 'required|string',
            'body' => 'required|string',
        ]);

        // 1. Get Tenant SMTP Settings
        $smtpSettings = SmtpSetting::where('tenant_id', $user->tenant_id)->first();
        $provider = $smtpSettings->provider ?? 'system'; // Default to system if not configured

        $fromEmail = $smtpSettings->from_email ?? config('mail.from.address');
        $fromName = $smtpSettings->from_name ?? config('mail.from.name');

        // --- GMAIL OAUTH STRATEGY ---
        if ($provider === 'gmail') {
            $accessToken = null;

            // Try User-Specific Integration first
            $userToken = OauthToken::where([
                'user_id' => $user->id,
                'provider' => 'gmail',
            ])->first();

            if ($userToken) {
                $accessToken = $this->googleAuthService->getValidOauthToken($userToken);
            }

            // Fallback to Tenant-Wide Integration
            if (!$accessToken) {
                $tenantToken = \App\Models\GoogleIntegration::where('tenant_id', $user->tenant_id)->first();
                if ($tenantToken) {
                    $accessToken = $this->googleAuthService->getValidAccessToken($tenantToken);
                }
            }

            if ($accessToken) {
                try {
                    // Get user profile to use correct From address
                    /** @var \Illuminate\Http\Client\Response $profileResp */
                    $profileResp = Http::withToken($accessToken)
                        ->get('https://gmail.googleapis.com/gmail/v1/users/me/profile');
                    
                    if ($profileResp->successful()) {
                        $profile = $profileResp->json();
                        $fromEmail = $profile['emailAddress'];
                    }

                    // Send via Gmail API
                    $mime = new \Symfony\Component\Mime\Email();
                    $mime->from(new \Symfony\Component\Mime\Address($fromEmail, $fromName))
                        ->to($validated['recipient_email'])
                        ->subject($validated['subject'])
                        ->html($validated['body']);

                    $rawMessage = $mime->toString();
                    $encodedMessage = rtrim(strtr(base64_encode($rawMessage), '+/', '-_'), '=');

                    /** @var \Illuminate\Http\Client\Response $response */
                    $response = Http::withToken($accessToken)
                        ->post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', [
                            'raw' => $encodedMessage
                        ]);
                    
                    if ($response->successful()) {
                        EmailMessage::create([
                            'tenant_id' => $user->tenant_id,
                            'lead_id' => $validated['lead_id'] ?? null,
                            'subject' => $validated['subject'],
                            'body' => $validated['body'],
                            'from' => $fromEmail,
                            'to' => $validated['recipient_email'],
                            'direction' => 'outbound',
                            'status' => 'sent',
                            'message_id' => $response->json()['id'],
                            'provider' => 'gmail_oauth',
                        ]);
                        
                        return response()->json(['message' => 'Email sent successfully via Gmail API']);
                    }
                    
                    Log::error("Gmail API Send Error: " . $response->body());
                    // Fallback to SMTP if OAuth fails?
                } catch (\Exception $e) {
                    Log::error("Gmail Integration Error: " . $e->getMessage());
                }
            }
        }

        // --- CUSTOM SMTP STRATEGY ---
        if ($provider !== 'system' && $smtpSettings && $smtpSettings->host) {
            try {
                // Dynamically configure mailer
                Config::set('mail.mailers.tenant_smtp', [
                    'transport' => 'smtp',
                    'host' => $smtpSettings->host,
                    'port' => $smtpSettings->port,
                    'encryption' => strtolower($smtpSettings->encryption) === 'none' ? null : strtolower($smtpSettings->encryption),
                    'username' => $smtpSettings->username,
                    'password' => $smtpSettings->password,
                    'timeout' => null,
                ]);

                Config::set('mail.from.address', $fromEmail);
                Config::set('mail.from.name', $fromName);

                /** @var \Illuminate\Mail\Mailer $mailer */
                $mailer = Mail::mailer('tenant_smtp');
                $mailer->html($validated['body'], function ($message) use ($validated, $fromEmail, $fromName) {
                    $message->to($validated['recipient_email'])
                        ->subject($validated['subject'])
                        ->from($fromEmail, $fromName);
                });

                EmailMessage::create([
                    'tenant_id' => $user->tenant_id,
                    'lead_id' => $validated['lead_id'] ?? null,
                    'subject' => $validated['subject'],
                    'body' => $validated['body'],
                    'from' => $fromEmail,
                    'to' => $validated['recipient_email'],
                    'direction' => 'outbound',
                    'status' => 'sent', 
                    'provider' => 'custom_smtp',
                ]);

                return response()->json(['message' => 'Email sent via Custom SMTP']);

            } catch (\Exception $e) {
                Log::error("Custom SMTP Error: " . $e->getMessage());
                // Fallback to system?
            }
        }

        // --- SYSTEM FALLBACK STRATEGY ---
        // Only use system mailer if explicitly configured or as a last resort fallback if desired
        // For now, we allow fallback but log it as 'system'
        
        try {
            // Reset to default system config just in case
            // (Laravel config shouldn't persist across requests in standard PHP-FPM, but good to be safe)
            
            Mail::html($validated['body'], function ($message) use ($validated) {
                $message->to($validated['recipient_email'])
                    ->subject($validated['subject']);
                    // Uses default from address from .env
            });

            EmailMessage::create([
                'tenant_id' => $user->tenant_id,
                'lead_id' => $validated['lead_id'] ?? null,
                'subject' => $validated['subject'],
                'body' => $validated['body'],
                'from' => config('mail.from.address'),
                'to' => $validated['recipient_email'],
                'direction' => 'outbound',
                'status' => 'sent', 
                'provider' => 'system',
            ]);

            return response()->json(['message' => 'Email sent via system mailer']);
        } catch (\Exception $e) {
            Log::error("System Mailer Error: " . $e->getMessage());
            
            EmailMessage::create([
                'tenant_id' => $user->tenant_id,
                'lead_id' => $validated['lead_id'] ?? null,
                'subject' => $validated['subject'],
                'body' => $validated['body'],
                'from' => config('mail.from.address'),
                'to' => $validated['recipient_email'],
                'direction' => 'outbound',
                'status' => 'failed',
                'raw' => ['error' => $e->getMessage()],
            ]);

            return response()->json(['error' => 'Failed to send email: ' . $e->getMessage()], 500);
        }
    }
}
