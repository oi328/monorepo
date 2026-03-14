import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useReactToPrint } from 'react-to-print'
import { FaPrint, FaTimes } from 'react-icons/fa'

const SalesInvoicePreviewModal = ({ isOpen, onClose, invoice }) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  const printRef = useRef()

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice-${invoice?.id || 'New'}`,
    onAfterPrint: () => console.log('Printed successfully'),
    onPrintError: (error) => console.error('Print failed:', error),
  })

  if (!isOpen || !invoice) return null

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Helper to handle quantity field inconsistency (qty vs quantity)
  const getItemQuantity = (item) => item.quantity || item.qty || 0

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

      {/* Backdrop - Hidden on print */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity no-print" 
        onClick={onClose} 
      />

      {/* Modal Content */}
      <div className="relative z-[110] bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden print:shadow-none print:h-auto print:w-auto print:bg-white print:max-w-none print:rounded-none print:overflow-visible">
        
        {/* Header Actions - Hidden on print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 no-print modal-chrome">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isRTL ? 'معاينة الفاتورة' : 'Invoice Preview'}
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
                    <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs font-bold border border-black text-black">
                      LOGO
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold uppercase tracking-wide text-black">Your Company</h2>
                      <p className="text-sm text-gray-800">Innovative Solutions Co.</p>
                    </div>
                 </div>
                 <div className="text-sm space-y-1 text-gray-800">
                   <p>123 Business Avenue, Tech District</p>
                   <p>Cairo, Egypt, 11511</p>
                   <p>Phone: +20 123 456 7890</p>
                   <p>Email: sales@yourcompany.com</p>
                   <p>Tax ID: 123-456-789</p>
                 </div>
              </div>

              <div className="w-64">
                <div className="border border-black p-4 bg-gray-50 print:bg-transparent">
                  <h3 className="text-lg font-bold border-b border-black mb-2 pb-1 text-center bg-gray-200 print:bg-transparent text-black">
                    {isRTL ? 'فاتورة ضريبية' : 'TAX INVOICE'}
                  </h3>
                  <div className="space-y-2 text-sm text-black">
                    <div className="flex justify-between">
                      <span className="font-bold">{isRTL ? 'رقم الفاتورة:' : 'Invoice #:'}</span>
                      <span>{invoice.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">{isRTL ? 'التاريخ:' : 'Date:'}</span>
                      <span>{formatDate(invoice.date)}</span>
                    </div>
                    {invoice.dueDate && (
                      <div className="flex justify-between">
                        <span className="font-bold">{isRTL ? 'الاستحقاق:' : 'Due Date:'}</span>
                        <span>{formatDate(invoice.dueDate)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                       <span className="font-bold">{isRTL ? 'الحالة:' : 'Status:'}</span>
                       <span className="uppercase">{invoice.status}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="font-bold">{isRTL ? 'نوع الفاتورة:' : 'Invoice Type:'}</span>
                       <span>{invoice.invoiceType || 'Full'}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="font-bold">{isRTL ? 'طريقة الدفع:' : 'Payment Method:'}</span>
                       <span>{invoice.paymentMethod || invoice.paymentType || '-'}</span>
                    </div>
                    {invoice.paymentTerms && (
                      <div className="flex justify-between">
                         <span className="font-bold">{isRTL ? 'شروط الدفع:' : 'Payment Terms:'}</span>
                         <span>{invoice.paymentTerms}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Bill To / Ship To Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="border border-black p-4">
                 <h3 className="font-bold border-b border-black mb-3 pb-1 bg-gray-100 print:bg-transparent px-2 text-black">
                   {isRTL ? 'بيانات العميل' : 'Bill To'}
                 </h3>
                 <div className="text-sm px-2 space-y-1 text-black">
                   <p className="font-bold text-lg">{invoice.customerName}</p>
                   <p>Code: {invoice.customerCode}</p>
                   <p>Address Line 1</p>
                   <p>City, State, Zip</p>
                   <p>Phone: +1 234 567 890</p>
                 </div>
              </div>
              <div className="border border-black p-4">
                 <h3 className="font-bold border-b border-black mb-3 pb-1 bg-gray-100 print:bg-transparent px-2 text-black">
                   {isRTL ? 'عنوان الشحن' : 'Ship To'}
                 </h3>
                 <div className="text-sm px-2 space-y-1 text-black">
                   <p className="font-bold text-lg">{invoice.customerName}</p>
                   <p>Shipping Address Line 1</p>
                   <p>City, State, Zip</p>
                   <p>Contact Person</p>
                 </div>
              </div>
            </div>

            {/* 3. Items Table */}
            <div className="mb-8">
              <table className="w-full text-sm border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-100 print:bg-gray-100">
                    <th className="border border-black px-3 py-2 text-center w-12 text-black">#</th>
                    <th className="border border-black px-3 py-2 text-left rtl:text-right text-black">{isRTL ? 'الوصف' : 'Description'}</th>
                    <th className="border border-black px-3 py-2 text-center w-20 text-black">{isRTL ? 'الكمية' : 'Qty'}</th>
                    <th className="border border-black px-3 py-2 text-right w-32 text-black">{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th className="border border-black px-3 py-2 text-right w-32 text-black">{isRTL ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, index) => {
                      const qty = getItemQuantity(item)
                      const price = Number(item.price || 0)
                      // Handle both item-level discount and proportional global discount if needed
                      // For now, we display the row total as (qty * price) - item.discount
                      const itemDiscount = Number(item.discount || 0)
                      const total = (qty * price) - itemDiscount
                      
                      return (
                        <tr key={index} className="print:bg-transparent">
                          <td className="border border-black px-3 py-2 text-center text-black">{index + 1}</td>
                          <td className="border border-black px-3 py-2 text-black">
                            <div className="font-bold">{item.name}</div>
                            <div className="text-xs text-gray-600 print:text-black">{item.type} - {item.category}</div>
                          </td>
                          <td className="border border-black px-3 py-2 text-center text-black">{qty}</td>
                          <td className="border border-black px-3 py-2 text-right text-black">{price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="border border-black px-3 py-2 text-right font-bold text-black">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )
                    })
                  ) : (
                     <tr><td colSpan="5" className="border border-black p-4 text-center italic text-black">No Items</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 4. Totals & Notes Section */}
            <div className="flex flex-col md:flex-row gap-8 mb-12">
               {/* Left: Notes */}
               <div className="flex-1">
                  {invoice.notes && (
                    <div className="border border-black p-3 mb-4 h-full">
                      <h4 className="font-bold text-sm mb-2 underline text-black">{isRTL ? 'ملاحظات' : 'Notes / Terms'}:</h4>
                      <p className="text-sm whitespace-pre-line text-black">{invoice.notes}</p>
                    </div>
                  )}
               </div>

               {/* Right: Totals Box */}
               <div className="w-full md:w-80">
                  <div className="border border-black">
                     <div className="flex justify-between px-4 py-2 border-b border-black text-sm text-black">
                        <span className="font-medium">{isRTL ? 'المجموع الفرعي' : 'Subtotal'}</span>
                        <span>{Number(invoice.subtotal || invoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-between px-4 py-2 border-b border-black text-sm text-black">
                        <span className="font-medium">{isRTL ? 'قيمة الخصم' : 'Discount Value'}</span>
                        <span>{Number(invoice.discountAmount || invoice.discount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-between px-4 py-2 border-b border-black text-sm text-black">
                        <span className="font-medium">{isRTL ? 'الضريبة' : 'Tax'}</span>
                        <span>{Number(invoice.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-between px-4 py-2 bg-gray-200 print:bg-gray-200 text-base font-bold text-black border-b border-black">
                        <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                        <span>{Number(invoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-between px-4 py-2 border-b border-black text-sm text-black">
                        <span className="font-medium">{isRTL ? 'المبلغ المدفوع' : 'Paid Amount'}</span>
                        <span>{Number(invoice.paidAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-between px-4 py-2 text-sm text-black font-bold text-red-600">
                        <span className="font-medium text-black">{isRTL ? 'المستحق' : 'Balance Due'}</span>
                        <span>{Number(invoice.total - (invoice.paidAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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

export default SalesInvoicePreviewModal
