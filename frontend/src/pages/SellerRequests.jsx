import { useTranslation } from 'react-i18next'

export default function SellerRequests() {
  const { i18n } = useTranslation()
  const isRTL = String(i18n.language || '').startsWith('ar')
  return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="p-4 bg-[var(--content-bg)] text-[var(--content-text)]">
        <div className={`flex items-center justify-between ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className={`relative inline-flex items-center ${isRTL ? 'flex-row-reverse' : ''} gap-2`}>
            <h1 className={`page-title text-2xl font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>Seller Requests</h1>
            <span aria-hidden className="absolute block h-[1px] rounded bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" style={{ width: 'calc(100% + 8px)', left: isRTL ? 'auto' : '-4px', right: isRTL ? '-4px' : 'auto', bottom: '-4px' }}></span>
          </div>
          <div className="flex items-center gap-2"></div>
        </div>
        <p className="mt-2 text-[var(--muted-text)]">Inventory &gt; Seller Requests placeholder page.</p>
      </div>
  )
}
