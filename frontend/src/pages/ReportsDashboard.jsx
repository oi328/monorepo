import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Filter, Activity, Calendar, Bookmark, CheckCircle, 
  Key, FileText, MapPin, Users, DollarSign, Download, Upload, TrendingUp, TrendingDown, ArrowRight
} from 'lucide-react'
import { api } from '../utils/api'
import { useTheme } from '@shared/context/ThemeProvider'
import { useAppState } from '@shared/context/AppStateProvider'

const REPORT_PERMISSION_MODULE_BY_KEY = {
  leads_pipeline: 'Leads Pipeline',
  sales_activities: 'Sales Activities',
  meetings_report: 'Meetings Report',
  reservations_report: 'Reservations Report',
  closed_deals: 'Closed Deals',
  rent_report: 'Rent Report',
  proposals_report: 'Proposals Report',
  check_in_report: 'Check In Report',
  customers_report: 'Customers Report',
  targets_revenue: 'Targets & Revenue',
  imports_report: 'Imports Report',
  export_report: 'Exports Report',
}


const ReportsDashboard = () => {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const { user } = useAppState()
  const isLight = theme === 'light'
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/reports/dashboard-stats')
        setStats(response.data)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const reports = [
    { 
      key: 'leads_pipeline',
      name: 'Leads Pipeline', 
      route: '/reports/sales/pipeline',
      icon: Filter,
      value: '1,245',
      label: 'Total Leads',
      trend: '+12%',
      trendUp: true,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      hoverColor: 'group-hover:bg-blue-600 dark:group-hover:bg-blue-500',
      borderColor: 'border-blue-600 dark:border-blue-400'
    },
    { 
      key: 'sales_activities',
      name: 'Sales Activities', 
      route: '/reports/sales/activities',
      icon: Activity,
      value: '850',
      label: 'Activities',
      trend: '+5%',
      trendUp: true,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      hoverColor: 'group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500',
      borderColor: 'border-indigo-600 dark:border-indigo-400'
    },
    { 
      key: 'meetings_report',
      name: 'Meetings Report', 
      route: '/reports/sales/meetings',
      icon: Calendar,
      value: '42',
      label: 'Scheduled',
      trend: '+8%',
      trendUp: true,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      hoverColor: 'group-hover:bg-purple-600 dark:group-hover:bg-purple-500',
      borderColor: 'border-purple-600 dark:border-purple-400'
    },
    { 
      key: 'reservations_report',
      name: 'Reservations Report', 
      route: '/reports/sales/reservations',
      icon: Bookmark,
      value: '18',
      label: 'Reservations',
      trend: '-2%',
      trendUp: false,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
      hoverColor: 'group-hover:bg-pink-600 dark:group-hover:bg-pink-500',
      borderColor: 'border-pink-600 dark:border-pink-400'
    },
    { 
      key: 'closed_deals',
      name: 'Closed Deals', 
      route: '/reports/sales/closed-deals',
      icon: CheckCircle,
      value: '156',
      label: 'Deals',
      trend: '+24%',
      trendUp: true,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      hoverColor: 'group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500',
      borderColor: 'border-emerald-600 dark:border-emerald-400'
    },
    { 
      key: 'rent_report',
      name: 'Rent Report', 
      route: '/reports/sales/rent',
      icon: Key,
      value: '34',
      label: 'Active Rent',
      trend: '0%',
      trendUp: true,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      hoverColor: 'group-hover:bg-orange-600 dark:group-hover:bg-orange-500',
      borderColor: 'border-orange-600 dark:border-orange-400'
    },
    { 
      key: 'proposals_report',
      name: 'Proposals Report', 
      route: '/reports/sales/proposals',
      icon: FileText,
      value: '89',
      label: 'Sent',
      trend: '+15%',
      trendUp: true,
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
      hoverColor: 'group-hover:bg-cyan-600 dark:group-hover:bg-cyan-500',
      borderColor: 'border-cyan-600 dark:border-cyan-400'
    },
    { 
      key: 'check_in_report',
      name: 'Check In Report', 
      route: '/reports/sales/check-in',
      icon: MapPin,
      value: '210',
      label: 'Check-ins',
      trend: '+6%',
      trendUp: true,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      hoverColor: 'group-hover:bg-teal-600 dark:group-hover:bg-teal-500',
      borderColor: 'border-teal-600 dark:border-teal-400'
    },
    { 
      key: 'customers_report',
      name: 'Customers Report', 
      route: '/reports/sales/customers',
      icon: Users,
      value: '4,521',
      label: 'Customers',
      trend: '+3%',
      trendUp: true,
      color: 'text-blue-500 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      hoverColor: 'group-hover:bg-blue-500 dark:group-hover:bg-blue-400',
      borderColor: 'border-blue-500 dark:border-blue-400'
    },
    { 
      key: 'targets_revenue',
      name: 'Targets & Revenue', 
      route: '/reports/sales/revenue',
      icon: DollarSign,
      value: '$1.2M',
     
      trend: '+18%',
      trendUp: true,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      hoverColor: 'group-hover:bg-green-600 dark:group-hover:bg-green-500',
      borderColor: 'border-green-600 dark:border-green-400'
    },
    { 
      key: 'imports_report',
      name: 'Imports Report', 
      route: '/reports/sales/imports',
      icon: Download,
      value: '12k',
      label: 'Records',
      trend: '',
      trendUp: true,
      color: `${isLight ? 'text-black' : 'text-white'}`,
      bgColor: 'bg-theme-bg',
      hoverColor: 'group-hover:bg-gray-600 dark:group-hover:bg-gray-500',
      borderColor: 'border-gray-600 dark:border-gray-400'
    },
    { 
      key: 'export_report',
      name: 'Export Report', 
      route: '/reports/sales/exports',
      icon: Upload,
      value: '45',
      label: 'Generated',
      trend: '',
      trendUp: true,
      color: `${isLight ? 'text-black' : 'text-white'}`,
      bgColor: `${isLight ? 'bg-gray-50' : 'bg-gray-800'}`,
      hoverColor: 'group-hover:bg-gray-600 dark:group-hover:bg-gray-500',
      borderColor: 'border-gray-600 dark:border-gray-400'
    },
  ]
  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const controlModulePerms = Array.isArray(modulePermissions.Control) ? modulePermissions.Control : []
  const reportsModulePerms = Array.isArray(modulePermissions.Reports) ? modulePermissions.Reports : []
  const hasExplicitReportsPerms = Object.prototype.hasOwnProperty.call(modulePermissions, 'Reports')
  const roleLower = String(user?.role || '').toLowerCase()
  const isAdminRole =
    user?.is_super_admin ||
    roleLower === 'admin' ||
    roleLower === 'tenant admin' ||
    roleLower === 'tenant-admin'

  const hasReportsAccess = isAdminRole || controlModulePerms.includes('showReports')

  const visibleReports = reports.filter((report) => {
    if (!hasReportsAccess) return false

    // Admin can always see all cards.
    if (isAdminRole) return true

    // Legacy users (created before report-level matrix) keep seeing all report cards
    // as long as they still have global showReports access.
    if (!hasExplicitReportsPerms) return true

    const reportModuleName = REPORT_PERMISSION_MODULE_BY_KEY[report.key]
    if (!reportModuleName) return false

    return reportsModulePerms.includes(`${reportModuleName}_show`)
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-3xl font-bold ${isLight ? 'text-black' : 'text-white'} tracking-tight`}>
            {t('Reports Dashboard')}
          </h1>
          <p className={`text-base ${isLight ? 'text-black' : 'text-white'} mt-2`}>
            {t('Welcome to Reports Module')}
          </p>
        </div>
      </div>

      {visibleReports.length === 0 ? (
        <div className={`rounded-2xl border border-theme-border dark:border-gray-700/50 p-8 text-center ${isLight ? 'bg-gray-50 text-black' : 'bg-gray-800 text-white'}`}>
          {t('No reports are available for your account.')}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleReports.map((report, index) => {
          const Icon = report.icon
          
          let displayValue = loading ? '...' : 0
          let displayTrend = ''
          let displayTrendUp = report.trendUp

          if (stats && stats[report.key]) {
             const stat = stats[report.key]
             displayValue = stat.value ?? 0
             
             // Format large numbers
             const asNumber = (() => {
               if (typeof displayValue === 'number') return displayValue
               if (typeof displayValue === 'string') {
                 const cleaned = displayValue.replace(/,/g, '').trim()
                 const n = Number(cleaned)
                 return Number.isFinite(n) ? n : null
               }
               return null
             })()

             if (asNumber !== null) {
               const locale = (i18n?.language || 'en').toLowerCase().startsWith('ar') ? 'ar-EG' : 'en-US'
               if (report.key === 'targets_revenue') {
                 displayValue = new Intl.NumberFormat(locale, {
                   minimumFractionDigits: 2,
                   maximumFractionDigits: 2,
                 }).format(asNumber)
               } else {
                 displayValue = new Intl.NumberFormat(locale).format(asNumber)
               }
             }

	             displayTrend = typeof stat.trend === 'number'
	               ? `${stat.trend > 0 ? '+' : ''}${stat.trend}%`
	               : ''
	             displayTrendUp = typeof stat.trendUp === 'boolean' ? stat.trendUp : true
          }

          return (
            <Link 
              key={index} 
              to={report.route}
              className={`group relative ${isLight ? 'bg-gray-50' : 'bg-gray-800'} backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-theme-border dark:border-gray-700/50 p-6 transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
                <Icon size={80} className={report.color} />
              </div>

              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`p-3 rounded-xl ${report.bgColor} ${report.color}`}>
                  <Icon size={24} />
                </div>
                {displayTrend && (
                  <div className={`flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${
                    displayTrendUp 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  }`}>
                    {displayTrendUp ? <TrendingUp size={14} className="mr-1 rtl:ml-1" /> : <TrendingDown size={14} className="mr-1 rtl:ml-1" />}
                    {displayTrend}
                  </div>
                )}
              </div>

              <div className="relative z-10">
                <h3 className={`${isLight ? 'text-black' : 'text-white'} text-sm font-semibold mb-1`}>
                  {t(report.name)}
                </h3>
                <div className="flex items-baseline space-x-2 rtl:space-x-reverse">
                  <span className={`text-2xl font-bold ${report.color}`}>
                    {loading ? '...' : displayValue}
                  </span>
                  <span className={`text-xs ${isLight ? 'text-black' : 'text-white'} font-medium`}>
                    {t(report.label)}
                  </span>
                </div>
              </div>

              <div className="mt-8 relative z-10">
                <span className={`
                  w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                  border-2 ${report.borderColor} ${report.color}
                  group-hover:text-white ${report.hoverColor} group-hover:shadow-lg
                  dark:border-opacity-50
                `}>
                  {t('Open')}
                  <ArrowRight size={18} className="ml-2 rtl:mr-2 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
      )}
    </div>
  )
}

export default ReportsDashboard
