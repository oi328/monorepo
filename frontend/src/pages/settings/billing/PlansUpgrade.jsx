import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@shared/context/AppStateProvider'

export default function PlansUpgrade() {
  const { t } = useTranslation()
  const { subscription } = useAppState()

  const currentPlan = useMemo(() => {
    const name = subscription?.plan_name || subscription?.plan || subscription?.name || 'Free'
    return String(name).trim()
  }, [subscription])

  const tiers = [
    {
      key: 'Free',
      title: t('Starter'),
      price: t('$0 / mo'),
      features: [
        t('Basic CRM and leads'),
        t('Limited modules access'),
        t('Community support'),
      ],
      action: t('Stay on Free'),
    },
    {
      key: 'Pro',
      title: t('Pro'),
      price: t('$29 / mo'),
      features: [
        t('All core modules'),
        t('Notifications & Templates'),
        t('Basic reports'),
      ],
      action: t('Upgrade to Pro'),
      recommended: true,
    },
    {
      key: 'Enterprise',
      title: t('Enterprise'),
      price: t('Contact us'),
      features: [
        t('Advanced reports and analytics'),
        t('Custom fields and audit logs'),
        t('Priority support & SLA'),
      ],
      action: t('Talk to Sales'),
    },
  ]

  const planOrder = ['Free', 'Pro', 'Enterprise']
  const currentIndex = planOrder.indexOf(currentPlan) === -1 ? 0 : planOrder.indexOf(currentPlan)

  return (
    <Layout>
      <div className="p-3 sm:p-4 md:p-6 bg-[var(--content-bg)] text-[var(--content-text)] space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {t('Plans & Upgrade')}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Link to="/settings/billing/subscription" className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700">
              {t('View Subscription')}
            </Link>
            <Link to="/pricing" className="p-2 rounded-lg border bg-white/60 dark:bg-gray-800/60 hover:bg-white">
              {t('Pricing')}
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{t('Current Plan')}</div>
              <div className="text-lg font-semibold">{currentPlan || t('Unknown')}</div>
            </div>
            <Link to="/pricing" className="text-sm px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700">
              {t('See all plans')}
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3">
          {tiers.map((tier, idx) => {
            const isCurrent = planOrder[idx] === currentPlan
            const isLocked = idx <= currentIndex
            return (
              <div key={tier.key} className={`rounded-lg border p-5 ${tier.recommended ? 'border-indigo-500 shadow-md' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold">{tier.title}</h3>
                  {tier.recommended && (
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-600 text-white">{t('Recommended')}</span>
                  )}
                </div>
                <div className="text-2xl font-bold mb-3">{tier.price}</div>
                <ul className="space-y-2 text-sm mb-4">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2"><span>✅</span><span>{f}</span></li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button className="w-full px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-default" disabled>
                    {t('Current')}
                  </button>
                ) : (
                  <Link
                    to={tier.key === 'Enterprise' ? '/welcome/contact' : '/pricing'}
                    className={`w-full inline-flex justify-center px-4 py-2 rounded-md ${isLocked ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    aria-disabled={isLocked}
                  >
                    {tier.action}
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {t('Need a custom package or have compliance requirements?')}
            </div>
            <Link to="/welcome/contact" className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700">
              {t('Contact Sales')}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
