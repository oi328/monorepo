import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'
import * as XLSX from 'xlsx'
import { logExportEvent } from '../utils/api'
import { FaDownload, FaTimes, FaFileExcel } from 'react-icons/fa'

const ImportDepartmentsModal = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isArabic = i18n.language === 'ar'

  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importSummary, setImportSummary] = useState(null)

  // Generate Template
  const generateTemplate = () => {
    const templateData = [
      {
        'Name': 'New Department',
        'Manager': 'Manager Name',
        'Teams Count': 0,
        'Employees Count': 0,
        'Status': 'Active'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Departments Template')
    
    const fileName = 'departments_template.xlsx'
    XLSX.writeFile(workbook, fileName)
    logExportEvent({
      module: 'Departments',
      fileName,
      format: 'xlsx',
    })
  }

  // Validate File
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
            reject(new Error(isArabic ? 'الملف فارغ' : 'File is empty'))
            return
          }

          const headers = rows[0].map(h => h?.toString()?.toLowerCase()?.trim())
          const requiredFields = ['name']
          const missingFields = []

          requiredFields.forEach(field => {
            const found = headers.some(header => 
              header.includes(field) || 
              (header.includes('name') && field === 'name') ||
              (header.includes('الاسم') && field === 'name')
            )
            if (!found) {
              missingFields.push(field)
            }
          })

          if (missingFields.length > 0) {
            reject(new Error(isArabic ? `الحقول المطلوبة مفقودة: ${missingFields.join(', ')}` : `Missing required fields: ${missingFields.join(', ')}`))
          } else {
            resolve(true)
          }
        } catch (error) {
          reject(new Error(isArabic ? 'خطأ في قراءة الملف' : 'Error reading file'))
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

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

  const handleImport = async () => {
    if (!excelFile) return
    setImporting(true)
    setImportError(null)

    try {
      const data = await excelFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      
      const importedData = jsonData.map(row => ({
         id: row['ID'] || row['id'] || `d-${Date.now() + Math.random()}`,
         name: row['Name'] || row['name'] || row['الاسم'] || '',
         manager: row['Manager'] || row['manager'] || row['المدير'] || '',
         teamsCount: Number(row['Teams Count'] || row['teamsCount'] || row['عدد الفرق'] || 0),
         employeesCount: Number(row['Employees Count'] || row['employeesCount'] || row['عدد الموظفين'] || 0),
         status: row['Status'] || row['status'] || row['الحالة'] || 'Active',
         createdAt: new Date().toISOString().split('T')[0]
      })).filter(d => d.name)

      if (importedData.length === 0) {
         throw new Error(isArabic ? 'لا توجد بيانات صالحة للاستيراد' : 'No valid data found to import')
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setImportSummary({ added: importedData.length })
      if (onImportSuccess) {
        onImportSuccess(importedData)
      }
      
    } catch (error) {
      console.error(error)
      setImportError(error.message || (isArabic ? 'فشل استيراد الملف' : 'Failed to import file'))
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-[2000] ${isArabic ? 'rtl' : 'ltr'} flex items-start justify-center pt-20`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div 
        className="relative max-w-2xl w-full mx-4 rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] transition-colors duration-200 animate-in fade-in zoom-in-95"
        style={{
          backgroundColor: isDark ? '#172554' : 'white',
          borderColor: isDark ? '#1e3a8a' : '#e5e7eb',
          color: isDark ? 'white' : '#111827'
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1e3a8a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <FaDownload className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold dark:text-white">
              {isArabic ? 'استيراد أقسام' : 'Import Departments'}
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
          <div className="mb-6 p-4 dark:bg-[#1e3a8a]/40 rounded-xl border border-blue-200 dark:border-[#1e3a8a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaFileExcel className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="text-sm font-semibold dark:text-white">
                    {t('template.downloadExcel', 'Download Excel Template')}
                  </h4>
                  <p className="text-xs dark:text-gray-400">
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
            <div className="mt-3 text-xs dark:text-gray-400">
              <strong>{t('template.requiredFields', 'Required Fields')}:</strong> Name
            </div>
          </div>

          {/* Dropzone */}
          <div
            className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-blue-300 dark:border-[#3b82f6] dark:bg-[#1e3a8a]/20 dark:hover:bg-[#1e3a8a]/40 transition-colors duration-300"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file && (/\.xlsx$|\.xls$/i).test(file.name)) {
                await handleFileUpload(file)
              }
            }}
          >
            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0l-3 3m3-3l3 3m7 4v12m0 0l-3-3m3 3l3-3" />
            </svg>
            <p className="dark:text-gray-300 text-center">
              {t('import.dropzone', 'Drag and drop Excel file here or click to browse')}
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
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {isArabic ? `تم اختيار: ${excelFile.name}` : `Selected: ${excelFile.name}`}
              </div>
            ) : (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {isArabic ? 'لم يتم اختيار ملف' : 'No file selected'}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              onClick={handleImport}
              disabled={!excelFile || importing}
              className={`btn btn-sm ${importing ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white border-none flex items-center gap-2`}
            >
              <FaDownload className="w-4 h-4" />
              {importing ? (isArabic ? 'جاري الاستيراد...' : 'Importing...') : (isArabic ? 'استيراد البيانات' : 'Import Data')}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
               {isArabic ? 'الملفات المدعومة: .xlsx, .xls' : 'Supported files: .xlsx, .xls'}
            </span>
          </div>

          {/* Feedback */}
          {importError && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800">
              {importError}
            </div>
          )}
          {importSummary && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800">
              {isArabic ? `تم استيراد ${importSummary.added} قسم بنجاح` : `Successfully imported ${importSummary.added} departments`}
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
             {isArabic ? 'الحقول المدعومة: اسم القسم، المدير، الحالة' : 'Supported Fields: Name, Manager, Status'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportDepartmentsModal
