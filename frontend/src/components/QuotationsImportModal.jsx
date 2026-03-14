import { useState } from 'react'
import * as XLSX from 'xlsx'
import { useTheme } from '../shared/context/ThemeProvider'
import { logExportEvent, logImportEvent } from '../utils/api'
import { FaDownload, FaTimes, FaFileExcel, FaUser, FaPaperclip, FaUpload } from 'react-icons/fa'

const QuotationsImportModal = ({ onClose, onImport, isRTL }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importSummary, setImportSummary] = useState(null)

  // Generate Template
  const generateTemplate = () => {
    const headers = [
      'Customer Code',
      'Customer Name',
      'Status',
      'Date',
      'Tax Amount',
      'Notes',
      'Sales Person',
      'Item Type',
      'Item Category',
      'Item Name',
      'Item Quantity',
      'Item Price',
      'Item Discount',
      'Item Expiry Date'
    ]

    const dummyData = [
        ['C-1001', 'John Doe', 'Draft', '2023-10-01', '140', 'Initial proposal', 'Admin', 'Product', 'Electronics', 'Laptop X1', '1', '1000', '0', ''],
        ['C-1002', 'Jane Smith', 'Sent', '2023-10-02', '50', 'Follow up needed', 'Agent 1', 'Service', 'Consulting', 'Setup Fee', '1', '500', '50', '']
    ]
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dummyData])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Quotations Template')
    const fileName = 'quotations_template.xlsx'
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Quotations',
      fileName,
      format: 'xlsx',
    })
  }

  // Validate Required Fields
  const validateRequiredFields = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
          
          if (jsonData.length < 2) {
            reject(new Error(isRTL ? 'الملف فارغ' : 'File is empty'))
            return
          }

          const headers = jsonData[0].map(h => String(h).toLowerCase().trim())
          const required = ['customer name'] // Minimal requirements
          const missing = required.filter(r => !headers.some(h => h.includes(r)))

          if (missing.length > 0) {
            reject(new Error(isRTL ? `حقول مفقودة: ${missing.join(', ')}` : `Missing fields: ${missing.join(', ')}`))
          } else {
            resolve(true)
          }
        } catch (err) {
          reject(new Error(isRTL ? 'خطأ في قراءة الملف' : 'Error reading file'))
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  // Handle File Upload
  const handleFileUpload = async (file) => {
    if (!file) return
    setImportError(null)
    setImportSummary(null)
    
    try {
      await validateRequiredFields(file)
      setExcelFile(file)
    } catch (error) {
      setImportError(error.message)
      setExcelFile(null)
    }
  }

  // Execute Import
  const executeImport = async () => {
    if (!excelFile) return
    setImporting(true)
    
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)

        // Helper to find key case-insensitively and handle Arabic/English
        const findKey = (row, keys) => {
          const rowKeys = Object.keys(row)
          for (const k of keys) {
            const found = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim())
            if (found) return row[found]
          }
          return null
        }

        const mappedData = jsonData.map(row => {
          const itemQty = Number(findKey(row, ['Item Quantity', 'الكمية', 'Quantity']) || 1)
          const itemPrice = Number(findKey(row, ['Item Price', 'السعر', 'Price']) || 0)
          const itemDiscount = Number(findKey(row, ['Item Discount', 'الخصم', 'Discount']) || 0)
          const tax = Number(findKey(row, ['Tax Amount', 'قيمة الضريبة', 'Tax']) || 0)
          
          const subtotal = (itemQty * itemPrice) - itemDiscount
          const total = subtotal + tax

          const item = {
            id: Date.now() + Math.random(),
            type: findKey(row, ['Item Type', 'النوع', 'Type']) || 'Product',
            category: findKey(row, ['Item Category', 'الفئة', 'Category']) || '',
            name: findKey(row, ['Item Name', 'اسم العنصر', 'Item']) || '',
            quantity: itemQty,
            price: itemPrice,
            discount: itemDiscount,
            expiryDate: findKey(row, ['Item Expiry Date', 'تاريخ الانتهاء', 'Expiry']) || ''
          }

          return {
            customerCode: findKey(row, ['Customer Code', 'كود العميل']) || '',
            customerName: findKey(row, ['Customer Name', 'اسم العميل', 'Customer']),
            status: findKey(row, ['Status', 'الحالة']) || 'Draft',
            createdAt: findKey(row, ['Date', 'التاريخ', 'Date Created']) || new Date().toISOString(),
            total: total,
            tax: tax,
            subtotal: subtotal,
            notes: findKey(row, ['Notes', 'ملاحظات']) || '',
            salesPerson: findKey(row, ['Sales Person', 'مندوب المبيعات']) || '',
            items: [item]
          }
        }).filter(item => item.customerName)

        setImportSummary({ added: mappedData.length })
        logImportEvent({
          module: 'Quotations',
          fileName: excelFile?.name || 'quotations_import.xlsx',
          format: 'xlsx',
          status: 'success',
          meta: { total: mappedData.length },
        })
        setImporting(false)
        
        setTimeout(() => {
           onImport(mappedData)
        }, 1500)
      }
      reader.readAsArrayBuffer(excelFile)
    } catch (err) {
      setImportError(isRTL ? 'فشل الاستيراد' : 'Import failed')
      logImportEvent({
        module: 'Quotations',
        fileName: excelFile?.name || 'quotations_import.xlsx',
        format: 'xlsx',
        status: 'failed',
        error: err?.message,
      })
      setImporting(false)
    }
  }

  return (
    <div className={`fixed inset-0 z-[2000] ${isRTL ? 'rtl' : 'ltr'} flex items-start justify-center pt-20`}>
      <div className="absolute  inset-0 bg-black/50" onClick={onClose} />
      <div 
        className="relative card max-w-2xl w-full mx-4 rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] transition-colors duration-200"
        style={{
          backgroundColor: isDark ? '#172554' : 'white',
          borderColor: isDark ? '#1e3a8a' : '#e5e7eb',
          color: isDark ? 'white' : '#111827'
        }}
      >
        {/* Header */}
        <div 
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b transition-colors duration-200"
          style={{ borderColor: isDark ? '#1e3a8a' : '#e5e7eb' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <FaDownload className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold" style={{ color: isDark ? 'white' : '#111827' }}>{isRTL ? 'استيراد عروض أسعار' : 'Import Quotations'}</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto custom-scrollbar">
          {/* Template Download Section */}
          <div 
            className="mb-6 p-4 rounded-xl border transition-colors duration-200"
            style={{
              backgroundColor: isDark ? 'rgba(30, 58, 138, 0.4)' : '#eff6ff',
              borderColor: isDark ? '#1e40af' : '#bfdbfe'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaFileExcel className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="text-sm font-semibold" style={{ color: isDark ? 'white' : '#111827' }}>
                    {isRTL ? 'تحميل نموذج Excel' : 'Download Excel Template'}
                  </h4>
                  <p className="text-xs" style={{ color: isDark ? '#d1d5db' : '#4b5563' }}>
                    {isRTL ? 'استخدم هذا النموذج لإضافة عروض أسعار جديدة' : 'Use this template to add new quotations'}
                  </p>
                </div>
              </div>
              <button
                onClick={generateTemplate}
                className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none flex items-center gap-2"
              >
                <FaDownload className="w-3 h-3" />
                {isRTL ? 'تحميل' : 'Download'}
              </button>
            </div>
            <div className="mt-3 text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              {isRTL ? 'الرجاء عدم تغيير عناوين الأعمدة في النموذج لضمان الاستيراد الصحيح.' : 'Please do not change column headers in the template to ensure correct import.'}
            </div>
          </div>

          {/* Upload Section */}
          <div 
            className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-white/5"
            style={{ borderColor: isDark ? '#1e40af' : '#d1d5db' }}
          >
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
              <FaUpload size={24} />
            </div>
            <h4 className="font-semibold mb-1" style={{ color: isDark ? 'white' : '#111827' }}>{isRTL ? 'رفع ملف Excel' : 'Upload Excel File'}</h4>
            <p className="text-xs mb-4 max-w-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
              {isRTL ? 'قم بسحب وإفلات الملف هنا أو اضغط للاختيار' : 'Drag and drop your file here or click to browse'}
            </p>
            
            <input
              id="modal-excel-file-input"
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => {
                const file = e.target.files[0]
                if (file) {
                  handleFileUpload(file)
                } else {
                  setExcelFile(null)
                }
              }}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => document.getElementById('modal-excel-file-input')?.click()}
              className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none"
            >
              {isRTL ? 'اختيار ملف' : 'Browse File'}
            </button>

            {excelFile ? (
              <div className="mt-2 text-xs" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>{isRTL ? 'تم اختيار: ' + excelFile.name : 'Selected: ' + excelFile.name}</div>
            ) : (
              <div className="mt-2 text-xs" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>{isRTL ? 'لم يتم اختيار ملف' : 'No file selected'}</div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              onClick={executeImport}
              disabled={!excelFile || importing}
              className={`btn btn-sm ${importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white border-none flex items-center gap-2`}
            >
              <FaDownload className="w-4 h-4" />
              {importing ? (isRTL ? 'جاري الاستيراد...' : 'Importing...') : (isRTL ? 'استيراد البيانات' : 'Import Data')}
            </button>
            <span className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>{isRTL ? 'الملفات المدعومة: .xlsx, .xls' : 'Supported files: .xlsx, .xls'}</span>
          </div>

          {/* Feedback */}
          {importError && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800">
              {importError}
            </div>
          )}
          {importSummary && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800">
              {isRTL ? `تم استيراد ${importSummary.added} عرض سعر بنجاح` : `Successfully imported ${importSummary.added} quotations`}
            </div>
          )}

          <div className="mt-3 text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
            {isRTL ? 'الحقول المدعومة: اسم العميل، التاريخ، تفاصيل العناصر (الاسم، السعر، الكمية)...' : 'Supported Fields: Customer Name, Date, Item Details (Name, Price, Qty)...'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuotationsImportModal
