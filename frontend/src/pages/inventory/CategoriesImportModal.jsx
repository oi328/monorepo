import { useState } from 'react'
import * as XLSX from 'xlsx'
import { useTheme } from '../../shared/context/ThemeProvider'
import { useTranslation } from 'react-i18next'
import { logExportEvent, logImportEvent } from '../../utils/api'
import { FaFileExcel, FaTimes, FaUpload, FaDownload, FaCloudUploadAlt } from 'react-icons/fa'

export default function CategoriesImportModal({ isOpen, onClose, onImport }) {
  const { theme } = useTheme()
  const { i18n } = useTranslation()
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
        module: 'Categories',
        fileName: excelFile?.name || 'categories_import.xlsx',
        format: 'xlsx',
        status: 'success',
        meta: { total: rows.length },
      })
    } catch (e) {
      setImportError(isRTL ? 'حدث خطأ أثناء استيراد الملف' : 'Error while importing file')
      logImportEvent({
        module: 'Categories',
        fileName: excelFile?.name || 'categories_import.xlsx',
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
        Name: isRTL ? 'اسم التصنيف' : 'Category Name',
        Type: isRTL ? 'النوع' : 'Type',
        Parent: isRTL ? 'التصنيف الأب' : 'Parent Category',
      },
    ]
    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories Template')
    const fileName = 'categories_template.xlsx'
    XLSX.writeFile(workbook, fileName)
    logExportEvent({
      module: 'Categories',
      fileName,
      format: 'xlsx',
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg rounded-xl shadow-2xl border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FaFileExcel className="text-green-500" />
            <h2 className="text-sm font-semibold">
              {isRTL ? 'استيراد التصنيفات من ملف Excel' : 'Import Categories from Excel'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <FaTimes />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-600 dark:text-gray-300">
              <p>{isRTL ? 'قم بتحميل ملف التصنيفات بصيغة Excel.' : 'Upload your categories Excel file.'}</p>
              <p className="mt-1">
                {isRTL
                  ? 'تأكد من وجود الأعمدة الأساسية مثل الاسم والنوع.'
                  : 'Make sure columns like name and type exist.'}
              </p>
            </div>
            <button
              type="button"
              onClick={generateTemplate}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <FaDownload />
              {isRTL ? 'تحميل نموذج' : 'Download Template'}
            </button>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
              {isRTL ? 'ملف Excel' : 'Excel file'}
            </span>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-4 py-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400">
              <input
                type="file"
                accept=".xls,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <FaCloudUploadAlt className="text-2xl text-blue-500" />
                <div>
                  {excelFile
                    ? excelFile.name
                    : isRTL
                      ? 'اسحب الملف هنا أو اضغط للاختيار'
                      : 'Drag and drop or click to choose file'}
                </div>
              </div>
            </div>
          </label>

          {importError && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md px-3 py-2">
              {importError}
            </div>
          )}

          {importSummary && (
            <div className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-md px-3 py-2">
              {isRTL
                ? `تم تجهيز ${importSummary.total} تصنيف للاستيراد`
                : `Prepared ${importSummary.total} categories for import`}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={!excelFile || importing}
            onClick={handleImport}
            className="px-4 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {importing && (
              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isRTL ? 'استيراد' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}
