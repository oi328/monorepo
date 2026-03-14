import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { useTheme } from '../shared/context/ThemeProvider'
import { logExportEvent } from '../utils/api'
import { FaDownload, FaTimes, FaFileExcel, FaUser, FaPaperclip, FaCloudUploadAlt } from 'react-icons/fa'

export default function ImportPropertiesModal({ onClose, isRTL, onImported }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { t, i18n } = useTranslation()
  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importSummary, setImportSummary] = useState(null)

  // دالة توليد ملف Excel التيمبليت
  const generateTemplate = () => {
    const templateData = [
      {
        'Project': 'Mountain View',
        'Category': 'Residential',
        'Property Type': 'Apartment',
        'Unit Number': 'A-101',
        'Total Price': '5000000',
        'BUA': '150',
        'Bedrooms': '3',
        'Bathrooms': '2',
        'Floor': '1',
        'Finishing': 'Finished',
        'View': 'Garden',
        'Purpose': 'Resale',
        'Status': 'Available',
        'Description': 'Luxury apartment with garden view'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Properties Template')
    
    const fileName = 'properties_template.xlsx'
    XLSX.writeFile(workbook, fileName)
    logExportEvent({
      module: 'Properties',
      fileName,
      format: 'xlsx',
    })
  }

  // دالة التحقق من وجود الحقول المطلوبة
  const validateRequiredFields = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          if (rows.length === 0) {
            reject(new Error('الملف فارغ'))
            return
          }

          const headers = rows[0].map(h => h?.toString()?.toLowerCase()?.trim())
          const requiredFields = ['project', 'unit number', 'total price']
          const missingFields = []

          requiredFields.forEach(field => {
            const found = headers.some(header => 
              header === field || 
              header.includes(field) ||
              (field === 'project' && (header.includes('المشروع') || header.includes('project'))) ||
              (field === 'unit number' && (header.includes('رقم الوحدة') || header.includes('unit'))) ||
              (field === 'total price' && (header.includes('السعر') || header.includes('price')))
            )
            if (!found) {
              missingFields.push(field)
            }
          })

          if (missingFields.length > 0) {
            reject(new Error(`الحقول المطلوبة مفقودة: ${missingFields.join(', ')}`))
          } else {
            resolve(true)
          }
        } catch (error) {
          reject(new Error('خطأ في قراءة الملف'))
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  // دالة معالجة رفع الملف مع التحقق
  const handleFileUpload = async (file) => {
    if (!file) return
    
    try {
      setImportError(null)
      setImportSummary(null)
      await validateRequiredFields(file)
      setExcelFile(file)
    } catch (error) {
      setImportError(error.message)
      setExcelFile(null)
    }
  }

  const handleImport = async () => {
    if (!excelFile) return
    setImporting(true)
    
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        // Simulating API call or processing
        setTimeout(() => {
          if (onImported) onImported(jsonData)
          setImportSummary({ added: jsonData.length })
          setImporting(false)
          // Optional: close after success or let user see summary
          // onClose() 
        }, 1000)
      }
      reader.readAsArrayBuffer(excelFile)
    } catch (error) {
      setImportError('Import failed')
      setImporting(false)
    }
  }

  return (
    <div className={`fixed inset-0 z-[2000] ${isRTL ? 'rtl' : 'ltr'} flex items-start justify-center pt-20`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
<div 
        className="relative max-w-2xl w-full mx-4 rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] transition-colors duration-200"
        style={{
          backgroundColor: isDark ? '#172554' : 'white',
          borderColor: isDark ? '#1e3a8a' : '#e5e7eb',
          color: isDark ? 'white' : '#111827'
        }}
      >        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1e3a8a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <FaDownload className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold  dark:text-white">
              {isRTL ? 'استيراد العقارات' : 'Import Properties'}
            </h3>
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
          <div className="mb-6 p-4 rounded-xl border  border-blue-200 dark:bg-[#1e3a8a]/40 dark:border-[#1e3a8a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaFileExcel className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="text-sm font-semibold  dark:text-white">
                    {t('template.downloadExcel', 'Download Excel Template')}
                  </h4>
                  <p className="text-xs  dark:text-gray-400">
                    {t('template.downloadDescription', 'Use this template to import data correctly')}
                  </p>
                </div>
              </div>
              <button
                onClick={generateTemplate}
                className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none flex items-center gap-2"
              >
                <FaDownload className="w-3 h-3" />
                {t('template.downloadButton', 'Download')}
              </button>
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              <strong>{t('template.requiredFields', 'Required Fields')}:</strong> Project, Unit Number, Total Price
            </div>
          </div>

          {/* Dropzone */}
          <div
            className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-colors duration-300 border-blue-300   dark:border-[#3b82f6] dark:bg-[#1e3a8a]/20 dark:hover:bg-[#1e3a8a]/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file && (/\.xlsx$|\.xls$/i).test(file.name)) {
                await handleFileUpload(file)
              }
            }}
          >
            <FaCloudUploadAlt className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            <p className="text-sm  dark:text-gray-300 text-center">
              {t('import.dropzone', 'Drag and drop Excel file here')}
            </p>
            <input
              id="modal-excel-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={async (e) => {
                const file = e.target.files?.[0] || null
                if (file) {
                  await handleFileUpload(file)
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
              {t('import.browseButton', 'Browse Files')}
            </button>

            {excelFile ? (
              <div className="mt-2 text-xs dark:text-gray-400">
                {t('import.selectedFile', { file: excelFile.name, defaultValue: `Selected: ${excelFile.name}` })}
              </div>
            ) : (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {t('import.noFileSelected', 'No file selected')}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              onClick={handleImport}
              disabled={!excelFile || importing}
              className={`btn btn-sm ${importing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white border-none flex items-center gap-2`}
            >
              <FaDownload className="w-4 h-4" />
              {importing ? t('import.importing', 'Importing...') : t('import.importButton', 'Import Properties')}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('import.supportedFiles', 'Supported files: .xlsx, .xls')}
            </span>
          </div>

          {/* Feedback */}
          {importError && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800">
              {t(importError) || importError}
            </div>
          )}
          {importSummary && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800">
              {t('import.summary', { count: importSummary.added, defaultValue: `Successfully imported ${importSummary.added} properties` })}
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {t('import.supportedFields', 'Supported fields: Project, Unit Number, Total Price, ...')}
          </div>
        </div>
      </div>
    </div>
  )
}
