import { useTranslation } from 'react-i18next'

export default function SystemAdminDashboard() {
  const { t } = useTranslation()

  const kpis = [
    { key: 'tenants', label: t('Total Tenants'), value: '0' },
    { key: 'mrr', label: t('Monthly Recurring Revenue'), value: '$0' },
    { key: 'churn', label: t('Churn Rate'), value: '0%' },
    { key: 'activeUsers', label: t('Active Users'), value: '0' },
  ]

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-theme mb-1">
          {t('System Admin')}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-theme tracking-tight">
          {t('Super Admin Dashboard')}
        </h1>
        <p className="mt-1 text-sm text-theme">
          {t('High level view of tenants, revenue, usage and system health.')}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(kpi => (
          <div
            key={kpi.key}
            className="rounded-2xl border border-theme-border bg-theme-bg/60 backdrop-blur-sm px-4 py-3"
          >
            <p className="text-xs font-medium text-theme">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold text-theme">{kpi.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-theme-border bg-theme-bg/60 backdrop-blur-sm px-4 py-4">
        <p className="text-sm text-theme">
          {t('This is a placeholder view for the super admin dashboard.')}
        </p>
        <p className="mt-1 text-xs text-theme">
          {t(
            'You can extend this page with real metrics, tenant analytics and system health widgets.'
          )}
        </p>
      </section>
    </div>
  )
}

