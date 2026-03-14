import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useReactToPrint } from 'react-to-print'
import { FaPrint, FaTimes } from 'react-icons/fa'

import { useAppState } from '../shared/context/AppStateProvider'

const RequestPreviewModal = ({ isOpen, onClose, request }) => {
  const { t, i18n } = useTranslation()
  const { company: tenant, user } = useAppState()
  const isRTL = i18n.dir() === 'rtl'
  const printRef = useRef()

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Request-${request?.id || 'New'}`,
    onAfterPrint: () => console.log('Printed successfully'),
    onPrintError: (error) => console.error('Print failed:', error),
  })

  // Extract company details safely
  const companyName = tenant?.name || 'Your Company'
  const companyDescription = tenant?.profile?.description || 'Innovative Solutions Co.'
  const logoUrl = tenant?.profile?.logo_url || null
  const addressLine1 = tenant?.address_line_1 || '123 Business Avenue, Tech District'
  const addressLine2 = tenant?.address_line_2 || ''
  const location = [tenant?.city, tenant?.state, tenant?.country].filter(Boolean).join(', ') || 'Cairo, Egypt, 11511'
  const phone = tenant?.profile?.phone || '+20 123 456 7890'
  const email = user?.email || 'sales@yourcompany.com'
  const taxId = tenant?.profile?.tax_id || '123-456-789'

  // Calculations
  const calculatedSubtotal = (request?.items || []).reduce((acc, item) => {
    const qty = item.quantity || 0
    const price = Number(item.price || 0)
    const discount = Number(item.discount || 0)
    return acc + (qty * price) - discount
  }, 0)

  const calculatedTax = calculatedSubtotal * 0.14
  const calculatedTotal = calculatedSubtotal + calculatedTax

  if (!isOpen || !request) return null

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-page { 
            width: 210mm; 
            min-height: 297mm; 
            padding: 15mm; 
            margin: 0 auto; 
            background: white !important; 
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
          thead th { background-color: #f2f2f2 !important; color: black !important; font-weight: bold; }
          .page-break { page-break-before: always; }
          tr { page-break-inside: avoid; }
          
          /* Reset modal positioning for print */
          .fixed { position: static !important; inset: auto !important; height: auto !important; width: auto !important; background: none !important; }
          .overflow-auto { overflow: visible !important; }
          
          /* Force text color */
          * { color: black !important; text-shadow: none !important; }
          
          /* Hide standard modal chrome */
          .modal-chrome { display: none !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity no-print"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-[110] bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden print:shadow-none print:h-auto print:w-auto print:bg-white print:max-w-none print:rounded-none print:overflow-visible">
        {/* Header Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 no-print modal-chrome">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isRTL ? 'معاينة الطلب' : 'Request Preview'}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
              <FaPrint />
              <span>{isRTL ? 'طباعة' : 'Print'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 p-6 print:p-0 print:bg-white print:overflow-visible">
          {/* Print Content Container (A4 Visual) */}
          <div ref={printRef} className="print-page bg-white text-black mx-auto shadow-lg max-w-[210mm] min-h-[297mm] p-12 print:shadow-none print:mx-0 print:w-full print:max-w-none relative flex flex-col">

            {/* 1. Header Section */}
            <div className="flex justify-between border-b-2 border-black pb-6 mb-8">
              <div className="flex-1">
                {/* Logo Area */}
                <div className="flex items-center gap-4 mb-4">
                  {logoUrl ? (
                    <div className="w-16 h-16 border border-black flex items-center justify-center overflow-hidden">
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs font-bold border border-black text-black">
                      LOGO
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold uppercase tracking-wide text-black">{companyName}</h2>
                    <p className="text-sm text-gray-800">{companyDescription}</p>
                  </div>
                </div>
                <div className="text-sm space-y-1 text-gray-800">
                  <p>{addressLine1}</p>
                  {addressLine2 && <p>{addressLine2}</p>}
                  {location && <p>{location}</p>}
                  <p>{isRTL ? 'الهاتف' : 'Phone'}: {phone}</p>
                  <p>{isRTL ? 'البريد الإلكتروني' : 'Email'}: {email}</p>
                  <p>{isRTL ? 'الرقم الضريبي' : 'Tax ID'}: {taxId}</p>
                </div>
              </div>

              <div className="w-64">
                <div className="border border-black p-4 bg-gray-50 print:bg-transparent">
                  <h3 className="text-lg font-bold border-b border-black mb-2 pb-1 text-center bg-gray-200 print:bg-transparent text-black">
                    {isRTL ? 'طلب شراء' : 'ORDER REQUEST'}
                  </h3>
                  <div className="space-y-2 text-sm text-black">
                    <div className="flex justify-between">
                      <span className="font-bold">{isRTL ? 'رقم الطلب:' : 'Request #:'}</span>
                      <span>{request.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">{isRTL ? 'التاريخ:' : 'Date:'}</span>
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">{isRTL ? 'صالح حتى:' : 'Valid Until:'}</span>
                      <span>{formatDate(request.validUntil || request.expiryDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">{isRTL ? 'الحالة:' : 'Status:'}</span>
                      <span className="uppercase">{request.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Bill To Section */}
            <div className="mb-8">
              <div className="border border-black p-4">
                <h3 className="font-bold border-b border-black mb-3 pb-1 bg-gray-100 print:bg-transparent px-2 text-black">
                  {isRTL ? 'بيانات العميل' : 'Bill To'}
                </h3>
                <div className="text-sm px-2 text-black grid grid-cols-2 gap-4">
                  <p><span className="font-bold">{isRTL ? 'الاسم' : 'Name'}:</span> {request.customerName}</p>
                  <p><span className="font-bold">{isRTL ? 'الهاتف' : 'Phone'}:</span> {request.customerPhone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* 3. Items Table */}
            <div className="mb-8">
              <table className="w-full text-sm border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-100 print:bg-gray-100">
                    <th className="border border-black px-3 py-2 text-center w-12 text-black">#</th>
                    <th className="border border-black px-3 py-2 text-left rtl:text-right text-black">{isRTL ? 'اسم العنصر' : 'Item Name'}</th>
                    <th className="border border-black px-3 py-2 text-center w-24 text-black">{isRTL ? 'النوع' : 'Type'}</th>
                    <th className="border border-black px-3 py-2 text-center w-24 text-black">{isRTL ? 'الفئة' : 'Category'}</th>
                    <th className="border border-black px-3 py-2 text-center w-16 text-black">{isRTL ? 'الكمية' : 'Qty'}</th>
                    <th className="border border-black px-3 py-2 text-right w-24 text-black">{isRTL ? 'السعر' : 'Price'}</th>
                    <th className="border border-black px-3 py-2 text-right w-20 text-black">{isRTL ? 'الخصم' : 'Discount'}</th>
                    <th className="border border-black px-3 py-2 text-right w-24 text-black">{isRTL ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items && request.items.length > 0 ? (
                    request.items.map((item, index) => {
                      const qty = item.quantity || 0
                      const price = Number(item.price || 0)
                      const discount = Number(item.discount || 0)
                      const total = (qty * price) - discount

                      return (
                        <tr key={index} className="print:bg-transparent">
                          <td className="border border-black px-3 py-2 text-center text-black">{index + 1}</td>
                          <td className="border border-black px-3 py-2 text-black font-bold">{item.name}</td>
                          <td className="border border-black px-3 py-2 text-center text-black">{item.type || '-'}</td>
                          <td className="border border-black px-3 py-2 text-center text-black">{item.category || '-'}</td>
                          <td className="border border-black px-3 py-2 text-center text-black">{qty}</td>
                          <td className="border border-black px-3 py-2 text-right text-black">{price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="border border-black px-3 py-2 text-right text-black">{discount > 0 ? discount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                          <td className="border border-black px-3 py-2 text-right font-bold text-black">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan="8" className="border border-black p-4 text-center italic text-black">No Items</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Totals & Notes Section */}
            <div className="flex flex-col md:flex-row gap-8 mb-12">
              {/* Left: Notes */}
              <div className="flex-1">
                {request.notes && (
                  <div className="border border-black p-3 mb-4 h-full">
                    <h4 className="font-bold text-sm mb-2 underline text-black">{isRTL ? 'ملاحظات' : 'Notes / Terms'}:</h4>
                    <p className="text-sm whitespace-pre-line text-black">{request.notes}</p>
                  </div>
                )}
              </div>

              {/* Right: Totals Box */}
              <div className="w-full md:w-80">
                <div className="border border-black">
                  <div className="flex justify-between px-4 py-2 border-b border-black text-sm text-black">
                    <span className="font-medium">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                    <span>{calculatedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2 border-b border-black text-sm text-black">
                    <span className="font-medium">{isRTL ? 'الضريبة' : 'Tax'} (14%)</span>
                    <span>{calculatedTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2 bg-gray-200 print:bg-gray-200 text-base font-bold text-black">
                    <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                    <span>{calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Footer (Signatures) */}
            <div className="mt-auto pt-8">
              <div className="grid grid-cols-3 gap-8 text-center text-sm text-black">
                <div>
                  <div className="h-16 border-b border-black mb-2"></div>
                  <p className="font-bold">{isRTL ? 'إعداد' : 'Prepared By'}</p>
                </div>
                <div>
                  <div className="h-16 border-b border-black mb-2"></div>
                  <p className="font-bold">{isRTL ? 'اعتماد' : 'Approved By'}</p>
                </div>
                <div>
                  <div className="h-16 border-b border-black mb-2"></div>
                  <p className="font-bold">{isRTL ? 'التاريخ' : 'Date'}</p>
                </div>
              </div>

              <div className="text-center mt-12 text-xs text-gray-500 print:text-black">
                <p>Thank you for your business!</p>
                <p>Page 1 of 1</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RequestPreviewModal