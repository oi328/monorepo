import { useMemo, useState } from 'react'

// Comprehensive modules registry based on project pages/routes
const MODULE_CATEGORIES = [
  {
    key: 'core',
    name: 'Core CRM',
    modules: [
      { key: 'dashboard', label: 'Dashboard', route: '/dashboard', icon: '📊' },
      { key: 'customers', label: 'Customers', route: '/customers', icon: '👥' },
      { key: 'leads', label: 'Leads', route: '/leads', icon: '🧲' },
      { key: 'projects', label: 'Projects', route: '/projects', icon: '🗂️' },
      { key: 'properties', label: 'Properties', route: '/properties', icon: '🏠' },
      { key: 'requests', label: 'Requests', route: '/requests', icon: '📨' },
      { key: 'buyerRequests', label: 'Buyer Requests', route: '/buyer-requests', icon: '🛒' },
      { key: 'sellerRequests', label: 'Seller Requests', route: '/seller-requests', icon: '🧾' },
      { key: 'developers', label: 'Developers', route: '/dev-companies', icon: '🏗️' },
      { key: 'recycle', label: 'Recycle Bin', route: '/recycle', icon: '🗑️' },
      { key: 'contact', label: 'Contact Us', route: '/contact', icon: '☎️' },
    ],
  },
  {
    key: 'marketing',
    name: 'Marketing',
    modules: [
      { key: 'marketing', label: 'Marketing', route: '/marketing', icon: '📣' },
      { key: 'campaigns', label: 'Campaigns', route: '/campaigns', icon: '🎯' },
      { key: 'landingPages', label: 'Landing Pages', route: '/landing-pages', icon: '🧩' },
      { key: 'metaIntegration', label: 'Integration', route: '/meta-integration', icon: '🧠' },
      { key: 'mktReports', label: 'Marketing Reports', route: '/marketing/reports', icon: '📈' },
    ],
  },
  {
    key: 'inventory',
    name: 'Inventory',
    modules: [
      { key: 'products', label: 'Products', route: '/inventory/products', icon: '📦' },
      { key: 'items', label: 'Items', route: '/inventory/items', icon: '🔖' },
      { key: 'suppliers', label: 'Suppliers', route: '/inventory/suppliers', icon: '🚚' },
      { key: 'warehouse', label: 'Warehouse', route: '/inventory/warehouse', icon: '🏭' },
      { key: 'stockManagement', label: 'Stock Management', route: '/inventory/stock-management', icon: '📊' },
      { key: 'inventoryTransactions', label: 'Inventory Transactions', route: '/inventory/transactions', icon: '🔄' },
    ],
  },
  {
    key: 'reports',
    name: 'Reports',
    modules: [
      { key: 'reportsDashboard', label: 'Reports Dashboard', route: '/reports', icon: '📋' },
      { key: 'leadsReport', label: 'Leads Report', route: '/reports/leads', icon: '🧭' },
      { key: 'teamPerformance', label: 'Team Performance', route: '/reports/team', icon: '👥' },
      { key: 'meetingsReport', label: 'Meetings Report', route: '/reports/sales/meetings', icon: '📅' },
      { key: 'exportsReport', label: 'Exports Report', route: '/exports', icon: '📤' },
      { key: 'importsReport', label: 'Imports Report', route: '/imports', icon: '📥' },
      { key: 'campaignSummary', label: 'Campaign Summary', route: '/campaign-summary', icon: '🧾' },
      { key: 'leadSourcePerf', label: 'Lead Source Performance', route: '/lead-source-performance', icon: '🎚️' },
      { key: 'costVsRevenue', label: 'Cost vs Revenue', route: '/cost-vs-revenue', icon: '⚖️' },
      { key: 'monthlyMarketingOverview', label: 'Monthly Marketing Overview', route: '/monthly-marketing-overview', icon: '🗓️' },
    ],
  },
  {
    key: 'settings',
    name: 'Settings & Extensions',
    modules: [
      { key: 'settingsProfile', label: 'Profile Settings', route: '/settings/profile', icon: '👤' },
      { key: 'settingsCompany', label: 'Company Settings', route: '/settings/company', icon: '🏢' },
      { key: 'settingsUsers', label: 'Users & Roles', route: '/settings/users', icon: '🧑‍💼' },
      { key: 'settingsNotifications', label: 'Notifications Settings', route: '/settings/notifications', icon: '🔔' },
      { key: 'settingsBilling', label: 'Billing & Subscription', route: '/settings/billing', icon: '💳' },
      { key: 'settingsModules', label: 'Modules Settings', route: '/settings/modules', icon: '🧩' },
      { key: 'settingsSystem', label: 'System Preferences', route: '/settings/system', icon: '⚙️' },
      { key: 'settingsSecurity', label: 'Security Settings', route: '/settings/security', icon: '🔒' },
      { key: 'settingsSms', label: 'SMS Settings', route: '/settings/sms', icon: '✉️' },
      { key: 'settingsSmsTemplates', label: 'SMS Templates', route: '/settings/sms-templates', icon: '📄' },
      { key: 'settingsEmail', label: 'Email Settings', route: '/settings/email', icon: '📧' },
      { key: 'settingsWhatsApp', label: 'WhatsApp Settings', route: '/settings/whatsapp', icon: '🟢' },
      { key: 'settingsSocialMedia', label: 'Social Media Settings', route: '/settings/social-media', icon: '🌐' },
      { key: 'settingsContactInfo', label: 'Contact Info Settings', route: '/settings/contact-info', icon: '☎️' },
      { key: 'settingsScripting', label: 'Scripting', route: '/settings/scripting', icon: '📝' },
      { key: 'settingsEoi', label: 'EOI Settings', route: '/settings/eoi', icon: '🗒️' },
      { key: 'settingsReservations', label: 'Reservation Settings', route: '/settings/reservations', icon: '🗓️' },
      { key: 'settingsRotation', label: 'Rotation Settings', route: '/settings/rotation', icon: '🔄' },
      { key: 'settingsContracts', label: 'Contracts Settings', route: '/settings/contracts', icon: '📜' },
      { key: 'settingsConfiguration', label: 'Configuration', route: '/settings/configuration', icon: '🔧' },
      { key: 'settingsBuyerReset', label: 'Buyer Request Reset', route: '/settings/buyer-request-reset', icon: '♻️' },
      { key: 'settingsMatching', label: 'Matching', route: '/settings/matching', icon: '🔍' },
      { key: 'settingsRent', label: 'Rent Configuration', route: '/settings/rent', icon: '🏘️' },
    ],
  },
]

const allModuleKeys = MODULE_CATEGORIES.flatMap(c => c.modules.map(m => m.key))

const ModulesSettings = () => {
  const [search, setSearch] = useState('')
  const [enabled, setEnabled] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('enabledModules') : null
      if (saved) return JSON.parse(saved)
    } catch {}
    const defaults = {}
    allModuleKeys.forEach(k => { defaults[k] = true })
    return defaults
  })

  const toggle = (key) => setEnabled(prev => ({ ...prev, [key]: !prev[key] }))
  const enableAll = () => setEnabled(prev => {
    const next = { ...prev }
    allModuleKeys.forEach(k => { next[k] = true })
    return next
  })
  const disableAll = () => setEnabled(prev => {
    const next = { ...prev }
    allModuleKeys.forEach(k => { next[k] = false })
    return next
  })
  const save = () => {
    try { if (typeof window !== 'undefined') window.localStorage.setItem('enabledModules', JSON.stringify(enabled)) } catch {}
    alert('Modules settings saved')
  }

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return MODULE_CATEGORIES
    return MODULE_CATEGORIES.map(cat => ({
      ...cat,
      modules: cat.modules.filter(m => m.label.toLowerCase().includes(q))
    })).filter(cat => cat.modules.length > 0)
  }, [search])

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="text-lg font-semibold">Modules</h3>
          <div className="flex items-center gap-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search modules" className="input-soft w-[220px]" />
            <button className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" onClick={enableAll}>Enable All</button>
            <button className="px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800" onClick={disableAll}>Disable All</button>
            <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={save}>Save</button>
          </div>
        </div>
      </div>

      {filteredCategories.map(cat => (
        <div key={cat.key} className="glass-panel rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-semibold">{cat.name}</h4>
            <span className="text-xs text-[var(--muted-text)]">{cat.modules.filter(m=>enabled[m.key]).length}/{cat.modules.length} enabled</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cat.modules.map(m => (
              <label key={m.key} className="flex items-center gap-3 p-3 rounded-xl border bg-white/60 dark:bg-gray-800/60">
                <input type="checkbox" checked={!!enabled[m.key]} onChange={()=>toggle(m.key)} />
                <span className="text-lg" aria-hidden="true">{m.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{m.label}</div>
                  {m.route && (<div className="text-xs text-[var(--muted-text)]">{m.route}</div>)}
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ModulesSettings
