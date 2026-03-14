import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { api as axios } from '@utils/api';
import { useAppState } from '../../shared/context/AppStateProvider';
import { useTheme } from '../../shared/context/ThemeProvider';
import {
  Plus, 
  Filter, 
  Search, 
  Users, 
  DatabaseBackup, 
  List, 
  Key, 
  Eye, 
  Activity, 
  Edit, 
  XCircle,
  Building,
  Calendar,
  X 
} from 'lucide-react';



// Plan Definitions
const PLANS = [
  { id: 'core', name: 'Core System', modules: ['dashboard', 'reports', 'users', 'settings'] },
  { id: 'basic', name: 'Basic', modules: ['leads', 'inventory', 'campaigns', 'users'] },
  { id: 'professional', name: 'Professional', modules: ['leads', 'inventory', 'campaigns', 'customers', 'users'] },
  { id: 'enterprise', name: 'Enterprise', modules: ['leads', 'inventory', 'campaigns', 'customers', 'support', 'users'] },
  { id: 'custom', name: 'Custom Plan', modules: [] }
];

const AVAILABLE_MODULES = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'leads', name: 'Leads Management' },
  { id: 'inventory', name: 'Inventory' },
  { id: 'campaigns', name: 'Marketing Campaigns' },
  { id: 'customers', name: 'Customers' },
  { id: 'support', name: 'Support Tickets' },
  { id: 'users', name: 'User Management' },
  { id: 'reports', name: 'Reports' },
  { id: 'settings', name: 'Settings' },
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

const TenantSetup = () => {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const { t } = useTranslation();
  const { user, fetchCompanyInfo } = useAppState();
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // List View State
  const [tenants, setTenants] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    plan: 'all',
    status: 'all',
    company_type: 'all',
    users_count: '',
    start_date: '',
    end_date: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0
  });

  // Edit State
  const [editingTenant, setEditingTenant] = useState(null);
  const [previewTenant, setPreviewTenant] = useState(null);
  const [statusTenant, setStatusTenant] = useState(null);
  const [backupTenant, setBackupTenant] = useState(null);
  const [backupItems, setBackupItems] = useState([]);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [startingBackup, setStartingBackup] = useState(false);
  const [backupsPage, setBackupsPage] = useState(1);

  // Fetch Tenants
  const fetchTenants = async (page = 1) => {
    setLoadingList(true);
    try {
      const params = {
        page,
        ...filters
      };
      // Clean up 'all' and empty filters
      if (params.plan === 'all') delete params.plan;
      if (params.status === 'all') delete params.status;
      if (params.company_type === 'all') delete params.company_type;
      if (!params.users_count) delete params.users_count;
      if (!params.start_date) delete params.start_date;
      if (!params.end_date) delete params.end_date;

      const response = await axios.get('/api/super-admin/tenants', { params });
      setTenants(response.data.tenants.data);
      setPagination({
        current_page: response.data.tenants.current_page,
        last_page: response.data.tenants.last_page,
        total: response.data.tenants.total
      });
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      toast.error(t('failed_fetch_tenants', 'Failed to load subscription plans'));
    } finally {
      setLoadingList(false);
    }
  };

  const handleLoginAsTenant = async (tenant) => {
    try {
      const impersonateResponse = await axios.post(`/api/super-admin/impersonate/${tenant.id}`)
      const apiTenant = impersonateResponse?.data?.tenant || {}

      const slug =
        apiTenant.slug ||
        tenant.slug ||
        (tenant.domain ? tenant.domain.split('.')[0] : null)

      if (!slug) {
        toast.error(t('tenant_missing_slug', 'Tenant is missing slug'))
        return
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('impersonateTenantSlug', slug)
      }

      await fetchCompanyInfo()
      toast.success(t('logged_in_as_tenant', 'You are now viewing this tenant workspace'))

      if (typeof window !== 'undefined') {
        window.location.hash = '#/dashboard'
      }
    } catch (error) {
      console.error('Failed to login as tenant:', error)
      toast.error(t('failed_login_as_tenant', 'Failed to login as tenant'))
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [
    filters.search,
    filters.plan,
    filters.status,
    filters.company_type,
    filters.users_count,
    filters.start_date,
    filters.end_date
  ]);

  // Actions
  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
  };

  const handleCancelSubscription = async (tenant) => {
    if (!window.confirm(t('confirm_cancel_subscription', 'Are you sure you want to cancel this subscription?'))) {
      return;
    }
    try {
      await axios.put(`/api/super-admin/tenants/${tenant.id}`, { status: 'cancelled' });
      toast.success(t('subscription_cancelled', 'Subscription cancelled successfully'));
      fetchTenants(pagination.current_page);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error(t('failed_cancel_subscription', 'Failed to cancel subscription'));
    }
  };

  const handleBackupNow = async (tenant) => {
    if (tenant.tenancy_type !== 'dedicated') {
      toast.error(t('backup_only_dedicated', 'Backups are currently supported only for dedicated tenants'));
      return;
    }
    try {
      setStartingBackup(true);
      await axios.post(`/api/super-admin/tenants/${tenant.id}/backups`);
      toast.success(t('backup_started', 'Backup started'));
      fetchTenants(pagination.current_page);
      if (backupTenant && backupTenant.id === tenant.id) {
        loadBackups(tenant, backupsPage);
      }
    } catch (error) {
      console.error('Failed to start backup:', error);
      toast.error(t('backup_failed', 'Failed to start backup'));
    } finally {
      setStartingBackup(false);
    }
  };

  const loadBackups = async (tenant, page = 1) => {
    try {
      setLoadingBackup(true);
      const resp = await axios.get(`/api/super-admin/tenants/${tenant.id}/backups`, {
        params: { page }
      });
      setBackupItems(resp.data.data || []);
      setBackupsPage(resp.data.current_page || 1);
    } catch (error) {
      console.error('Failed to load backups:', error);
      toast.error(t('failed_load_backups', 'Failed to load backups'));
    } finally {
      setLoadingBackup(false);
    }
  };

  const openBackupsModal = async (tenant) => {
    setBackupTenant(tenant);
    setBackupItems([]);
    await loadBackups(tenant, 1);
  };

  const handleUpdateTenant = async (data) => {
    try {
      await axios.put(`/api/super-admin/tenants/${editingTenant.id}`, data);
      toast.success(t('tenant_updated_successfully', 'Tenant updated successfully'));
      setEditingTenant(null);
      fetchTenants(pagination.current_page);
    } catch (error) {
      console.error('Failed to update tenant:', error);
      toast.error(t('failed_update_tenant', 'Failed to update tenant'));
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await axios.put(`/api/super-admin/tenants/${statusTenant.id}`, { status });
      toast.success(t('status_updated_successfully', 'Status updated successfully'));
      setStatusTenant(null);
      fetchTenants(pagination.current_page);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error(t('failed_update_status', 'Failed to update status'));
    }
  };

  // Create Form State
  const [loadingCreate, setLoadingCreate] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm();
  const domainSuffix = '.besouholacrm.net';
  const selectedPlan = watch('plan');
  const isLifetime = watch('is_lifetime');
  const tenancyType = watch('tenancy_type');
  const [customModules, setCustomModules] = useState([]);

  const handleModuleToggle = (moduleId) => {
    setCustomModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const onCreateSubmit = async (data) => {
    setLoadingCreate(true);
    try {
      // Map UI modules to Backend slugs
      let finalModules = [];
      if (data.plan === 'custom') {
        const companyType = data.company_type || 'General';
        const mappedModules = customModules.flatMap(m => {
          if (m === 'inventory') {
             if (companyType === 'Real Estate') {
                 return ['projects', 'properties', 'developers', 'brokers', 'requests'];
             }
             return ['items', 'orders'];
          }
          if (m === 'sales') return ['orders'];
          return [m];
        });
        finalModules = [...new Set(mappedModules)]; // Remove duplicates
      }

      const isLifetimeValue = !!data.is_lifetime;

      const payload = {
        name: data.company_name,
        slug: data.slug,
        domain: `${data.slug}${domainSuffix}`,
        tenancy_type: data.tenancy_type || 'shared',
        admin_name: data.admin_name,
        admin_email: data.admin_email,
        admin_password: data.password,
        plan: data.plan || 'core',
        modules: data.plan === 'custom' ? finalModules : [],
        company_type: data.company_type || 'General',
        users_limit: data.users_limit || undefined,
        start_date: data.start_date || undefined,
        end_date: isLifetimeValue ? undefined : (data.end_date || undefined),
        is_lifetime: isLifetimeValue,
        country: data.country,
        address_line_1: data.address_line_1,
        city: data.city,
        state: data.state,
      };

      const response = await axios.post('/api/super-admin/tenants', payload);

      toast.success(t('tenant_created_successfully', 'Tenant created successfully!'));
      const fullUrl = payload.domain.startsWith('http')
        ? payload.domain
        : `http://${payload.domain}`;
      toast.success(`URL: ${fullUrl}`, { duration: 6000 });

      reset();
      setShowCreateModal(false);
      fetchTenants();
    } catch (error) {
      console.error('Tenant creation failed:', error);
      if (error.response?.data?.errors) {
        Object.values(error.response.data.errors).flat().forEach(msg => toast.error(msg));
      } else {
        toast.error(t('tenant_creation_failed', 'Failed to create tenant.'));
      }
    } finally {
      setLoadingCreate(false);
    }
  };

  const isModalOpen = editingTenant || previewTenant || statusTenant || showCreateModal;

  if (!user?.is_super_admin) {
    return (
      <div className="p-8 text-center text-red-500">
        {t('unauthorized_access', 'Unauthorized Access')}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {!isModalOpen && (
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-theme">
            {t('subscription_plans', 'tenant management')}
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none gap-2"
          >
            <Plus size={14} className="w-3 h-3" />
            <span className="text-white">{t('create_new', 'Create New')}</span>
          </button>
        </div>
      )}

        <div className="card rounded-lg shadow">
          {/* Filters */}
          <div className="p-4">
            <div className="glass-panel rounded-2xl p-3 filters-compact">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                  <Filter size={16} className="text-blue-500 dark:text-blue-400" /> {t('Filters')}
                </h2>
                <button
                  onClick={() => {
                    setFilters({
                      search: '',
                      plan: 'all',
                      status: 'all',
                      company_type: 'all',
                      users_count: '',
                      start_date: '',
                      end_date: ''
                    });
                  }}
                  className="px-3 py-1.5 text-sm dark:text-white hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  {t('Reset')}
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className={`flex items-center gap-1 text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                      <Search className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                      {t('search_company', 'Search')}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme w-4 h-4" />
                      <input
                        type="text"
                        placeholder={t('search_company', 'Search by Company Name...')}
                        className="w-full pl-9 pr-4 py-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-blue-500 focus:border-blue-500"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={`block text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                      {t('plan_type', 'Plan Type')}
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md bg-transparent dark:border-gray-600 text-theme text-sm dark:text-white"
                      value={filters.plan}
                      onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                    >
                      <option value="all">{t('all_plans', 'All Plans')}</option>
                      {PLANS.map(p => (
                        <option key={p.id} value={p.id}>{t(p.name)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`block text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                      {t('status', 'Status')}
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md bg-transparent dark:border-gray-600 text-sm dark:text-white"
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                      <option value="all">{t('all_statuses', 'All Statuses')}</option>
                      <option value="active">{t('active', 'Active')}</option>
                      <option value="pending">{t('pending', 'Pending')}</option>
                      <option value="expired">{t('expired', 'Expired')}</option>
                      <option value="cancelled">{t('cancelled', 'Cancelled')}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`block text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                      {t('company_type', 'Company Type')}
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md bg-transparent dark:border-gray-600 text-sm dark:text-white"
                      value={filters.company_type}
                      onChange={(e) => setFilters({ ...filters, company_type: e.target.value })}
                    >
                      <option value="all">{t('all_company_types', 'All Company Types')}</option>
                      <option value="General">{t('General')}</option>
                      <option value="Real Estate">{t('Real Estate')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className={`block text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                      {t('users_count', 'Users Count')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border rounded-md bg-transparent dark:border-gray-600 dark:text-white text-sm"
                      placeholder={t('users_count', 'Users Count')}
                      value={filters.users_count}
                      onChange={(e) => setFilters({ ...filters, users_count: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`block text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                      {t('start_date', 'Start Date')}
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-md bg-transparent dark:border-gray-600 dark:text-white text-sm"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`block text-xs font-medium ${isLight ? 'text-black' : 'text-white'} dark:text-white`}>
                      {t('end_date', 'End Date')}
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-md bg-transparent dark:border-gray-600 dark:text-white text-sm"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-700/50 text-white text-sm uppercase">
                  <th className="p-4 font-semibold">{t('customer_name', 'Customer Name')}</th>
                  <th className="p-4 font-semibold">{t('plan_type', 'Plan Type')}</th>
                  <th className="p-4 font-semibold">{t('company_type', 'Company Type')}</th>
                  <th className="p-4 font-semibold">{t('tenancy_type', 'Tenancy Type')}</th>
                  <th className="p-4 font-semibold text-center">{t('users', 'Users')}</th>
                  <th className="p-4 font-semibold">{t('start_date', 'Start Date')}</th>
                  <th className="p-4 font-semibold">{t('end_date', 'End Date')}</th>
                  <th className="p-4 font-semibold">{t('last_backup_at', 'Last Backup')}</th>
                  <th className="p-4 font-semibold">{t('last_backup_status', 'Backup Status')}</th>
                  <th className="p-4 font-semibold">{t('status', 'Status')}</th>
                  <th className="p-4 font-semibold text-right">{t('actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loadingList ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-theme">
                      {t('loading', 'Loading...')}
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-theme">
                      {t('no_tenants_found', 'No subscriptions found.')}
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-theme">{tenant.name}</div>
                        <div className="text-xs text-theme">{tenant.domain || tenant.slug}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 uppercase">
                          {t(PLANS.find(p => p.id === tenant.subscription_plan)?.name || tenant.subscription_plan || 'N/A')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-theme">
                        {t(tenant.company_type) || '-'}
                      </td>
                      <td className="p-4 text-sm text-theme">
                        {t(tenant.tenancy_type || 'shared')}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center text-theme">
                          <Users size={14} className="mr-1" />
                          {tenant.users_count} / {tenant.users_limit}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-theme">
                        {tenant.start_date ? new Date(tenant.start_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4 text-sm text-theme">
                        {tenant.meta_data?.subscription?.is_lifetime ? t('Lifetime') : (tenant.end_date ? new Date(tenant.end_date).toLocaleDateString() : '-')}
                      </td>
                      <td className="p-4 text-sm text-theme">
                        {tenant.last_backup_at ? new Date(tenant.last_backup_at).toLocaleString() : '-'}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={tenant.last_backup_status || 'unknown'} />
                      </td>
                      <td className="p-4">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            className={`text-theme ${tenant.tenancy_type !== 'dedicated' ? 'opacity-40 cursor-not-allowed' : 'hover:text-green-500'}`}
                            title={
                              tenant.tenancy_type !== 'dedicated'
                                ? t('backup_only_dedicated', 'Only for dedicated tenants')
                                : t('backup_now', 'Backup Now')
                            }
                            onClick={() => tenant.tenancy_type === 'dedicated' && handleBackupNow(tenant)}
                            disabled={
                              tenant.tenancy_type !== 'dedicated' ||
                              (startingBackup && backupTenant && backupTenant.id === tenant.id)
                            }
                          >
                            <DatabaseBackup size={18} />
                          </button>
                          <button
                            className="text-theme hover:text-cyan-400"
                            title={t('view_backups', 'View Backups')}
                            onClick={() => openBackupsModal(tenant)}
                          >
                            <List size={18} />
                          </button>
                          <button 
                            className="text-theme hover:text-emerald-600" 
                            title={t('login_as_tenant', 'Login as tenant')}
                            onClick={() => handleLoginAsTenant(tenant)}
                          >
                            <Key size={18} />
                          </button>
                          <button 
                            className="text-theme hover:text-blue-500" 
                            title={t('preview', 'Preview')}
                            onClick={() => setPreviewTenant(tenant)}
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            className="text-theme hover:text-purple-500" 
                            title={t('change_status', 'Change Status')}
                            onClick={() => setStatusTenant(tenant)}
                          >
                            <Activity size={18} />
                          </button>
                          <button 
                            className="text-theme hover:text-blue-600" 
                            title={t('edit', 'Edit')}
                            onClick={() => handleEdit(tenant)}
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            className="text-theme hover:text-red-600" 
                            title={t('cancel', 'Cancel')}
                            onClick={() => handleCancelSubscription(tenant)}
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {loadingList ? (
              <div className="p-6 text-center text-theme">
                {t('loading', 'Loading...')}
              </div>
            ) : tenants.length === 0 ? (
              <div className="p-6 text-center text-theme">
                {t('no_tenants_found', 'No subscriptions found.')}
              </div>
            ) : (
              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-theme">{tenant.name}</div>
                        <div className="text-xs text-theme">{tenant.domain || tenant.slug}</div>
                      </div>
                      <StatusBadge status={tenant.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-theme">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{t('plan_type', 'Plan')}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 uppercase">
                          {t(PLANS.find(p => p.id === tenant.subscription_plan)?.name || tenant.subscription_plan || 'N/A')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building size={12} className="text-theme" />
                        <span>{t(tenant.company_type) || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={12} className="text-theme" />
                        <span>{tenant.users_count} / {tenant.users_limit}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-theme" />
                        <span>{tenant.start_date ? new Date(tenant.start_date).toLocaleDateString() : '-'}</span>
                      </div>
                      <div className="flex items-center gap-1 col-span-2">
                        <Calendar size={12} className="text-theme" />
                        <span>{tenant.meta_data?.subscription?.is_lifetime ? t('Lifetime') : (tenant.end_date ? new Date(tenant.end_date).toLocaleDateString() : '-')}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        className={`text-theme ${tenant.tenancy_type !== 'dedicated' ? 'opacity-40 cursor-not-allowed' : 'hover:text-green-500'}`}
                        title={
                          tenant.tenancy_type !== 'dedicated'
                            ? t('backup_only_dedicated', 'Only for dedicated tenants')
                            : t('backup_now', 'Backup Now')
                        }
                        onClick={() => tenant.tenancy_type === 'dedicated' && handleBackupNow(tenant)}
                        disabled={
                          tenant.tenancy_type !== 'dedicated' ||
                          (startingBackup && backupTenant && backupTenant.id === tenant.id)
                        }
                      >
                        <DatabaseBackup size={18} />
                      </button>
                      <button
                        className="text-theme hover:text-cyan-400"
                        title={t('view_backups', 'View Backups')}
                        onClick={() => openBackupsModal(tenant)}
                      >
                        <List size={18} />
                      </button>
                      <button
                        className="text-theme hover:text-emerald-600"
                        title={t('login_as_tenant', 'Login as tenant')}
                        onClick={() => handleLoginAsTenant(tenant)}
                      >
                        <Key size={18} />
                      </button>
                      <button
                        className="text-theme hover:text-blue-500"
                        title={t('preview', 'Preview')}
                        onClick={() => setPreviewTenant(tenant)}
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        className="text-theme hover:text-purple-500"
                        title={t('change_status', 'Change Status')}
                        onClick={() => setStatusTenant(tenant)}
                      >
                        <Activity size={18} />
                      </button>
                      <button
                        className="text-theme hover:text-blue-600"
                        title={t('edit', 'Edit')}
                        onClick={() => handleEdit(tenant)}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        className="text-theme hover:text-red-600"
                        title={t('cancel', 'Cancel')}
                        onClick={() => handleCancelSubscription(tenant)}
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.last_page > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
              <button 
                disabled={pagination.current_page === 1}
                onClick={() => fetchTenants(pagination.current_page - 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                {t('previous', 'Previous')}
              </button>
              <span className="px-3 py-1 text-theme">
                {pagination.current_page} / {pagination.last_page}
              </span>
              <button 
                disabled={pagination.current_page === pagination.last_page}
                onClick={() => fetchTenants(pagination.current_page + 1)}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                {t('next', 'Next')}
              </button>
            </div>
          )}
        </div>

      {backupTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4">
          <div className="card rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {t('tenant_backups', 'Tenant Backups')} – {backupTenant.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setBackupTenant(null);
                  setBackupItems([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-theme">
                  {t('backup_hint', 'Backups are currently available for dedicated tenants database only.')}
                </div>
                <button
                  type="button"
                  onClick={() => handleBackupNow(backupTenant)}
                  className="px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-50"
                  disabled={startingBackup}
                >
                  {startingBackup
                    ? t('backup_in_progress', 'Backup in progress…')
                    : t('backup_now', 'Backup Now')}
                </button>
              </div>
              {loadingBackup ? (
                <div className="p-6 text-center text-theme">
                  {t('loading', 'Loading...')}
                </div>
              ) : backupItems.length === 0 ? (
                <div className="p-6 text-center text-theme">
                  {t('no_backups_found', 'No backups found for this tenant yet.')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-700/50 text-white text-xs uppercase">
                        <th className="p-3 text-left">{t('status', 'Status')}</th>
                        <th className="p-3 text-left">{t('date', 'Date')}</th>
                        <th className="p-3 text-left">{t('size', 'Size')}</th>
                        <th className="p-3 text-left">{t('disk', 'Disk')}</th>
                        <th className="p-3 text-left">{t('actions', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backupItems.map((b) => (
                        <tr key={b.id} className="border-t border-gray-700/40">
                          <td className="p-3">
                            <span className="text-xs font-medium">
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3">
                            {b.finished_at
                              ? new Date(b.finished_at).toLocaleString()
                              : b.started_at
                                ? new Date(b.started_at).toLocaleString()
                                : '-'}
                          </td>
                          <td className="p-3">
                            {b.size_bytes
                              ? `${Math.round(b.size_bytes / 1024 / 1024)} MB`
                              : '-'}
                          </td>
                          <td className="p-3">
                            {b.disk}
                          </td>
                          <td className="p-3">
                            {b.status === 'success' && b.path && (
                              <a
                                href={`/api/super-admin/tenants/${backupTenant.id}/backups/${b.id}/download`}
                                className="text-blue-400 hover:underline text-xs"
                              >
                                {t('download', 'Download')}
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4">
          <div className="card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {t('create_tenant_subscription', 'Create Tenant Subscription')}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onCreateSubmit)} className="p-6 space-y-6">
            {/* Form Content */}
            <h2 className="text-lg font-semibold mb-4 text-theme border-b pb-2">
              {t('company_details', 'Company Details')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('company_name', 'Company Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('company_name', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('enter_company_name', 'Enter Company Name')}
                />
                {errors.company_name && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('company_type', 'Company Type')} <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('company_type', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="General">{t('General')}</option>
                  <option value="Real Estate">{t('Real Estate')}</option>
                </select>
                {errors.company_type && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('tenancy_type', 'Tenancy Type')} <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('tenancy_type', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="shared">{t('shared', 'Shared')}</option>
                  <option value="dedicated">{t('dedicated', 'Dedicated')}</option>
                </select>
                {errors.tenancy_type && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('subdomain', 'Subdomain')} <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <input
                    type="text"
                    {...register('slug', { 
                      required: true,
                      pattern: /^[a-z0-9\-]+$/ 
                    })}
                    className="flex-1 px-4 py-2 border rounded-l-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    placeholder="company-slug"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 dark:bg-gray-600 dark:border-gray-600 text-gray-500 dark:text-gray-300 text-sm">
                    {domainSuffix}
                  </span>
                </div>
                {errors.slug && <span className="text-red-500 text-xs">{t('invalid_slug', 'Invalid slug')}</span>}
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-4 mt-6 text-theme border-b pb-2">
              {t('location_details', 'Location Details')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('country', 'Country')} <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('country', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('select_country', 'Select Country')}</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {errors.country && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('city', 'City')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('city', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.city && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('address_line_1', 'Address Line 1')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('address_line_1', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('enter_address', 'Enter street address')}
                />
                {errors.address_line_1 && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('state_province', 'State / Province')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('state', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.state && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-4 mt-6 text-theme border-b pb-2">
              {t('admin_account', 'Admin Account')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('admin_name', 'Admin Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('admin_name', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('admin_email', 'Admin Email')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('admin_email', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('password', 'Password')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('password', { required: true, minLength: 8 })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('confirm_password', 'Confirm Password')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('password_confirmation', { 
                    required: true,
                    validate: val => val === watch('password') || t('passwords_mismatch', 'Passwords do not match')
                  })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-4 mt-6 text-theme border-b pb-2">
              {t('subscription_details', 'Subscription Details')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('number_of_users', 'Number of Users')}
                </label>
                <input
                  type="number"
                  {...register('users_limit', { min: 1 })}
                  defaultValue={5}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('start_date', 'Start Date')}
                </label>
                <input
                  type="date"
                  {...register('start_date')}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('end_date', 'End Date')}
                </label>
                <input
                  type="date"
                  {...register('end_date')}
                  disabled={isLifetime}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register('is_lifetime')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-theme">
                    {t('lifetime_subscription', 'Lifetime subscription')}
                  </span>
                </div>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-4 mt-6 text-theme border-b pb-2">
              {t('select_plan', 'Select Plan')}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {PLANS.map((plan) => (
                <label key={plan.id} className={`relative flex flex-col p-4 border rounded-lg cursor-pointer hover:bg-gray-700 transition-all ${selectedPlan === plan.id ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      value={plan.id}
                      {...register('plan')}
                      defaultChecked={plan.id === 'core'}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-3 font-bold text-theme">
                      {t(plan.name)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 ml-7">
                    {plan.modules.length > 0 ? plan.modules.map(m => t(m.charAt(0).toUpperCase() + m.slice(1))).join(', ') : t('Flexible Selection')}
                  </p>
                </label>
              ))}
            </div>

            {selectedPlan === 'custom' && (
              <div className="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-theme mb-3">{t('select_modules', 'Select Modules')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_MODULES.map(module => (
                    <label key={module.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customModules.includes(module.id)}
                        onChange={() => handleModuleToggle(module.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-theme">{t(module.name)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loadingCreate}
                className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loadingCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loadingCreate ? t('creating', 'Creating...') : t('create_tenant', 'Create Tenant')}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {editingTenant && (
        <EditTenantModal 
          tenant={editingTenant} 
          onClose={() => setEditingTenant(null)} 
          onSave={handleUpdateTenant} 
        />
      )}

      {previewTenant && (
        <PreviewTenantModal 
          tenant={previewTenant} 
          onClose={() => setPreviewTenant(null)} 
        />
      )}

      {statusTenant && (
        <ChangeStatusModal 
          tenant={statusTenant} 
          onClose={() => setStatusTenant(null)} 
          onSave={handleUpdateStatus} 
        />
      )}
    </div>
  );
};

const PreviewTenantModal = ({ tenant, onClose }) => {
  const { t } = useTranslation();
  const plan = PLANS.find(p => p.id === tenant.subscription_plan) || { name: tenant.subscription_plan };
  const isLifetime =
    tenant?.meta_data &&
    tenant.meta_data.subscription &&
    tenant.meta_data.subscription.is_lifetime;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4">
      <div className="card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center  bg-transparent z-10">
          <h3 className="text-lg font-bold text-theme">
            {t('subscription_preview', 'Subscription Preview')} - {tenant.name}
          </h3>
          <button onClick={onClose} className="text-theme hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Company Details */}
          <div>
            <h4 className="text-md font-semibold text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
              {t('company_details', 'Company Details')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('company_name', 'Company Name')}</span>
                <span className="font-medium text-theme">{tenant.name}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('company_type', 'Company Type')}</span>
                <span className="font-medium text-theme">{tenant.company_type || '-'}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('tenancy_type', 'Tenancy Type')}</span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                    (tenant.tenancy_type || 'shared') === 'dedicated'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  {t(tenant.tenancy_type || 'shared')}
                </span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('subdomain', 'Subdomain')}</span>
                <span className="font-medium text-theme">{tenant.domain || `${tenant.slug}.besouholacrm.net`}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('created_at', 'Created At')}</span>
                <span className="font-medium text-theme">{new Date(tenant.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div>
            <h4 className="text-md font-semibold text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
              {t('location_details', 'Location Details')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('country', 'Country')}</span>
                <span className="font-medium text-theme">{tenant.country || '-'}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('city', 'City')}</span>
                <span className="font-medium text-theme">{tenant.city || '-'}</span>
              </div>
              <div className="md:col-span-2">
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('address', 'Address')}</span>
                <span className="font-medium text-theme">
                  {[tenant.address_line_1, tenant.state].filter(Boolean).join(', ') || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Admin Account */}
          <div>
            <h4 className="text-md font-semibold text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
              {t('admin_account', 'Admin Account')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('admin_name', 'Admin Name')}</span>
                <span className="font-medium text-theme">
                  {tenant.admin_name || (tenant.owner ? tenant.owner.name : '-')}
                </span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('admin_email', 'Admin Email')}</span>
                <span className="font-medium text-theme">
                  {tenant.admin_email || (tenant.owner ? tenant.owner.email : '-')}
                </span>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          <div>
            <h4 className="text-md font-semibold text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
              {t('subscription_details', 'Subscription Details')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('plan', 'Plan')}</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 uppercase inline-block mt-1">
                  {t(plan.name)}
                </span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('status', 'Status')}</span>
                <div className="mt-1"><StatusBadge status={tenant.status} /></div>
              </div>
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('users_limit', 'Users Limit')}</span>
                <span className="font-medium text-theme">{tenant.users_limit}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('start_date', 'Start Date')}</span>
                <span className="font-medium text-theme">{tenant.start_date ? new Date(tenant.start_date).toLocaleDateString() : '-'}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-400 dark:text-gray-400">{t('end_date', 'End Date')}</span>
                <span className="font-medium text-theme">
                  {isLifetime
                    ? t('lifetime_subscription', 'Lifetime subscription')
                    : tenant.end_date
                      ? new Date(tenant.end_date).toLocaleDateString()
                      : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Modules */}
          {tenant.modules && tenant.modules.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                {t('modules', 'Modules')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {tenant.modules.map((module, index) => (
                  <span key={index} className="px-3 py-1 bg-gray-700/50 text-theme rounded-full text-sm">
                    {t(module.slug || module)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-700  dark:hover:bg-gray-600"
          >
            {t('close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

const ChangeStatusModal = ({ tenant, onClose, onSave }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState(tenant.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">
            {t('change_status', 'Change Status')}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('change_status_desc', 'Select the new status for')} <span className="font-semibold text-gray-900 dark:text-white">{tenant.name}</span>
          </p>
          <div className="space-y-2">
            {['active', 'pending', 'expired', 'cancelled'].map((s) => (
              <label key={s} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${status === s ? 'ring-2 ring-blue-500 border-transparent bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={status === s}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 font-medium text-gray-900 dark:text-white capitalize">{t(s)}</span>
                <span className="ml-auto">
                   <StatusBadge status={s} />
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button 
            onClick={() => onSave(status)}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {t('save', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditTenantModal = ({ tenant, onClose, onSave }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const domainSuffix = '.besouholacrm.net';
  
  // Custom Modules State
  const [customModules, setCustomModules] = useState(
    tenant.subscription_plan === 'custom' && tenant.modules 
      ? tenant.modules.map(m => typeof m === 'string' ? m : m.slug || m)
      : []
  );

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      company_name: tenant.name,
      company_type: tenant.company_type || 'General',
      slug: tenant.slug || (tenant.domain ? tenant.domain.split('.')[0] : ''),
      country: tenant.country,
      city: tenant.city,
      address_line_1: tenant.address_line_1,
      state: tenant.state,
      admin_name: tenant.admin_name || (tenant.owner?.name),
      admin_email: tenant.admin_email || (tenant.owner?.email),
      users_limit: tenant.users_limit,
      start_date: tenant.start_date ? tenant.start_date.split('T')[0] : '',
      end_date: tenant.end_date ? tenant.end_date.split('T')[0] : '',
      plan: tenant.subscription_plan || 'core',
      status: tenant.status,
      is_lifetime: tenant.meta_data?.subscription?.is_lifetime || false
    }
  });

  const selectedPlan = watch('plan');
  const isLifetime = watch('is_lifetime');
  const password = watch('password');

  const handleModuleToggle = (moduleId) => {
    setCustomModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Process modules
      let finalModules = [];
      if (data.plan === 'custom') {
        const companyType = data.company_type || 'General';
        const mappedModules = customModules.flatMap(m => {
          if (m === 'inventory') {
             if (companyType === 'Real Estate') {
                 return ['projects', 'properties', 'developers', 'brokers', 'requests'];
             }
             return ['items', 'orders'];
          }
          if (m === 'sales') return ['orders'];
          return [m];
        });
        finalModules = [...new Set(mappedModules)];
      }

      const payload = {
        ...data,
        modules: data.plan === 'custom' ? finalModules : [],
        subscription_plan: data.plan || tenant.subscription_plan,
      };
      
      delete payload.plan;
      
      // Remove empty password fields if not changing
      if (!payload.password) delete payload.password;
      if (!payload.password_confirmation) delete payload.password_confirmation;

      await onSave(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4">
      <div className="card rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-lg font-bold text-black">
            {t('edit_subscription', 'Edit Subscription')} - {tenant.name}
          </h3>
          <button onClick={onClose} className="text-black hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Company Details */}
            <h2 className="text-lg font-semibold mb-4 text-theme border-b pb-2">
              {t('company_details', 'Company Details')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('company_name', 'Company Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('company_name', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('enter_company_name', 'Enter Company Name')}
                />
                {errors.company_name && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('company_type', 'Company Type')} <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('company_type', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-theme focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="General">{t('General')}</option>
                  <option value="Real Estate">{t('Real Estate')}</option>
                </select>
                {errors.company_type && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('subdomain', 'Subdomain')} <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <input
                    type="text"
                    {...register('slug', { 
                      required: true,
                      pattern: /^[a-z0-9\-]+$/ 
                    })}
                    className="flex-1 px-4 py-2 border rounded-l-md dark:bg-gray-700 dark:border-gray-600 text-theme focus:ring-blue-500 focus:border-blue-500"
                    placeholder="company-slug"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 dark:bg-gray-600 dark:border-gray-600 text-black text-sm">
                    {domainSuffix}
                  </span>
                </div>
                {errors.slug && <span className="text-red-500 text-xs">{t('invalid_slug', 'Invalid slug')}</span>}
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-4 mt-6 text-theme border-b pb-2">
              {t('location_details', 'Location Details')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('country', 'Country')} <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('country', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('select_country', 'Select Country')}</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {errors.country && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('city', 'City')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('city', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.city && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('address_line_1', 'Address Line 1')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('address_line_1', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('enter_address', 'Enter street address')}
                />
                {errors.address_line_1 && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('state_province', 'State / Province')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('state', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.state && <span className="text-red-500 text-xs">{t('required', 'This field is required')}</span>}
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-4 mt-6 text-theme border-b pb-2">
              {t('admin_account', 'Admin Account')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('admin_name', 'Admin Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('admin_name', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('admin_email', 'Admin Email')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('admin_email', { required: true })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('password', 'New Password')} <span className="text-gray-400 text-xs">({t('optional', 'Optional')})</span>
                </label>
                <input
                  type="password"
                  {...register('password', { minLength: 8 })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('leave_blank_to_keep', 'Leave blank to keep current')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('confirm_password', 'Confirm New Password')}
                </label>
                <input
                  type="password"
                  {...register('password_confirmation', { 
                    validate: val => !password || val === password || t('passwords_mismatch', 'Passwords do not match')
                  })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-4 mt-6 text-theme border-b pb-2">
              {t('subscription_details', 'Subscription Details')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('number_of_users', 'Number of Users')}
                </label>
                <input
                  type="number"
                  {...register('users_limit', { min: 1 })}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('start_date', 'Start Date')}
                </label>
                <input
                  type="date"
                  {...register('start_date')}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme mb-1">
                  {t('end_date', 'End Date')}
                </label>
                <input
                  type="date"
                  {...register('end_date')}
                  disabled={isLifetime}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register('is_lifetime')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-theme">
                    {t('lifetime_subscription', 'Lifetime subscription')}
                  </span>
                </div>
              </div>
            </div>
            
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('status', 'Status')}
                </label>
                <select 
                  {...register('status')}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="active">{t('active', 'Active')}</option>
                  <option value="pending">{t('pending', 'Pending')}</option>
                  <option value="expired">{t('expired', 'Expired')}</option>
                  <option value="cancelled">{t('cancelled', 'Cancelled')}</option>
                </select>
            </div>

            <h2 className="text-lg font-semibold mb-4 mt-6 text-theme border-b pb-2">
              {t('select_plan', 'Select Plan')}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {PLANS.map((plan) => (
                <label key={plan.id} className={`relative flex flex-col p-4 border rounded-lg cursor-pointer hover:bg-gray-700 transition-all ${selectedPlan === plan.id ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200 dark:border-gray-700'}`}>
                  <div className="flex items-center mb-2">
                    <input
                      type="radio"
                      value={plan.id}
                      {...register('plan')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-3 font-bold text-theme">
                      {t(plan.name)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 ml-7">
                    {plan.modules.length > 0 ? plan.modules.map(m => t(m.charAt(0).toUpperCase() + m.slice(1))).join(', ') : t('Flexible Selection')}
                  </p>
                </label>
              ))}
            </div>

            {selectedPlan === 'custom' && (
              <div className="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-theme mb-3">{t('select_modules', 'Select Modules')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_MODULES.map(module => (
                    <label key={module.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customModules.includes(module.id)}
                        onChange={() => handleModuleToggle(module.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-theme">{t(module.name)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 space-x-2">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? t('saving', 'Saving...') : t('save_changes', 'Save Changes')}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const styles = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const statusKey = (status || 'pending').toLowerCase();
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[statusKey] || styles.pending}`}>
      {t(statusKey)}
    </span>
  );
};

export default TenantSetup;
