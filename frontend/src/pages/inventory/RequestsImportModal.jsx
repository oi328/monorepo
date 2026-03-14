import { useState } from 'react'
import * as XLSX from 'xlsx'
import { useTheme } from '../../shared/context/ThemeProvider'
import { useTranslation } from 'react-i18next'
import { logExportEvent, logImportEvent } from '../../utils/api'
import { FaFileExcel, FaTimes, FaUpload, FaDownload } from 'react-icons/fa'

export default function RequestsImportModal({ isOpen, onClose, onImport }) {
  const { theme } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  const isDark = theme === 'dark'

  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importSummary, setImportSummary] = useState(null)

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setExcelFile(file || null)
    setImportError(null)
    setImportSummary(null)
  }

  const handleImport = async () => {
    if (!excelFile) return
    setImporting(true)
    setImportError(null)
    try {
      const data = await excelFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(worksheet)
      
      if (!Array.isArray(rows) || rows.length === 0) {
        setImportError(isRTL ? 'الملف فارغ' : 'File is empty')
        setImporting(false)
        return
      }
      
      if (typeof onImport === 'function') {
        await onImport(rows)
      }
      
      setImportSummary({ total: rows.length })
      logImportEvent({
        module: 'Requests',
        fileName: excelFile?.name || 'requests_import.xlsx',
        format: 'xlsx',
        status: 'success',
        meta: { total: rows.length },
      })
      
      // Close after short delay if successful
      setTimeout(() => {
        onClose()
      }, 1500)
      
    } catch (e) {
      console.error(e)
      setImportError(isRTL ? 'حدث خطأ أثناء استيراد الملف' : 'Error while importing file')
      logImportEvent({
        module: 'Requests',
        fileName: excelFile?.name || 'requests_import.xlsx',
        format: 'xlsx',
        status: 'failed',
        error: e?.message,
      })
    } finally {
      setImporting(false)
    }
  }

  const generateTemplate = () => {
    const templateData = [
      {
        'Customer Name': 'John Doe',
        'Customer Phone': '123456789',
        'Product': 'Laptop',
        'Quantity': 1,
        'Price': 1000,
        'Priority': 'Medium', // Low, Medium, High
        'Type': 'Inquiry', // Inquiry, Booking, Maintenance
        'Payment Plan': 'Cash',
        'Notes': 'Urgent request'
      },
      {
        'Customer Name': 'Jane Smith',
        'Customer Phone': '987654321',
        'Product': 'Mouse',
        'Quantity': 5,
        'Price': 20,
        'Priority': 'Low',
        'Type': 'Booking',
        'Payment Plan': 'Credit Card',
        'Notes': ''
      }
    ]
    
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Requests Template')
    const fileName = 'requests_template.xlsx'
    XLSX.writeFile(workbook, fileName)
    
    logExportEvent({
      module: 'Requests',
      fileName,
      format: 'xlsx',
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl shadow-2xl border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} transform transition-all`}>
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FaFileExcel className="text-green-600 dark:text-green-400 text-xl" />
            </div>
            <h2 className="text-lg font-bold text-gray-100">
              {isRTL ? 'استيراد الطلبات' : 'Import Requests'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors text-theme"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Download Template Section */}
          <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
            <div className="flex items-start gap-3">
              <div className="mt-1 text-blue-500">
                <FaDownload />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300 text-sm mb-1">
                  {isRTL ? 'تحميل القالب' : 'Download Template'}
                </h3>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mb-3">
                  {isRTL 
                    ? 'قم بتحميل ملف القالب لملء البيانات بشكل صحيح قبل الرفع.' 
                    : 'Download the template file to fill in the data correctly before uploading.'}
                </p>
                <button
                  onClick={generateTemplate}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium inline-flex items-center gap-2"
                >
                  {isRTL ? 'تحميل القالب' : 'Download Template'}
                </button>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {isRTL ? 'اختر ملف Excel' : 'Select Excel File'}
            </label>
            
            <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              excelFile 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/10' 
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
            }`}>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2 pointer-events-none">
                <FaUpload className={`text-3xl ${excelFile ? 'text-green-500' : 'text-gray-400'}`} />
                {excelFile ? (
                  <div className="text-sm font-medium text-green-700 dark:text-green-400">
                    {excelFile.name}
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {isRTL ? 'اضغط للرفع أو اسحب الملف هنا' : 'Click to upload or drag file here'}
                    </span>
                    <span className="text-xs text-gray-400">
                      XLSX, XLS
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {importError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800/50">
              {importError}
            </div>
          )}

          {/* Summary Message */}
          {importSummary && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm border border-green-100 dark:border-green-800/50">
              {isRTL 
                ? `تم قراءة ${importSummary.total} صف بنجاح. جاري المعالجة...` 
                : `Successfully read ${importSummary.total} rows. Processing...`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-none flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            disabled={importing}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleImport}
            disabled={!excelFile || importing}
            className={`px-6 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all ${
              !excelFile || importing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
            }`}
          >
            {importing ? (
              <span className="flex items-center gap-2">
                <span className="loading loading-spinner loading-xs"></span>
                {isRTL ? 'جاري الاستيراد...' : 'Importing...'}
              </span>
            ) : (
              isRTL ? 'استيراد' : 'Import'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
