<?php

namespace App\Http\Controllers;

use App\Services\TenantService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class TenantRegistrationController extends Controller
{
    protected $tenantService;

    public function __construct(TenantService $tenantService)
    {
        $this->tenantService = $tenantService;
    }

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'company_name' => 'required|string|max:255',
            'slug' => 'required|string|max:64|unique:tenants,slug|regex:/^[a-z0-9\-]+$/',
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'plan' => 'nullable|string|in:core,basic,professional,enterprise,custom',
            'modules' => 'nullable|array',
            'modules.*' => 'string|exists:modules,slug',
            'company_type' => 'nullable|string|in:General,Real Estate',
            'users_limit' => 'nullable|integer|min:1',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_lifetime' => 'nullable|boolean',
            'country' => 'required|string|max:255',
            'address_line_1' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'state' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $data = $request->all();
            $data['admin_password'] = $request->password;

            $result = $this->tenantService->createTenant($data);
            
            // Create a token for the new user immediately
            $token = $result['user']->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Tenant registered successfully.',
                'tenant' => $result['tenant'],
                'user' => $result['user'],
                'token' => $token,
                'redirect_url' => 'http://' . $result['tenant']->slug . '.' . parse_url(config('app.url'), PHP_URL_HOST)
            ], 201);
        } catch (ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Tenant registration failed', ['exception' => $e]);
            return response()->json([
                'error' => 'Registration failed.',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
