import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'

const SalesInvoicesPaymentModal = ({ isOpen, onClose, onSave, invoice }) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    method: 'Bank Transfer',
    reference: '',
    notes: ''
  })

  useEffect(() => {
    if (invoice) {
      const balanceDue = (Number(invoice.total) || 0) - (Number(invoice.paidAmount) || 0)
      setPaymentData({
        amount: balanceDue > 0 ? balanceDue : 0,
        date: new Date().toISOString().split('T')[0],
        method: 'Bank Transfer',
        reference: '',
        notes: ''
      })
    }
  }, [invoice, isOpen])

  if (!isOpen || !invoice) return null

  const balanceDue = (Number(invoice.total) || 0) - (Number(invoice.paidAmount) || 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      invoiceId: invoice.id,
      ...paymentData,
      amount: Number(paymentData.amount)
    })
  }

  const inputClass = `w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
    isDark 
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
      : 'bg-white border-gray-300 text-theme-text placeholder-gray-400'
  }`

  const labelClass = `block text-sm font-medium mb-1 text-theme-text`

  return (
    <div className="fixed inset-0 z-[2050] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`card relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
          <h2 className={`text-xl font-bold flex items-center gap-2 text-theme-text`}>
            <FaMoneyBillWave className="text-green-600" />
            {isRTL ? 'تسجيل دفعة' : 'Register Payment'}
          </h2>
          <button 
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-theme-text hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Invoice Summary */}
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-blue-50'} border ${isDark ? 'border-gray-700' : 'border-blue-100'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-theme-text opacity-70">{isRTL ? 'رقم الفاتورة' : 'Invoice #'}</span>
              <span className="font-bold text-theme-text">{invoice.id}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-theme-text opacity-70">{isRTL ? 'العميل' : 'Customer'}</span>
              <span className="font-medium text-theme-text">{invoice.customerName}</span>
            </div>
            <div className="flex justify-between items-center text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-bold text-theme-text">{isRTL ? 'المبلغ المستحق' : 'Balance Due'}</span>
              <span className="font-bold text-red-500">{balanceDue.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4">
            <div>
              <label className={labelClass}>{isRTL ? 'مبلغ الدفع' : 'Payment Amount'}</label>
              <div className="relative">
                <span className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5 text-gray-500`}>$</span>
                <input
                  type="number"
                  min="0"
                  max={balanceDue}
                  step="0.01"
                  required
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className={`${inputClass} ${isRTL ? 'pr-8' : 'pl-8'} font-bold text-green-600`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{isRTL ? 'تاريخ الدفع' : 'Payment Date'}</label>
                <div className="relative">
                   <FaCalendarAlt className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 text-gray-500`} />
                  <input
                    type="date"
                    required
                    value={paymentData.date}
                    onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                    className={`${inputClass} ${isRTL ? 'pr-10' : 'pl-10'}`}
                  />
                </div>
              </div>
              
              <div>
                <label className={labelClass}>{isRTL ? 'طريقة الدفع' : 'Payment Method'}</label>
                <select
                  value={paymentData.method}
                  onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                  className={inputClass}
                >
                  <option value="Cash">{isRTL ? 'نقدي' : 'Cash'}</option>
                  <option value="Bank Transfer">{isRTL ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  <option value="Check">{isRTL ? 'شيك' : 'Check'}</option>
                  <option value="Credit Card">{isRTL ? 'بطاقة ائتمان' : 'Credit Card'}</option>
                  <option value="Other">{isRTL ? 'أخرى' : 'Other'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>{isRTL ? 'رقم المرجع / الشيك' : 'Reference / Check #'}</label>
              <input
                type="text"
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                className={inputClass}
                placeholder={isRTL ? 'مثال: CHK-123456' : 'e.g., CHK-123456'}
              />
            </div>

            <div>
              <label className={labelClass}>{isRTL ? 'ملاحظات' : 'Notes'}</label>
              <textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                className={`${inputClass} min-h-[80px]`}
                placeholder={isRTL ? 'ملاحظات إضافية...' : 'Additional notes...'}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn btn-success flex-1 gap-2 text-white"
            >
              <FaSave />
              {isRTL ? 'حفظ الدفعة' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SalesInvoicesPaymentModal
