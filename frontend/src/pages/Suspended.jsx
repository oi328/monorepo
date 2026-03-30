import { useTranslation } from 'react-i18next'

export default function Suspended() {
  const { t } = useTranslation()

  const hash = typeof window !== 'undefined' ? String(window.location.hash || '') : ''
  const queryStr = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(queryStr)
  const reason = params.get('reason')

  const isSubscriptionExpired = reason === 'subscription_expired'
  const isAr = (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl') || false

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {isSubscriptionExpired
              ? (isAr ? 'انتهى الاشتراك' : 'Subscription Expired')
              : (isAr ? 'تم إيقاف الحساب' : 'Account Suspended')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isSubscriptionExpired
              ? (isAr ? 'انتهت مدة الاشتراك. برجاء تجديد الاشتراك لاستعادة الوصول.' : 'Your subscription has ended. Please renew your subscription to restore access.')
              : (isAr ? 'تم إيقاف الحساب بسبب مشاكل في الفوترة أو مخالفة السياسات.' : 'Your account has been suspended due to billing issues or policy violations.')}
          </p>
        </div>
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {isSubscriptionExpired
                  ? (isAr ? 'تم انتهاء الاشتراك' : 'Subscription Ended')
                  : (isAr ? 'تم رفض الوصول' : 'Access Denied')}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  {isSubscriptionExpired
                    ? (isAr ? 'برجاء التواصل مع الدعم أو تجديد الاشتراك لمتابعة استخدام مساحة العمل.' : 'Please contact support or renew your subscription to continue using this workspace.')
                    : (isAr ? 'برجاء التواصل مع الدعم أو تحديث بيانات الفوترة لاستعادة الوصول.' : 'Please contact support or update your billing information to restore access.')}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div>
           <button
             onClick={() => window.location.reload()}
             className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
           >
             Refresh Status
           </button>
        </div>
      </div>
    </div>
  )
}
