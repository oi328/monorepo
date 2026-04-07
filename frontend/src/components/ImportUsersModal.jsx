import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../shared/context/ThemeProvider'
import * as XLSX from 'xlsx'
import { logExportEvent } from '../utils/api'
import { FaDownload, FaTimes, FaFileExcel } from 'react-icons/fa'

const ImportUsersModal = ({
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
        'Full Name': 'Ahmed Mohamed',
        'Email': 'ahmed@example.com', 
        'Phone': '01000000000',
        'Role': 'Agent',
        'Status': 'Active',
        'Department': 'Sales'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users Template')
    
    const fileName = 'users_template.xlsx'
    XLSX.writeFile(workbook, fileName)
    logExportEvent({
      module: 'Users',
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
          const requiredFields = ['full name', 'email', 'phone'] // Basic requirements
          const missingFields = []

          requiredFields.forEach(field => {
            const found = headers.some(header => 
              header.includes(field) || 
              (header.includes('name') && field === 'full name') ||
              (header.includes('الاسم') && field === 'full name') ||
              (header.includes('البريد') && field === 'email') ||
              (header.includes('الهاتف') && field === 'phone')
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
      
      const importedUsers = jsonData.map(row => ({
         id: row['ID'] || row['id'] || `u-${Date.now() + Math.random()}`,
         fullName: row['Full Name'] || row['fullName'] || row['Name'] || row['الاسم'] || '',
         email: row['Email'] || row['email'] || row['البريد'] || '',
         phone: row['Phone'] || row['phone'] || row['الهاتف'] || '',
         role: row['Role'] || row['role'] || row['الدور'] || 'Viewer',
         status: row['Status'] || row['status'] || row['الحالة'] || 'Active',
         department: row['Department'] || row['department'] || row['القسم'] || '',
         createdAt: new Date().toISOString().split('T')[0],
         devices: []
      })).filter(u => u.fullName && u.email)

      if (importedUsers.length === 0) {
         throw new Error(isArabic ? 'لا توجد بيانات صالحة للاستيراد' : 'No valid data found to import')
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setImportSummary({ added: importedUsers.length })
      if (onImportSuccess) {
        onImportSuccess(importedUsers)
      }
      
      // Close after short delay or let user close
      // setTimeout(() => onClose(), 2000)
      
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
        className="relative   card max-w-2xl w-full mx-4 rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] transition-colors duration-200 animate-in fade-in zoom-in-95"
        style={{
          
          borderColor: isDark ? '#1e3a8a' : '#e5e7eb',
          color: isDark ? 'white' : '#111827'
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1e3a8a]">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 ${isDark ? 'text-white' : 'text-black'}  shadow-md`}>
              <FaDownload className="w-4 h-4" />
            </div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`}>
              {isArabic ? 'استيراد مستخدمين' : 'Import Users'}
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
          <div className="mb-6 p-4  rounded-xl border border-blue-200 dark:border-[#1e3a8a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaFileExcel className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-black'}`}>
                    {t('template.downloadExcel', 'Download Excel Template')}
                  </h4>
                  <p className={`text-xs ${isDark ? 'text-white' : 'text-black'}`}>
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
            <div className={`mt-3 text-xs ${isDark ? 'text-white' : 'text-black'}`}>
              <strong>{t('template.requiredFields', 'Required Fields')}:</strong> Full Name, Email, Phone
            </div>
          </div>

          {/* Dropzone */}
          <div
            className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-blue-300 dark:border-[#3b82f6]  dark:hover:bg-[#1e3a8a]/40 transition-colors duration-300"
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
            <p className={`text-sm ${isDark ? 'text-white' : 'text-black'}  text-center`}>
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
              <div className={`mt-2 text-xs ${isDark ? 'text-white' : 'text-black'}`}>
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
            <span className={`text-xs ${isDark ? 'text-white' : 'text-black'}`}>
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
              {isArabic ? `تم استيراد ${importSummary.added} مستخدم بنجاح` : `Successfully imported ${importSummary.added} users`}
            </div>
          )}

          <div className={`mt-3 text-xs ${isDark ? 'text-white' : 'text-black'}`}>
             {isArabic ? 'الحقول المدعومة: الاسم الكامل، البريد الإلكتروني، الهاتف، الدور، الحالة، القسم' : 'Supported Fields: Full Name, Email, Phone, Role, Status, Department'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportUsersModal
