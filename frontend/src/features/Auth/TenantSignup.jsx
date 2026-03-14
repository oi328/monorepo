import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@utils/api';
import { useTranslation } from 'react-i18next';

export const TenantSignup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    company_name: '',
    slug: '',
    admin_name: '',
    admin_email: '',
    password: '',
    password_confirmation: '',
    plan: 'trial', // Default
    modules: [], // Added modules array
    company_type: 'General',
    country: '',
    address_line_1: '',
    city: '',
    state: ''
  });

  // Available Modules for Custom Plan
  const availableModules = [
    { id: 'dashboard', slug: 'dashboard', label: 'Dashboard' },
    { id: 'leads', slug: 'leads', label: 'Leads Management' },
    { id: 'inventory', slug: 'inventory', label: 'Inventory' },
    { id: 'campaigns', slug: 'campaigns', label: 'Marketing Campaigns' },
    { id: 'customers', slug: 'customers', label: 'Customers' },
    { id: 'support', slug: 'support', label: 'Support Tickets' },
    { id: 'users', slug: 'users', label: 'User Management' },
    { id: 'reports', slug: 'reports', label: 'Reports' },
    { id: 'settings', slug: 'settings', label: 'Settings' }
  ];

  const handleModuleToggle = (slug) => {
    setFormData(prev => {
      const currentModules = prev.modules || [];
      if (currentModules.includes(slug)) {
        return { ...prev, modules: currentModules.filter(m => m !== slug) };
      } else {
        return { ...prev, modules: [...currentModules, slug] };
      }
    });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSlugChange = (e) => {
    // Basic slugify: lowercase, replace spaces with hyphens, remove special chars
    const val = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, slug: val });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/tenants/register', formData);
      setLoading(false);
      setStep(4); // Success step
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  const getTenantUrl = () => {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      
      let baseDomain = hostname;
      
      // If we are already on a subdomain (e.g. www.app.com), we should strip it?
      // Or just assume the user is visiting the main landing page (app.com or localhost).
      
      if (hostname.includes('localhost')) {
          // If current is localhost, then new is slug.localhost
          // If current is www.localhost (unlikely), strip www.
          baseDomain = 'localhost';
      } else {
          // Attempt to strip existing subdomain if any
          const parts = hostname.split('.');
          if (parts.length > 2) {
              baseDomain = parts.slice(1).join('.');
          }
      }
      
      return `${protocol}//${formData.slug}.${baseDomain}${port}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {step === 4 ? 'Welcome Aboard!' : 'Create your workspace'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
             Step {step} of 4
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label>
              <input
                type="text"
                name="company_name"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.company_name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Workspace URL</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="slug"
                  required
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={formData.slug}
                  onChange={handleSlugChange}
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm dark:bg-gray-600 dark:border-gray-600 dark:text-gray-300">
                  .yourdomain.com
                </span>
              </div>
            </div>
            <button
              onClick={nextStep}
              disabled={!formData.company_name || !formData.slug}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Name</label>
              <input
                type="text"
                name="admin_name"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.admin_name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Email</label>
              <input
                type="email"
                name="admin_email"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.admin_email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input
                type="password"
                name="password"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
              <input
                type="password"
                name="password_confirmation"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.password_confirmation}
                onChange={handleChange}
              />
            </div>
            <div className="flex space-x-4">
                <button
                onClick={prevStep}
                className="w-1/2 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                >
                Back
                </button>
                <button
                onClick={nextStep}
                disabled={!formData.admin_email || !formData.password || formData.password !== formData.password_confirmation}
                className="w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                Next
                </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
                {['trial', 'starter', 'pro', 'custom'].map((plan) => (
                    <div 
                        key={plan}
                        onClick={() => setFormData({ ...formData, plan })}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${formData.plan === plan ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <h3 className="text-lg font-medium capitalize text-gray-900 dark:text-white">{plan} Plan</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {plan === 'trial' ? '14 Days Free Trial' : plan === 'starter' ? '$29/mo' : plan === 'pro' ? '$99/mo' : 'Flexible Selection'}
                        </p>
                    </div>
                ))}
            </div>

            {/* Custom Plan Module Selection */}
            {formData.plan === 'custom' && (
              <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Modules</h4>
                <div className="grid grid-cols-2 gap-3">
                  {availableModules.map((module) => (
                    <label key={module.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.modules || []).includes(module.slug)}
                        onChange={() => handleModuleToggle(module.slug)}
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{module.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex space-x-4">
                <button
                onClick={prevStep}
                className="w-1/2 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                >
                Back
                </button>
                <button
                onClick={handleSubmit}
                disabled={loading || (formData.plan === 'custom' && (!formData.modules || formData.modules.length === 0))}
                className="w-1/2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                {loading ? 'Creating...' : 'Create Workspace'}
                </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-6">
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                   <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                   </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Workspace successfully created!</h3>
                </div>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
                Your workspace is ready at:
            </p>
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded text-lg font-mono break-all text-gray-800 dark:text-gray-200">
                {getTenantUrl()}
            </div>
            <a 
                href={getTenantUrl()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
                Go to Workspace
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantSignup;
