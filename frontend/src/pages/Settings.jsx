import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { User, Building, Users, Bell, CreditCard, Package, Shield } from 'lucide-react'

export default function Settings() {
  const { t } = useTranslation()
  const tabs = [
    { key: 'profile', label: 'Profile Settings', icon: User },
    { key: 'company', label: 'Company Settings', icon: Building },
    { key: 'users', label: 'Users & Roles', icon: Users },
    { key: 'notifications', label: 'Notifications Settings', icon: Bell },
    { key: 'billing', label: 'Billing & Subscription', icon: CreditCard },
    { key: 'modules', label: 'Modules Settings', icon: Package },
    { key: 'security', label: 'Security Settings', icon: Shield },
  ]
  const [activeTab, setActiveTab] = useState('profile')

  const TabContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileSettings />
      case 'company': return <CompanySettings />
      case 'users': return <UsersAndRoles />
      case 'notifications': return <NotificationsSettings />
      case 'billing': return <BillingSettings />
      case 'modules': return <ModulesSettings />
      case 'security': return <SecuritySettings />
      default: return null
    }
  }

  return (
    <Layout>
      <div className="p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            {t('Settings')}
          </h1>
        </div>

        <div className="glass-panel rounded-2xl p-2">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-xl transition-all duration-300 inline-flex items-center gap-2 ${activeTab===key ? 'bg-white text-blue-600 shadow-md' : 'bg-white/40 dark:bg-gray-800/40 text-[var(--content-text)] hover:bg-white/60'}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <TabContent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  )
}
