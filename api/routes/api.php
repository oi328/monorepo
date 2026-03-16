<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\FieldController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\BrokerController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentTermController;
use App\Http\Controllers\InventoryRequestController;
use App\Http\Controllers\TenantRegistrationController;
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\SuperAdminImpersonationController;
use App\Http\Controllers\SuperAdminBackupController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AccessLogController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\OpportunityController;
use App\Http\Controllers\MagicLinkController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TenantModuleController;
use App\Http\Controllers\OauthController;
use App\Http\Controllers\GmailController;
use App\Http\Controllers\GeminiController;
use App\Http\Controllers\PublicFileController;
use App\Http\Controllers\MetaWebhookController;
use App\Http\Controllers\ExcelImportController;
use App\Http\Controllers\TenantConfigController;
use App\Http\Controllers\CrmSettingsController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ShareLinkController;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\InitializeTenancy;
use App\Http\Middleware\SetTenantTimezone;
use Illuminate\Support\Facades\Broadcast;

/* |-------------------------------------------------------------------------- | API Routes |-------------------------------------------------------------------------- | | Here is where you can register API routes for your application. These | routes are loaded by the RouteServiceProvider and all of them will | be assigned to the "api" middleware group. Make something great! | */

// Preflight: ensure all OPTIONS requests under /api/* return 204 with CORS headers
Route::options('/{any}', function (Request $request) {
    return response()->noContent();
})->where('any', '.*')
  ->withoutMiddleware([\Illuminate\Routing\Middleware\ThrottleRequests::class]);

// ==================================================================================
// Central Domain Routes (e.g., app.domain.com or root domain)
// ==================================================================================

// Fallback login route to prevent "Route [login] not defined" 500 error for API requests
Route::get('/login', function () {
    return response()->json(['message' => 'Unauthenticated.'], 401);
})->name('login');

// Tenant Registration
Route::post('/tenants/register', [TenantRegistrationController::class , 'register'])
    ->withoutMiddleware([\Illuminate\Routing\Middleware\ThrottleRequests::class]);
// NOTE: These auth endpoints must stay reachable even if Redis / cache is temporarily misconfigured.
// Throttling depends on the cache store (often Redis). If the cache store is down, throttling can throw and turn
// logins into HTTP 500. We explicitly disable the throttle middleware here and rely on upstream WAF/rate-limits.
Route::post('/login', [AuthController::class , 'login'])
    ->withoutMiddleware([\Illuminate\Routing\Middleware\ThrottleRequests::class]); // Generic Login (Central)
Route::post('/auth/2fa/verify', [AuthController::class , 'verifyTwoFactor'])
    ->withoutMiddleware([\Illuminate\Routing\Middleware\ThrottleRequests::class]);
Route::post('/crm/login-redirect', [AuthController::class , 'loginRedirect'])
    ->withoutMiddleware([\Illuminate\Routing\Middleware\ThrottleRequests::class]);
Route::get('/meta/webhook', [MetaWebhookController::class , 'verify']);
Route::post('/meta/webhook', [MetaWebhookController::class , 'receive']);
Route::post('/meta/mock/webhook/{page_id}', [\App\Http\Controllers\MetaMockController::class, 'triggerMockLead']);
Route::post('/internal/mock/google-ads/campaigns/{tenant}', [\App\Http\Controllers\GoogleMockController::class, 'triggerMockCampaigns']);
Route::post('/internal/mock/google-ads/leads/{tenant}', [\App\Http\Controllers\GoogleMockController::class, 'triggerMockLeads']);
Route::post('/google/webhook', [\App\Http\Controllers\GoogleWebhookController::class, 'receive']);
Route::get('/auth/google/callback', [\App\Http\Controllers\GoogleAuthController::class, 'callback']);
Route::get('/whatsapp/webhook', [\App\Http\Controllers\WhatsappWebhookController::class , 'verify']);
Route::post('/whatsapp/webhook', [\App\Http\Controllers\WhatsappWebhookController::class , 'receive']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/whatsapp/messages', [\App\Http\Controllers\WhatsappMessageController::class , 'index']);
    Route::post('/whatsapp/send-test', [\App\Http\Controllers\WhatsappMessageController::class , 'sendTest']);
});

// Secure File Serving (Signed URLs)
Route::get('/files/{path}', [\App\Http\Controllers\TenantFileController::class , 'show'])
    ->where('path', '.*')
    ->name('tenant.files.show');

// Public disk files (used by PDF/image exports)
Route::get('/public-files/{path}', [PublicFileController::class , 'show'])
    ->where('path', '.*')
    ->name('public.files.show');

// Super Admin Routes (Accessible on main domain)
Route::prefix('super-admin')->middleware(['auth:sanctum'])->group(function () {
    Route::get('tenants', [SuperAdminController::class , 'tenants']);
    Route::post('tenants', [SuperAdminController::class , 'storeTenant']);
    Route::put('tenants/{tenant}', [SuperAdminController::class , 'update']);
    Route::get('users', [SuperAdminController::class , 'users']);

    // Audit Logs
    Route::get('logs', [ActivityLogController::class , 'index']);
    Route::get('logs/export', [ActivityLogController::class , 'export']);
    Route::get('system-errors', [\App\Http\Controllers\SystemErrorController::class, 'index']);

    // Tenant Module Management
    Route::get('tenants/{tenant}/modules', [TenantModuleController::class , 'index']);
    Route::put('tenants/{tenant}/modules', [TenantModuleController::class , 'update']);

    Route::post('impersonate/{tenant}', [SuperAdminImpersonationController::class , 'impersonate']);
    Route::post('impersonate/stop', [SuperAdminImpersonationController::class , 'stop']);

    Route::get('tenant-backups', [SuperAdminBackupController::class , 'index']);
    Route::post('tenants/{tenant}/backups', [SuperAdminBackupController::class , 'backupNow']);
    Route::get('tenants/{tenant}/backups', [SuperAdminBackupController::class , 'listBackups']);
    Route::get('tenants/{tenant}/backups/{backup}/download', [SuperAdminBackupController::class , 'download']);

    // Global System Settings
    Route::get('settings', [\App\Http\Controllers\SystemSettingController::class, 'index']);
    Route::post('settings', [\App\Http\Controllers\SystemSettingController::class, 'update']);
});

// ==================================================================================
// 2. Tenant Domain Routes (Accessible via subdomain OR header on localhost)
// ==================================================================================

// Public Landing Page (Global Access)
Route::get('/p/{slug}', [\App\Http\Controllers\LandingPageController::class, 'showPublic']);
Route::post('/p/{slug}/lead', [\App\Http\Controllers\LandingPageController::class, 'storeLead']);

Route::middleware([ResolveTenant::class])
    ->group(function () {

        // Authentication
        Route::post('/auth/login', [AuthController::class , 'login']);
        Route::post('/auth/2fa/verify', [AuthController::class , 'verifyTwoFactor']);

        // Magic Link (Tenant Context)
        Route::post('/login/magic', [MagicLinkController::class , 'send']);
        Route::get('/login/magic/verify/{id}', [MagicLinkController::class , 'verify'])->name('magic.verify');

        // Password Reset (Tenant Context)
        Route::post('/password/email', [App\Http\Controllers\PasswordResetController::class , 'sendResetLink']);
        Route::post('/password/reset', [App\Http\Controllers\PasswordResetController::class , 'reset']);

        // Public Share Links (Landing Preview)
        Route::get('/share-links/{token}', [ShareLinkController::class, 'show']);
    });

// Protected Routes (Accessible via any domain, Tenant context resolved via Auth)
Route::middleware([
    'auth:sanctum',
    ResolveTenant::class ,
    InitializeTenancy::class ,
    SetTenantTimezone::class ,
    'check_api_key_expiration',
    'throttle:api',
])->group(function () {

    Broadcast::routes(); // Now inherits auth:sanctum and InitializeTenancy

    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/tenant-config', [TenantConfigController::class , 'show']);
    Route::get('/crm-settings', [CrmSettingsController::class , 'show']);
    Route::put('/crm-settings', [CrmSettingsController::class , 'update']);

    // Notifications
    Route::post('/push/subscribe', [NotificationController::class , 'subscribe']);
    Route::post('/trigger-notification', [NotificationController::class , 'trigger']);

    Route::post('/oauth/google/exchange', [OauthController::class , 'exchange']);
    Route::post('/oauth/google/revoke', [OauthController::class , 'revoke']);
    Route::get('/gmail/labels', [GmailController::class , 'labels']);
    Route::post('/gemini/icon-suggestions', [GeminiController::class , 'iconSuggestions']);
    Route::post('/gemini/generate-icon', [GeminiController::class , 'generateIcon']);

    Route::post('/share-links', [ShareLinkController::class, 'store']);

    // Meta Integration
    Route::get('/auth/meta/redirect', [\App\Http\Controllers\MetaAuthController::class, 'redirect']);
    Route::match(['get', 'post'], '/auth/meta/callback', [\App\Http\Controllers\MetaAuthController::class, 'callback'])->name('meta.callback');
    Route::get('/auth/meta/status', [\App\Http\Controllers\MetaAuthController::class, 'status']);
    Route::post('/auth/meta/settings', [\App\Http\Controllers\MetaAuthController::class, 'updateSettings']);
    Route::post('/auth/meta/disconnect', [\App\Http\Controllers\MetaAuthController::class, 'disconnect']);
    Route::post('/auth/meta/sync', [\App\Http\Controllers\MetaAuthController::class, 'sync']);
    Route::post('/auth/meta/asset/toggle', [\App\Http\Controllers\MetaAuthController::class, 'toggleAsset']);
    Route::post('/auth/meta/asset/delete', [\App\Http\Controllers\MetaAuthController::class, 'deleteAsset']);
    Route::post('/auth/meta/page/link', [\App\Http\Controllers\MetaAuthController::class, 'linkPage']);
    
    // Meta Mock Mode Routes
    Route::post('/meta/mock/leads/{tenantId}', [\App\Http\Controllers\MetaMockController::class, 'triggerMockLead']);

    // Google Ads Mock Mode Routes
    Route::post('/internal/mock/google-ads/campaigns/{tenant}', [\App\Http\Controllers\GoogleMockController::class, 'triggerMockCampaigns']);
    Route::post('/internal/mock/google-ads/leads/{tenant}', [\App\Http\Controllers\GoogleMockController::class, 'triggerMockLeads']);

    // Google Ads Multi-Account Management
    Route::prefix('tenant/{tenant_id}/google-ads')->group(function () {
        Route::post('/connect', [\App\Http\Controllers\GoogleAdsAccountController::class, 'connect']);
        Route::get('/accounts', [\App\Http\Controllers\GoogleAdsAccountController::class, 'index']);
        Route::get('/{account_id}/campaigns', [\App\Http\Controllers\GoogleAdsAccountController::class, 'getCampaigns']);
        Route::get('/{account_id}/leads', [\App\Http\Controllers\GoogleAdsAccountController::class, 'getLeads']);
        Route::delete('/{account_id}', [\App\Http\Controllers\GoogleAdsAccountController::class, 'disconnect']);
    });

    // Google Integration
    Route::get('/auth/google/redirect', [\App\Http\Controllers\GoogleAuthController::class, 'redirect']);
    Route::get('/auth/google/status', [\App\Http\Controllers\GoogleAuthController::class, 'status']);
    // New route for fetching multiple accounts for the current tenant
    Route::get('/auth/google/accounts', [\App\Http\Controllers\GoogleAdsAccountController::class, 'index']); 
    Route::post('/auth/google/settings', [\App\Http\Controllers\GoogleAuthController::class, 'updateSettings']);
    Route::post('/auth/google/conversion/test', [\App\Http\Controllers\GoogleAuthController::class, 'testConversion']);
    Route::post('/auth/google/conversion/upload', [\App\Http\Controllers\GoogleAuthController::class, 'uploadConversion']);
    Route::post('/auth/google/sync', [\App\Http\Controllers\GoogleAuthController::class, 'sync']);
    Route::post('/auth/google/disconnect', [\App\Http\Controllers\GoogleAuthController::class, 'disconnect']);

    // SMTP Settings
    Route::get('/smtp-settings', [\App\Http\Controllers\SmtpSettingController::class, 'show']);
    Route::put('/smtp-settings', [\App\Http\Controllers\SmtpSettingController::class, 'update']);
    Route::post('/smtp-settings/test', [\App\Http\Controllers\SmtpSettingController::class, 'test']);


    Route::post('/imports/leads/excel', [ExcelImportController::class , 'importLeads']);
    Route::post('/import', [ExcelImportController::class, 'importLeads']); // Generic alias for /api/import used in frontend

    Route::get('leads/meetings-report', [LeadController::class , 'meetingsReport']);
    Route::get('leads/stats', [LeadController::class , 'stats']);
    Route::get('leads/analysis', [LeadController::class , 'analysis']);
    Route::get('leads/recycle', [LeadController::class , 'recycleBin']);
    Route::post('leads/recycle/{id}/restore', [LeadController::class , 'restoreFromRecycle']);
    Route::get('leads/pipeline-analysis', [LeadController::class , 'pipelineAnalysis']);
    Route::get('leads/reassignment-report', [LeadController::class , 'reassignmentReport']);
Route::get('revenues/summary', [\App\Http\Controllers\RevenueController::class, 'summary']);
Route::get('revenues', [\App\Http\Controllers\RevenueController::class, 'index']);
Route::post('revenues', [\App\Http\Controllers\RevenueController::class, 'store']);
    Route::get('leads/delayed', [LeadController::class , 'delayed']);
    Route::post('leads/bulk-assign-referral', [LeadController::class, 'bulkAssignReferral']);
    Route::get('leads/referral-index', [LeadController::class, 'referralIndex']);
    Route::get('referral-leads', [LeadController::class, 'referralIndex']);
    Route::get('leads/referral-filters', [LeadController::class, 'referralFilters']);
    Route::get('leads/referral-stats', [LeadController::class, 'referralStats']);
    Route::get('referral-supervisors', [LeadController::class, 'getReferralSupervisors']);
    Route::post('leads/{id}/warn-duplicate', [LeadController::class , 'warnDuplicate']);
    Route::post('leads/{id}/resolve-duplicate', [LeadController::class , 'resolveDuplicate']);
    Route::post('leads/{id}/transfer', [LeadController::class , 'transfer']);
    Route::apiResource('leads', LeadController::class);

    Route::apiResource('quotations', QuotationController::class);

    Route::get('campaigns/dashboard-stats', [\App\Http\Controllers\CampaignController::class , 'dashboardStats']);
    Route::apiResource('campaigns', \App\Http\Controllers\CampaignController::class);
    Route::post('campaigns/{campaign}/record-action', [\App\Http\Controllers\CampaignController::class, 'recordAction']);
    Route::apiResource('landing-pages', \App\Http\Controllers\LandingPageController::class);

    Route::apiResource('opportunities', OpportunityController::class);
    Route::apiResource('customers', CustomerController::class);
    Route::apiResource('inventory-requests', InventoryRequestController::class);
    Route::apiResource('sales-orders', OrderController::class);
    Route::apiResource('sales-invoices', \App\Http\Controllers\SalesInvoiceController::class);
    Route::apiResource('departments', \App\Http\Controllers\DepartmentController::class);
    Route::apiResource('teams', \App\Http\Controllers\TeamController::class);
    Route::apiResource('tickets', \App\Http\Controllers\TicketController::class);
    Route::apiResource('tasks', \App\Http\Controllers\TaskController::class);
    Route::apiResource('users', \App\Http\Controllers\UserController::class);
    Route::get('/users/{user}/avatar', [\App\Http\Controllers\UserController::class, 'avatar']); // New Avatar Endpoint
    Route::apiResource('developers', \App\Http\Controllers\DeveloperController::class);
    Route::apiResource('brokers', \App\Http\Controllers\BrokerController::class);
    Route::get('roles', [RoleController::class , 'index']);
    Route::post('stages/reorder', [\App\Http\Controllers\StageController::class, 'reorder']);
    Route::apiResource('stages', \App\Http\Controllers\StageController::class);
    Route::apiResource('sources', \App\Http\Controllers\SourceController::class);
    Route::apiResource('items', ItemController::class);
    Route::apiResource('real-estate-requests', \App\Http\Controllers\RealEstateRequestController::class);
    Route::apiResource('countries', \App\Http\Controllers\CountryController::class);
    Route::apiResource('cities', \App\Http\Controllers\CityController::class);
    Route::apiResource('regions', \App\Http\Controllers\RegionController::class);
    Route::apiResource('areas', \App\Http\Controllers\AreaController::class);

    // Notification Settings
    Route::get('/notification-settings', [\App\Http\Controllers\NotificationSettingController::class , 'show']);
    Route::put('/notification-settings', [\App\Http\Controllers\NotificationSettingController::class , 'update']);

    // WhatsApp v1 Endpoints
    Route::get('/v1/leads/{lead}/whatsapp-messages', [\App\Http\Controllers\WhatsappMessageController::class , 'leadMessages']);
    Route::post('/v1/whatsapp/send-template', [\App\Http\Controllers\WhatsappMessageController::class , 'sendTemplateV1']);
    Route::post('/v1/whatsapp/send-text', [\App\Http\Controllers\WhatsappMessageController::class , 'sendTextV1']);

    // Notifications (Dynamic)
    Route::get('/notifications', [NotificationController::class , 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class , 'unreadCount']);
    Route::post('/notifications/mark-all-read', [NotificationController::class , 'markAllAsRead']);
    Route::post('/notifications/{id}/read', [NotificationController::class , 'markAsRead']);
    Route::post('/notifications/{id}/archive', [NotificationController::class , 'archive']);
    Route::post('/notifications/{id}/unarchive', [NotificationController::class , 'unarchive']);
    Route::delete('/notifications/{id}', [NotificationController::class , 'destroy']);
    Route::get('/inventory/new-counts', [NotificationController::class , 'inventoryCounts']);
    Route::post('/inventory/mark-seen', [NotificationController::class , 'markInventorySeen']);

    // API Keys
    Route::get('/api-keys', [\App\Http\Controllers\ApiKeyController::class , 'index']);
    Route::post('/api-keys', [\App\Http\Controllers\ApiKeyController::class , 'store']);
    Route::delete('/api-keys/{id}', [\App\Http\Controllers\ApiKeyController::class , 'destroy']);

    // SMTP Settings
    Route::get('/smtp-settings', [\App\Http\Controllers\SmtpSettingController::class , 'show']);
    Route::put('/smtp-settings', [\App\Http\Controllers\SmtpSettingController::class , 'update']);
    Route::post('/smtp-settings/test', [\App\Http\Controllers\SmtpSettingController::class , 'test']);

    // ERP Settings
    Route::get('/erp-settings', [\App\Http\Controllers\ErpSettingController::class , 'show']);
    Route::put('/erp-settings', [\App\Http\Controllers\ErpSettingController::class , 'update']);
    Route::post('/erp-settings/test', [\App\Http\Controllers\ErpSettingController::class , 'test']);

    // ERP Sync Logs
    Route::get('/erp-sync-logs', [\App\Http\Controllers\ErpSyncLogController::class , 'index']);

    // SMS Settings
    Route::get('/sms-settings', [\App\Http\Controllers\SmsSettingController::class , 'show']);
    Route::put('/sms-settings', [\App\Http\Controllers\SmsSettingController::class , 'update']);
    Route::post('/sms-settings/test', [\App\Http\Controllers\SmsSettingController::class , 'test']);
    Route::apiResource('sms-templates', \App\Http\Controllers\SmsTemplateController::class);
    // Email Templates
    Route::apiResource('email-templates', \App\Http\Controllers\EmailTemplateController::class);

    // WhatsApp Settings
    Route::get('/whatsapp-settings', [\App\Http\Controllers\WhatsappSettingController::class , 'show']);
    Route::put('/whatsapp-settings', [\App\Http\Controllers\WhatsappSettingController::class , 'update']);
    Route::apiResource('whatsapp-templates', \App\Http\Controllers\WhatsappTemplateController::class);
    // Rotation Settings
    Route::get('/rotation-settings', [\App\Http\Controllers\RotationSettingController::class , 'show']);
    Route::put('/rotation-settings', [\App\Http\Controllers\RotationSettingController::class , 'update']);

    // CIL Settings
    Route::get('/cil-settings', [\App\Http\Controllers\CilSettingController::class , 'show']);
    Route::put('/cil-settings', [\App\Http\Controllers\CilSettingController::class , 'update']);

    // Reports Routes
    Route::get('/reports/dashboard-stats', [\App\Http\Controllers\ReportsController::class, 'dashboardStats']);
    Route::get('/reports/team-stats', [\App\Http\Controllers\ReportsController::class, 'teamStats']);
    Route::get('reports/campaigns/dashboard', [\App\Http\Controllers\CampaignReportController::class , 'dashboard']);
    Route::get('reports/campaigns/duration', [\App\Http\Controllers\CampaignReportController::class , 'duration']);
    Route::get('reports/campaigns/summary', [\App\Http\Controllers\CampaignReportController::class , 'summary']);
    Route::get('reports/customers', [CustomerController::class , 'report']);

    Route::get('/company-info', [AuthController::class , 'me']);
    Route::post('/company-info', [AuthController::class , 'updateCompany']);

    Route::get('/profile', [App\Http\Controllers\ProfileController::class , 'show']);

    // Email Messages
    Route::get('/v1/leads/{lead}/email-messages', [\App\Http\Controllers\EmailMessageController::class , 'leadMessages']);
    Route::post('/v1/email/send', [\App\Http\Controllers\EmailMessageController::class , 'send']);
    Route::post('/profile', [App\Http\Controllers\ProfileController::class , 'update']);
    Route::get('/profile/sessions', [App\Http\Controllers\ProfileController::class , 'sessions']);
    Route::delete('/profile/sessions/{id}', [App\Http\Controllers\ProfileController::class , 'revokeSession']);
    Route::get('/user-management/activity-logs', [ActivityLogController::class , 'tenantLogs']);
    Route::get('/user-management/access-logs', [AccessLogController::class , 'index']);
    Route::get('/exports', [\App\Http\Controllers\ExportController::class , 'index']);
    Route::get('/exports/stats', [\App\Http\Controllers\ExportController::class , 'stats']);
    Route::post('/exports', [\App\Http\Controllers\ExportController::class , 'store']);
    Route::post('/imports', [\App\Http\Controllers\ExportController::class , 'store']); // Alias for imports logging

    Route::get('/user', function (Request $request) {
            return $request->user();
        }
        );

        // Dashboard Widgets
        Route::get('/dashboard/top-users', [\App\Http\Controllers\DashboardController::class , 'topUsers']);
        Route::get('/dashboard/widgets', function (Request $request) {
            // Ensure user has permission
            if (!$request->user()->can('view-reports')) { // Example permission
            // Return basic stats if no permission? Or 403.
            // For now, let's allow basic access or check a general permission
            }

            $leadCount = \App\Models\Lead::count();
            $recentLeads = \App\Models\Lead::latest()->take(5)->get();

            // Tenant is bound by InitializeTenancy middleware for auth users
            return response()->json([
            'tenant' => app('tenant')->name ?? 'Unknown Tenant',
            'stats' => [
            'total_leads' => $leadCount,
            ],
            'recent_leads' => $recentLeads
            ]);
        }
        );

        // Analytics: Top Agents by actions on their own leads
        Route::get('/dashboard-data/top-agents', [ActivityLogController::class , 'topAgents']);
        Route::get('/dashboard-data/last-comments', [ActivityLogController::class , 'lastComments']);
        Route::get('/dashboard-data/recent-phone-calls', [ActivityLogController::class , 'recentPhoneCalls']);
        Route::get('/dashboard-data/active-users', [ActivityLogController::class , 'activeUsers']);

        // Dynamic Fields Routes
        Route::prefix('admin')->group(function () {
            Route::get('fields', [FieldController::class , 'index']);
            Route::post('fields', [FieldController::class , 'store']);
            Route::put('fields/{id}', [FieldController::class , 'update']);
            Route::delete('fields/{id}', [FieldController::class , 'destroy']);
            Route::patch('fields/{id}/toggle-active', [FieldController::class , 'toggleActive']);
            Route::post('fields/reorder', [FieldController::class , 'reorder']);
        }
        );

        // Entity Routes (Tenant Isolated via Global Scope)
        // Leads Recycle Bin & Bulk Operations
        Route::get('leads/trashed', [LeadController::class , 'trashed']);
        Route::post('leads/{id}/restore', [LeadController::class , 'restore']);
        Route::delete('leads/{id}/force', [LeadController::class , 'forceDelete']);
        Route::post('leads/bulk-restore', [LeadController::class , 'bulkRestore']);
        Route::post('leads/bulk-force-delete', [LeadController::class , 'bulkForceDelete']);
        Route::post('leads/bulk-delete', [LeadController::class , 'bulkDelete']);

        Route::post('leads/bulk-import', [LeadController::class , 'bulkImport']);
        Route::post('leads/bulk-assign', [LeadController::class , 'bulkAssign']);
        Route::post('leads/bulk-status', [LeadController::class , 'bulkStatus']);

        Route::get('lead-actions/activity-report', [\App\Http\Controllers\LeadActionController::class, 'activityReport']);
        Route::apiResource('lead-actions', \App\Http\Controllers\LeadActionController::class);
        Route::apiResource('visits', \App\Http\Controllers\VisitController::class);
        Route::apiResource('units', \App\Http\Controllers\UnitController::class);
        Route::get('projects/stats', [\App\Http\Controllers\ProjectController::class, 'stats']);
        Route::apiResource('projects', \App\Http\Controllers\ProjectController::class);
        Route::apiResource('properties', PropertyController::class);
        Route::apiResource('item-categories', \App\Http\Controllers\ItemCategoryController::class);
        Route::apiResource('cancel-reasons', \App\Http\Controllers\CancelReasonController::class);
    });
