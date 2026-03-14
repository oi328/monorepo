// 1. استورد useEffect
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '../shared/context/AppStateProvider'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { lazyRetry } from '../utils/lazyRetry'

const SuperAdminLayout = lazyRetry(() => import('../components/SuperAdminLayout'))

// --- Auth Features ---
const Login = lazyRetry(() => import('../features/Auth/Login'))
const ForgotPassword = lazyRetry(() => import('../features/Auth/ForgotPassword'))
const ResetPassword = lazyRetry(() => import('../features/Auth/ResetPassword'))
const AuthCallback = lazyRetry(() => import('../features/Auth/AuthCallback'))
const GoogleAuthCallback = lazyRetry(() => import('../features/Auth/GoogleAuthCallback'))

// --- Pages (Root) ---
const Suspended = lazyRetry(() => import('../pages/Suspended'))
const SubscriptionExpired = lazyRetry(() => import('../pages/SubscriptionExpired'))
const UpgradePlan = lazyRetry(() => import('../pages/UpgradePlan'))
const Pricing = lazyRetry(() => import('../pages/Pricing'))
const About = lazyRetry(() => import('../pages/About'))
const Privacy = lazyRetry(() => import('../pages/Privacy'))
const Terms = lazyRetry(() => import('../pages/Terms'))
const WelcomeContact = lazyRetry(() => import('../pages/WelcomeContact'))
const ContactUs = lazyRetry(() => import('../pages/ContactUs'))
const Tasks = lazyRetry(() => import('../pages/Tasks'))
const Notifications = lazyRetry(() => import('../pages/Notifications'))

// --- Landing Pages ---
const LandingPagePreview = lazyRetry(() => import('../pages/landing-themes/LandingPagePreview'))
const LandingPageViewer = lazyRetry(() => import('../pages/landing-themes/LandingPageViewer'))

// --- Layout ---
const Layout = lazyRetry(() => import('../components/Layout'))

// --- Customers ---
const Customers = lazyRetry(() => import('../pages/Customers'))

// --- Support ---
const SupportDashboard = lazyRetry(() => import('../pages/SupportDashboard'))
const SupportTickets = lazyRetry(() => import('../pages/SupportTickets'))
const SupportCustomers = lazyRetry(() => import('../pages/SupportCustomers'))
const SupportSLA = lazyRetry(() => import('../pages/SupportSLA'))
const SupportReports = lazyRetry(() => import('../pages/SupportReports'))
const SupportFeedbacks = lazyRetry(() => import('../pages/SupportFeedbacks'))

// --- Sales ---
const SalesQuotations = lazyRetry(() => import('../pages/SalesQuotations'))
const SalesOrders = lazyRetry(() => import('../pages/SalesOrders'))
const SalesInvoices = lazyRetry(() => import('../pages/SalesInvoices'))

// --- Leads ---
const Leads = lazyRetry(() => import('../pages/Leads'))
const ReferralLeads = lazyRetry(() => import('../pages/ReferralLeads'))
const AddNewLead = lazyRetry(() => import('../pages/AddNewLead'))
const Recycle = lazyRetry(() => import('../pages/Recycle'))
const StagesSetup = lazyRetry(() => import('../pages/StagesSetup'))

// --- Inventory ---
const Categories = lazyRetry(() => import('../pages/Categories'))
const ItemsPage = lazyRetry(() => import('../pages/inventory/ItemsPage'))
const Suppliers = lazyRetry(() => import('../pages/Suppliers'))
const Warehouse = lazyRetry(() => import('../pages/Warehouse'))
const StockManagement = lazyRetry(() => import('../pages/StockManagement'))
const InventoryTransactions = lazyRetry(() => import('../pages/InventoryTransactions'))
const Products = lazyRetry(() => import('../pages/Products'))

// --- Real Estate ---
const Projects = lazyRetry(() => import('../pages/Projects'))
const Properties = lazyRetry(() => import('../pages/Properties'))
const Developers = lazyRetry(() => import('../pages/inventory/Developers'))
const Brokers = lazyRetry(() => import('../pages/inventory/Brokers'))
const RealEstateRequests = lazyRetry(() => import('../pages/inventory/RealEstateRequestsPage'))
const GeneralRequests = lazyRetry(() => import('../pages/inventory/RequestsPage'))
const Requests = lazyRetry(() => import('../pages/Requests'))
const BuyerRequests = lazyRetry(() => import('../pages/BuyerRequests'))
const SellerRequests = lazyRetry(() => import('../pages/SellerRequests'))

// --- Marketing ---
const Marketing = lazyRetry(() => import('../pages/Marketing'))
const Campaigns = lazyRetry(() => import('../pages/Campaigns'))
const LandingPages = lazyRetry(() => import('../pages/LandingPages'))
const AddLandingPage = lazyRetry(() => import('../pages/AddLandingPage'))
const MetaIntegration = lazyRetry(() => import('../pages/MetaIntegration'))
const GoogleAdsSettings = lazyRetry(() => import('../components/integrations/GoogleAdsSettings'))
const MarketingReports = lazyRetry(() => import('../pages/MarketingReports'))
const CampaignSummaryReport = lazyRetry(() => import('../pages/CampaignSummaryReport'))
const LeadSourcePerformanceReport = lazyRetry(() => import('../pages/LeadSourcePerformanceReport'))
const CostVsRevenueReport = lazyRetry(() => import('../pages/CostVsRevenueReport'))
const MonthlyMarketingOverview = lazyRetry(() => import('../pages/MonthlyMarketingOverview'))

// --- Reports ---
const ReportsDashboard = lazyRetry(() => import('../pages/ReportsDashboard'))
const SalesReport = lazyRetry(() => import('../pages/SalesReport'))
const SalesActivitiesReport = lazyRetry(() => import('../pages/SalesActivitiesReport'))
const LeadsPipelineReport = lazyRetry(() => import('../pages/LeadsPipelineReport'))
const ReservationsReport = lazyRetry(() => import('../pages/ReservationsReport'))
const ClosedDealsReport = lazyRetry(() => import('../pages/ClosedDealsReport'))
const RentReport = lazyRetry(() => import('../pages/RentReport'))
const CheckInReport = lazyRetry(() => import('../pages/CheckInReport'))
const CustomersReport = lazyRetry(() => import('../pages/CustomersReport'))
const ImportsReport = lazyRetry(() => import('../pages/ImportsReport'))
const ExportsReport = lazy(() => import('../pages/ExportsReport'))
const MeetingsReport = lazy(() => import('../pages/MeetingsReport'))
const ProposalsReport = lazy(() => import('../pages/ProposalsReport'))
const RevenueReport = lazy(() => import('../pages/RevenueReport'))
const LeadsReport = lazy(() => import('../pages/LeadsReport'))
const TeamPerformanceReport = lazy(() => import('../pages/TeamPerformanceReport'))
const ReportPlaceholder = lazy(() => import('../pages/ReportPlaceholder'))
const CampaignDurationReport = lazy(() => import('../pages/CampaignDurationReport'))
const ABCampaignComparison = lazy(() => import('../pages/ABCampaignComparison'))
const ResponseTimeReport = lazy(() => import('../pages/ResponseTimeReport'))

// --- Settings ---
const ProfileSettings = lazy(() => import('../pages/settings/profile/ProfileSettings'))
const CompanySettings = lazy(() => import('../pages/settings/company/CompanySettings'))
const ModulesSettings = lazy(() => import('../pages/settings/system/ModulesSettings'))
const SecuritySettings = lazy(() => import('../pages/settings/system/SecuritySettings'))
const CRMSettings = lazy(() => import('../pages/settings/system/CRMSettings'))
const CustomFields = lazy(() => import('../pages/settings/system/CustomFields'))
const Sources = lazy(() => import('../pages/settings/system/Sources'))
const Country = lazy(() => import('../pages/settings/system/locations/Country'))
const Cities = lazy(() => import('../pages/settings/system/locations/Cities'))
const Regions = lazy(() => import('../pages/settings/system/locations/Regions'))
const Area = lazy(() => import('../pages/settings/system/locations/Area'))
const AddLeadInputs = lazy(() => import('../pages/settings/system/form-inputs/AddLeadInputs'))
const AddCustomerInputs = lazy(() => import('../pages/settings/system/form-inputs/AddCustomerInputs'))
const AddItemInputs = lazy(() => import('../pages/settings/system/form-inputs/AddItemInputs'))
const AddPropertiesInputs = lazy(() => import('../pages/settings/system/form-inputs/AddPropertiesInputs'))
const AddBrokerInputs = lazy(() => import('../pages/settings/system/form-inputs/AddBrokerInputs'))
const AuditLogs = lazy(() => import('../pages/settings/system/AuditLogs'))
const NotificationsSettings = lazy(() => import('../pages/settings/notifications/NotificationsSettings'))
const SettingsSms = lazy(() => import('../pages/SettingsSms'))
const SettingsEmail = lazy(() => import('../pages/SettingsEmail'))
const WhatsAppIntegration = lazy(() => import('../pages/settings/integrations/WhatsAppIntegration'))
const SettingsConfiguration = lazy(() => import('../pages/SettingsConfiguration'))
const CancelReasons = lazy(() => import('../pages/CancelReasons'))
const PaymentPlans = lazy(() => import('../pages/PaymentPlans'))

// --- Billing ---
const BillingSubscription = lazy(() => import('../pages/settings/billing/BillingSubscription'))
const PaymentHistory = lazy(() => import('../pages/settings/billing/PaymentHistory'))
const PlansUpgrade = lazy(() => import('../pages/settings/billing/PlansUpgrade'))
const APIKeys = lazy(() => import('../pages/settings/integrations/APIKeys'))
const ERPIntegrations = lazy(() => import('../pages/settings/integrations/ERPIntegrations'))
const Webhooks = lazy(() => import('../pages/settings/integrations/Webhooks'))
const PaymentGatewayIntegration = lazy(() => import('../pages/settings/integrations/PaymentGatewayIntegration'))
const GoogleSlackIntegrations = lazy(() => import('../pages/settings/integrations/GoogleSlackIntegrations'))
const ImportDM = lazy(() => import('../pages/settings/data-management/Import'))
const ExportDM = lazy(() => import('../pages/settings/data-management/Export'))
const Backup = lazy(() => import('../pages/settings/data-management/Backup'))

// --- Operations ---
const Scripting = lazy(() => import('../pages/settings/operations/Scripting'))
const EOISettings = lazy(() => import('../pages/settings/operations/EOISettings'))
const ReservationSettings = lazy(() => import('../pages/settings/operations/ReservationSettings'))
const RotationSettings = lazy(() => import('../pages/settings/operations/RotationSettings'))
const ContractsSettings = lazy(() => import('../pages/settings/operations/ContractsSettings'))
const BuyerRequestReset = lazy(() => import('../pages/settings/operations/BuyerRequestReset'))
const MatchingSettings = lazy(() => import('../pages/settings/operations/MatchingSettings'))
const RentConfiguration = lazy(() => import('../pages/settings/operations/RentConfiguration'))

// --- System Admin ---
const SystemAdminDashboard = lazy(() => import('../pages/SystemAdminDashboard'))
const TenantSetup = lazy(() => import('../pages/settings/TenantSetup'))
const SystemIntegrations = lazy(() => import('../pages/SystemIntegrations'))
const SystemErrorLog = lazy(() => import('../pages/SystemErrorLog'))

// --- User Management ---
const UserManagementUsers = lazy(() => import('@features/Users/Users.jsx'))
const UserManagementUserCreate = lazy(() => import('@features/Users/UserForm.jsx'))
const UserManagementUserProfile = lazy(() => import('@pages/UserManagementUserProfile.jsx'))
const UserManagementDepartments = lazy(() => import('@features/Users/Departments.jsx'))
const UserManagementDepartmentDetails = lazy(() => import('@pages/UserManagementDepartmentDetails.jsx'))
const UserManagementActivityLogs = lazy(() => import('@pages/UserManagementActivityLogs.jsx'))
const UserManagementAccessLogs = lazy(() => import('@pages/UserManagementAccessLogs.jsx'))

const Dashboard = lazy(() => import('@features/Dashboard').then(module => ({ default: module.Dashboard })))
const Settings = lazy(() => import('../pages/Settings'))
const CompanyInfoPage = lazy(() => import('../pages/settings/company-setup/company-info/CompanyInfoPage'))
const SubscriptionPage = lazy(() => import('../pages/settings/company-setup/subscription/SubscriptionPage'))
const ModulesPage = lazy(() => import('../pages/settings/company-setup/modules/ModulesPage'))
const DepartmentsPage = lazy(() => import('../pages/settings/company-setup/departments/DepartmentsPage'))
const VisibilityPage = lazy(() => import('../pages/settings/company-setup/visibility/VisibilityPage'))

function ProtectedModuleRoute({ moduleKey, requiredPermission }) {
  const { canAccess, user } = useAppState()
  if (!moduleKey) return <Outlet />
  const roleLower = String(user?.role || '').toLowerCase()
  if (moduleKey === 'campaigns') {
    const isSalesPerson = roleLower.includes('sales person') || roleLower.includes('salesperson')
    const isTeamLeader = roleLower.includes('team leader') || roleLower.includes('teamleader')
    const isTenantAdmin =
      roleLower === 'admin' ||
      roleLower === 'tenant admin' ||
      roleLower === 'tenant-admin'
    const isDirectorRole = roleLower.includes('director')
    const isOperationManagerRole = roleLower.includes('operation manager') || roleLower.includes('operations manager')
    const isSalesAdminRole = roleLower.includes('sales admin')
    const isSalesManagerRole = roleLower.includes('sales manager')
    const isBranchManagerRole = roleLower.includes('branch manager')
    const isMarketingManagerRole = roleLower.includes('marketing manager')
    const isMarketingModeratorRole = roleLower.includes('marketing moderator')
    const isSuperAdmin = !!(user?.is_super_admin || roleLower.includes('super admin') || roleLower.includes('superadmin') || roleLower === 'owner')

    const isAllowedMarketingRole =
      isSuperAdmin ||
      isTenantAdmin ||
      isDirectorRole ||
      isOperationManagerRole ||
      isSalesAdminRole ||
      isSalesManagerRole ||
      isBranchManagerRole ||
      isMarketingManagerRole ||
      isMarketingModeratorRole

    if (!isAllowedMarketingRole || isSalesPerson || isTeamLeader) {
      return <Navigate to="/dashboard" replace />
    }
  }
  if (!canAccess(moduleKey, requiredPermission)) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}

function SuperAdminRoute() {
  const { user, subscription } = useAppState()
  const roleLower = String(user?.role || '').toLowerCase()
  const emailLower = String(user?.email || '').toLowerCase()
  const isSuperAdmin =
    !!user?.is_super_admin ||
    subscription?.plan === 'super_admin' ||
    roleLower === 'owner' ||
    roleLower.includes('super admin') ||
    roleLower.includes('superadmin') ||
    emailLower === 'system@besouhoula.com' ||
    emailLower === 'admin@example.com' ||
    emailLower === 'admin@besouhoula.com'

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}
function SubscriptionGuard() { 
  const { bootstrapped, user } = useAppState();
  
  // 1. التحقق إذا كان الرابط الحالي هو رابط استلام التوكن
  const isAuthCallback = window.location.hash.includes('/auth/callback');

  // 2. التحقق من وجود توكن في الكوكيز أو LocalStorage أو SessionStorage
  const hasToken = (() => {
    const cookieToken = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    const lsToken = localStorage.getItem('token');
    const ssToken = sessionStorage.getItem('token');
    return !!(lsToken || ssToken || cookieToken);
  })();

  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // السماح بالدخول إذا كان المسار هو callback أو إذا وجدنا توكن
  if (isAuthCallback || hasToken) {
    return <Outlet />;
  }

  return <Navigate to="/login" replace />; 
}
function BillingAdminRoute() { return <Outlet /> }

export default function AppRouter() {
  const { i18n } = useTranslation()
  return (
    <div className={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }>
        <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
        <Route path="/suspended" element={<Suspended />} />
        <Route path="/signup" element={<Suspended />} /> {/* Placeholder, should be Signup */}
        <Route path="/subscription-expired" element={<SubscriptionExpired />} />
        <Route path="/upgrade" element={<UpgradePlan />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/welcome/contact" element={<WelcomeContact />} />
        <Route path="/landing-preview" element={<LandingPagePreview />} />
        <Route path="/p/:slug" element={<LandingPageViewer />} />

        <Route element={<SubscriptionGuard />}>        
          <Route element={<Layout />}>        
            <Route path="/dashboard" element={<Dashboard />} />
            <Route element={<ProtectedModuleRoute moduleKey="customers" />}>
              <Route path="/customers" element={<Customers />} />
            </Route>
            <Route element={<ProtectedModuleRoute moduleKey="support" />}>
              <Route path="/support" element={<SupportDashboard />} />
              <Route path="/support/tickets" element={<SupportTickets />} />
              <Route path="/support/customers" element={<SupportCustomers />} />
              <Route path="/support/sla" element={<SupportSLA />} />
              <Route path="/support/reports" element={<SupportReports />} />
              <Route path="/support/feedbacks" element={<SupportFeedbacks />} />
            </Route>

            <Route element={<ProtectedModuleRoute moduleKey="sales" />}>
              <Route path="/sales/quotations" element={<SalesQuotations />} />
              <Route path="/sales/orders" element={<SalesOrders />} />
              <Route path="/sales/invoices" element={<SalesInvoices />} />
            </Route>
            <Route element={<ProtectedModuleRoute moduleKey="leads" />}>          
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/my-leads" element={<Leads />} />
              <Route path="/leads/referral" element={<ReferralLeads />} />
              <Route path="/leads/new" element={<AddNewLead />} />
              <Route path="/recycle" element={<Recycle />} />
              <Route path="/stages-setup" element={<StagesSetup />} />
            </Route>

            {/* Inventory Module */}
            <Route element={<ProtectedModuleRoute moduleKey="inventory" />}>
              <Route path="/inventory/categories" element={<Categories />} />
              <Route path="/inventory/items" element={<ItemsPage />} />
              <Route path="/inventory/suppliers" element={<Suppliers />} />
              <Route path="/inventory/warehouse" element={<Warehouse />} />
              <Route path="/inventory/stock-management" element={<StockManagement />} />
              <Route path="/inventory/transactions" element={<InventoryTransactions />} />
              <Route path="/inventory/products" element={<Products />} />
              
              {/* Real Estate Inventory */}
              <Route path="/inventory/projects" element={<Projects />} />
              <Route path="/inventory/properties" element={<Properties />} />
              <Route path="/inventory/developers" element={<Developers />} />
              <Route path="/inventory/brokers" element={<Brokers />} />
              <Route path="/inventory/real-estate-requests" element={<RealEstateRequests />} />
              <Route path="/inventory/requests" element={<GeneralRequests />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/inventory/buyer-requests" element={<BuyerRequests />} />
              <Route path="/inventory/seller-requests" element={<SellerRequests />} />
            </Route>

            <Route element={<ProtectedModuleRoute moduleKey="campaigns" />}> 
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/marketing/campaigns" element={<Campaigns />} />
              <Route path="/marketing/landing-pages" element={<LandingPages />} />
              <Route path="/marketing/landing-pages/add" element={<AddLandingPage />} />
              <Route path="/marketing/meta-integration" element={<MetaIntegration />} />
              <Route path="/marketing/google-ads" element={<GoogleAdsSettings />} />
              <Route path="/marketing/reports" element={<MarketingReports />} />
              <Route path="/marketing/reports/campaign-summary" element={<CampaignSummaryReport />} />
              <Route path="/marketing/reports/lead-source-performance" element={<LeadSourcePerformanceReport />} />
              <Route path="/marketing/reports/cost-vs-revenue" element={<CostVsRevenueReport />} />
              <Route path="/marketing/reports/monthly-overview" element={<MonthlyMarketingOverview />} />
            </Route>

            <Route element={<ProtectedModuleRoute moduleKey="reports" />}>
              <Route path="/reports" element={<ReportsDashboard />} />
              <Route path="/reports/overview" element={<ReportsDashboard />} />
              <Route path="/reports/dashboard" element={<ReportsDashboard />} />
              <Route path="/reports/sales" element={<SalesReport />} />
              <Route path="/reports/sales/activities" element={<SalesActivitiesReport />} />
              <Route path="/reports/sales/pipeline" element={<LeadsPipelineReport />} />
              <Route path="/reports/sales/reservations" element={<ReservationsReport />} />
              <Route path="/reports/sales/closed-deals" element={<ClosedDealsReport />} />
              <Route path="/reports/sales/rent" element={<RentReport />} />
              <Route path="/reports/sales/check-in" element={<CheckInReport />} />
              <Route path="/reports/sales/customers" element={<CustomersReport />} />
              <Route path="/reports/sales/imports" element={<ImportsReport />} />
              <Route path="/reports/sales/exports" element={<ExportsReport />} />
              <Route path="/exports" element={<ExportsReport />} />
              <Route path="/reports/sales/meetings" element={<MeetingsReport />} />
              <Route path="/reports/sales/proposals" element={<ProposalsReport />} />
              <Route path="/reports/sales/revenue" element={<RevenueReport />} />
              <Route path="/reports/leads" element={<LeadsReport />} />
              <Route path="/reports/team" element={<TeamPerformanceReport />} />
              <Route path="/reports/sms" element={<ReportPlaceholder titleKey="Sms Report" descKey="reports.sms.desc" />} />
              <Route path="/reports/calls" element={<ReportPlaceholder titleKey="Calls Report" descKey="reports.calls.desc" />} />
              <Route path="/reports/performance" element={<TeamPerformanceReport />} />
              <Route path="/team-performance" element={<TeamPerformanceReport />} />
              {/* Marketing Reports under core Reports */}
              <Route path="/reports/marketing/analysis/duration" element={<CampaignDurationReport />} />
              <Route path="/reports/marketing/analysis/ab" element={<ABCampaignComparison />} />
              <Route path="/reports/marketing/operational/response-time" element={<ResponseTimeReport />} />
            </Route>


            <Route element={<ProtectedModuleRoute moduleKey="settings" />}> 
              <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/profile/company" element={<CompanySettings />} />
              
              <Route path="/settings/system/modules" element={<ModulesSettings />} />
              <Route path="/settings/system/security" element={<SecuritySettings />} />
              <Route path="/settings/system/crm" element={<CRMSettings />} />
              <Route path="/settings/system/custom-fields" element={<CustomFields />} />
              <Route path="/settings/system/sources" element={<Sources />} />
              <Route path="/settings/system/locations/country" element={<Country />} />
              <Route path="/settings/system/locations/cities" element={<Cities />} />
              <Route path="/settings/system/locations/regions" element={<Regions />} />
              <Route path="/settings/system/locations/area" element={<Area />} />
              <Route path="/settings/system/form-inputs/leads" element={<AddLeadInputs />} />
              <Route path="/settings/system/form-inputs/customers" element={<AddCustomerInputs />} />
              <Route path="/settings/system/form-inputs/items" element={<AddItemInputs />} />
              <Route path="/settings/system/form-inputs/properties" element={<AddPropertiesInputs />} />
              <Route path="/settings/system/form-inputs/brokers" element={<AddBrokerInputs />} />
              <Route path="/settings/system/audit-logs" element={<AuditLogs />} />
              
              <Route path="/settings/notifications" element={<Navigate to="/settings/notifications/general" replace />} />
              <Route path="/settings/notifications/general" element={<NotificationsSettings />} />
              <Route path="/settings/notifications/sms-templates" element={<SettingsSms />} />
              <Route path="/settings/notifications/email-settings" element={<SettingsEmail />} />
              <Route path="/settings/notifications/whatsapp-templates" element={<WhatsAppIntegration />} />

              <Route path="/settings/configuration" element={<SettingsConfiguration />} />
              <Route path="/settings/tenant-setup" element={<Navigate to="/system/tenants" replace />} />
              <Route path="/cancel-reasons" element={<CancelReasons />} />
              <Route path="/settings/configuration/payment-plans" element={<PaymentPlans />} />

              <Route path="/settings/company-setup" element={<Navigate to="/settings/company-setup/info" replace />} />
              <Route path="/settings/company-setup/info" element={<Suspense fallback={<div className="p-4 text-sm">Loading…</div>}><CompanyInfoPage /></Suspense>} />
              <Route path="/settings/company-setup/subscription" element={<Suspense fallback={<div className="p-4 text-sm">Loading…</div>}><SubscriptionPage /></Suspense>} />
              <Route path="/settings/company-setup/modules" element={<Suspense fallback={<div className="p-4 text-sm">Loading…</div>}><ModulesPage /></Suspense>} />
              <Route path="/settings/company-setup/departments" element={<Suspense fallback={<div className="p-4 text-sm">Loading…</div>}><DepartmentsPage /></Suspense>} />
              <Route path="/settings/company-setup/visibility" element={<Suspense fallback={<div className="p-4 text-sm">Loading…</div>}><VisibilityPage /></Suspense>} />

              <Route element={<BillingAdminRoute />}> <Route path="/settings/billing/subscription" element={<BillingSubscription />} /> </Route>
              <Route path="/settings/billing/payment-history" element={<PaymentHistory />} />
              <Route path="/settings/billing/plans-upgrade" element={<PlansUpgrade />} />
              <Route path="/settings/integrations/api-keys" element={<APIKeys />} />
              <Route path="/settings/integrations/erp" element={<ERPIntegrations />} />
              <Route path="/settings/integrations/webhooks" element={<Webhooks />} />
              <Route path="/settings/integrations/whatsapp" element={<WhatsAppIntegration />} />
              <Route path="/settings/integrations/payment-gateway" element={<PaymentGatewayIntegration />} />
              <Route path="/settings/integrations/google-slack" element={<GoogleSlackIntegrations />} />
              <Route path="/settings/data/import" element={<ImportDM />} />
              <Route path="/settings/data/export" element={<ExportDM />} />
              <Route path="/settings/data/backup" element={<Backup />} />
              <Route path="/settings/operations/scripting" element={<Scripting />} />
              <Route path="/settings/operations/eoi" element={<EOISettings />} />
              <Route path="/settings/operations/reservation" element={<ReservationSettings />} />
              <Route path="/settings/operations/rotation" element={<RotationSettings />} />
              <Route path="/settings/operations/contracts" element={<ContractsSettings />} />
              <Route path="/settings/operations/buyer-request-reset" element={<BuyerRequestReset />} />
              <Route path="/settings/operations/matching" element={<MatchingSettings />} />
              <Route path="/settings/operations/rent" element={<RentConfiguration />} />
            </Route>

            {/* User Management */}
            <Route path="/user-management/users" element={<UserManagementUsers />} />
            <Route path="/user-management/users/new" element={<UserManagementUserCreate />} />
            <Route path="/user-management/users/:id" element={<UserManagementUserProfile />} />
            
            <Route path="/user-management/departments" element={<UserManagementDepartments />} />
            {/* <Route path="/user-management/departments/new" element={<UserManagementDepartmentForm />} /> */}
            <Route path="/user-management/departments/:id" element={<UserManagementDepartmentDetails />} />
            {/* <Route path="/user-management/departments/:id/edit" element={<UserManagementDepartmentForm />} /> */}

            <Route path="/user-management/activity-logs" element={<UserManagementActivityLogs />} />
            <Route path="/user-management/access-logs" element={<UserManagementAccessLogs />} />

            <Route path="/contact" element={<ContactUs />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          {/* Super Admin Routes - Completely Separated Layout */}
          <Route element={<SuperAdminLayout />}>
            <Route element={<SuperAdminRoute />}>
              <Route path="/system" element={<Navigate to="/system/dashboard" replace />} />
              <Route path="/system/dashboard" element={<SystemAdminDashboard />} />
              <Route path="/system/tenants" element={<TenantSetup />} />
              
              {/* Mapped Routes for Sidebar Items */}
              <Route path="/system/subscriptions" element={<TenantSetup section="subscriptions" />} />
              <Route path="/system/modules" element={<TenantSetup section="modules" />} />
              <Route path="/system/settings" element={<TenantSetup section="admin-settings" />} />
              
              <Route path="/system/integrations" element={<SystemIntegrations />} />
              <Route path="/system/error-log" element={<SystemErrorLog />} />
              <Route path="/system/backup" element={<Backup />} />
              <Route path="/system/transactions" element={<InventoryTransactions />} />
              
              {/* Profile & Tasks for Super Admin */}
              <Route path="/system/profile" element={<ProfileSettings />} />
              <Route path="/system/security" element={<SecuritySettings />} />
              <Route path="/system/tasks" element={<Tasks />} />
            </Route>
          </Route>
        </Route>

        {/* Public Landing Pages - Must be last to avoid conflicts */}
        <Route path="/:slug" element={<LandingPageViewer />} />
      </Routes>
      </Suspense>
    </div>
  )
}
