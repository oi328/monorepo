import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../utils/api'

export default function SystemErrorLog() {
  const { t } = useTranslation()
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchErrors()
  }, [])

  const fetchErrors = async () => {
    try {
      const response = await api.get('/super-admin/system-errors')
      setErrors(response.data)
    } catch (error) {
      console.error('Failed to fetch system errors:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    if (!errors.length) return { tenants: 0, total: 0, critical: 0, oldest: '-' }
    
    const uniqueTenants = new Set(errors.map(e => e.tenant)).size
    const totalErrors = errors.reduce((acc, curr) => acc + curr.count, 0)
    const criticalErrors = errors.filter(e => e.level === 'error').length
    // Approximate oldest based on the last item since it's ordered by time desc
    const oldest = errors[errors.length - 1]?.lastSeen || '-'

    return {
      tenants: uniqueTenants,
      total: totalErrors,
      critical: criticalErrors,
      oldest: oldest
    }
  }, [errors])

  const levelTone = (level) => {
    if (level === 'error') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
    if (level === 'warning') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-200'
  }

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-theme mb-1">
          {t('System Monitor')}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-theme tracking-tight">
          {t('Multi-tenant Error Log')}
        </h1>
        <p className="mt-1 text-sm text-theme">
          {t('Central view of errors across all tenants, services and endpoints.')}
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-theme-border bg-theme-bg/70 px-4 py-3">
          <p className="text-xs font-medium text-theme">
            {t('Tenants with errors (24h)')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-theme">{stats.tenants}</p>
        </div>
        <div className="rounded-2xl border border-theme-border bg-theme-bg/70 px-4 py-3">
          <p className="text-xs font-medium text-theme">
            {t('Total errors (24h)')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-theme">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-theme-border bg-theme-bg/70 px-4 py-3">
          <p className="text-xs font-medium text-theme">
            {t('Critical incidents')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-theme">{stats.critical}</p>
        </div>
        <div className="rounded-2xl border border-theme-border bg-theme-bg/70 px-4 py-3">
          <p className="text-xs font-medium text-theme">
            {t('Oldest unresolved')}
          </p>
          <p className="mt-2 text-2xl font-semibold text-theme">{stats.oldest}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-theme-border bg-theme-bg/70 overflow-hidden">
        <div className="px-4 py-3 border-b border-theme-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-theme">
              {t('Error stream')}
            </p>
            <p className="text-xs text-theme">
              {t('Newest errors from all tenants, ordered by time.')}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/60">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-theme">
                  {t('Time')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-theme">
                  {t('Tenant')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-theme">
                  {t('Service')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-theme">
                  {t('Endpoint / job')}
                </th>
                <th className="px-3 py-2 text-center font-medium text-theme">
                  {t('Status')}
                </th>
                <th className="px-3 py-2 text-center font-medium text-theme">
                  {t('Level')}
                </th>
                <th className="px-3 py-2 text-center font-medium text-theme">
                  {t('Count')}
                </th>
                <th className="px-3 py-2 text-center font-medium text-theme">
                  {t('Last seen')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border dark:divide-gray-800 bg-white dark:bg-gray-950">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-4 text-center text-theme">
                    {t('Loading...')}
                  </td>
                </tr>
              ) : errors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-3 py-4 text-center text-theme">
                    {t('No errors found.')}
                  </td>
                </tr>
              ) : (
                errors.map((err) => (
                  <tr key={err.id}>
                    <td className="px-3 py-2 text-theme whitespace-nowrap">
                      {err.time}
                    </td>
                    <td className="px-3 py-2 text-theme whitespace-nowrap">
                      {err.tenant}
                    </td>
                    <td className="px-3 py-2 text-theme whitespace-nowrap">
                      {err.service}
                    </td>
                    <td className="px-3 py-2 text-theme">
                      <span className="font-mono text-[11px] md:text-xs">
                        {err.endpoint}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-200">
                        {err.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-medium ${levelTone(err.level)}`}>
                        {t(err.level)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-theme">
                      {err.count}
                    </td>
                    <td className="px-3 py-2 text-center text-theme">
                      {err.lastSeen}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
