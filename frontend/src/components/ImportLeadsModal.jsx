import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'
import { useAppState } from '@shared/context/AppStateProvider'
import * as XLSX from 'xlsx'
import { logExportEvent } from '../utils/api'
import { FaDownload,FaTimes,FaFileExcel,FaUser, FaPaperclip } from 'react-icons/fa'

const ImportLeadsModal = ({
  isOpen,
  onClose,
  companyType,
  excelFile,
  setExcelFile,
  importing,
  importError,
  importSummary,
  onImport,
}) => {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const { company } = useAppState()
  const isDark = theme === 'dark'

  const typeLower = String(companyType || '').toLowerCase()
  const isGeneral = typeLower === 'general'
  const isRealEstate = typeLower === 'realestate' || typeLower === 'real estate' || typeLower === 'real_estate'

  // دالة توليد ملف Excel التيمبليت
  const generateTemplate = () => {
    // الترتيب المطلوب:
    // name, mobile, other mobile, email, source, (project/item), sales person, stage, comment, priority, notes
    
    const base = {
      'Name': 'lead name',
      'Mobile': '01000000000',
      'Phone Country': '+20',
      'Other Mobile': '01111111111',
      'Email': 'ahmed@example.com',
      'Source': 'Cold-Call',
    }
    
    // Project/Item بناءً على نوع التينانت
    const middle = isGeneral 
      ? { 'Item': 'اسم الصنف' }
      : { 'Project': 'اسم المشروع' } // سواء عقارات أو غيره طالما ليس عام

    const tail = {
      'Sales Person': 'اسم البائع',
      'Stage': 'new',
      'Next Action Date': '2026-04-01',
      'Next Action Time': '09:30',
      'Comment': 'تعليق إضافي',
      'Priority': 'medium',
      'Notes': 'ملاحظات',
    }

    const templateData = [{ ...base, ...middle, ...tail }]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Template')
    
    // Use company name in filename if available
    const companyName = company?.name ? company.name.replace(/[^a-zA-Z0-9]/g, '_') : 'tenant';
    const fileName = `${companyName}_leads_template.xlsx`;
    
    XLSX.writeFile(workbook, fileName)
    logExportEvent({
      module: 'Leads',
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
          const missingFields = []

          // Require: Name, Phone, Source, and (Project OR Item)
          const hasName = headers.some(h => h.includes('lead') || h.includes('name') || h.includes('الاسم'))
          const hasPhone = headers.some(h => h.includes('phone') || h.includes('mobile') || h.includes('الهاتف') || h.includes('الموبايل'))
          const hasSource = headers.some(h => h.includes('source') || h.includes('المصدر'))
          const hasProject = headers.some(h => h.includes('project') || h.includes('project/item') || h.includes('المشروع'))
          const hasItem = headers.some(h => h.includes('item') || h.includes('الصنف'))
          if (!hasName) missingFields.push('Name')
          if (!hasPhone) missingFields.push('Phone')
          if (!hasSource) missingFields.push('Source')
          if (!(hasProject || hasItem)) missingFields.push('Project/Item')

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
      await validateRequiredFields(file)
      setExcelFile(file)
    } catch (error) {
      alert(error.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-[2000] ${i18n.language === 'ar' ? 'rtl' : 'ltr'} flex items-start justify-center pt-20`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
<div 
        className="relative max-w-2xl w-full mx-4 rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] transition-colors duration-200"
        style={{
          backgroundColor: isDark ? '#172554' : 'white',
          borderColor: isDark ? '#1e3a8a' : '#e5e7eb',
          color: isDark ? 'white' : '#111827'
        }}
      >        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1e3a8a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <FaDownload className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold  dark:text-white">{t('import.title')}</h3>
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
          <div className="mb-6 p-4  dark:bg-[#1e3a8a]/40 rounded-xl border border-blue-200 dark:border-[#1e3a8a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaFileExcel className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="text-sm font-semibold dark:text-white">
                    {t('template.downloadExcel')}
                  </h4>
                  <p className="text-xs  dark:text-gray-400">
                    {t('template.downloadDescription')}
                  </p>
                </div>
              </div>
              <button
                onClick={generateTemplate}
                className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none flex items-center gap-2"
              >
                <FaDownload className="w-3 h-3" />
                {t('template.downloadButton')}
              </button>
            </div>
            <div className="mt-3 text-xs  dark:text-gray-400">
              <strong>{t('template.requiredFields')}</strong> {i18n.language==='ar'
                ? (isGeneral ? 'الاسم، رقم التليفون، المصدر، الصنف' : 'الاسم، رقم التليفون، المصدر، المشروع')
                : (isGeneral ? 'Name, Phone, Source, Item' : 'Name, Phone, Source, Project')}
            </div>
          </div>

          {/* Dropzone */}
          <div
            className="group relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-blue-300 dark:border-[#3b82f6]  dark:bg-[#1e3a8a]/20  dark:hover:bg-[#1e3a8a]/40 transition-colors duration-300"
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
              {t('import.dropzone')}
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
              {t('import.browseButton')}
            </button>

            {excelFile ? (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">{t('import.selectedFile', { file: excelFile.name })}</div>
            ) : (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">{t('import.noFileSelected')}</div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              onClick={onImport}
              disabled={!excelFile || importing}
              className={`btn btn-sm ${importing ? ' cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white border-none flex items-center gap-2`}
            >
              <FaDownload className="w-4 h-4" />
              {importing ? t('import.importing') : t('import.importButton')}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('import.supportedFiles')}</span>
          </div>

          {/* Feedback */}
          {importError && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800">
              {t(importError)}
            </div>
          )}
          {importSummary && (
            <div className="mt-4 space-y-3">
              <div className="px-4 py-3 rounded-lg bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800">
                {t('import.summary', { count: importSummary.added })}
              </div>

              {(typeof importSummary.duplicates === 'number' || typeof importSummary.newCount === 'number') && (
                <div className="px-4 py-3 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800/60 text-sm">
                  {i18n.language === 'ar'
                    ? `جديد: ${typeof importSummary.newCount === 'number' ? importSummary.newCount : '-'} — مكرر: ${typeof importSummary.duplicates === 'number' ? importSummary.duplicates : '-'}${typeof importSummary.duplicateExisting === 'number' ? ` (قاعدة البيانات: ${importSummary.duplicateExisting})` : ''}${typeof importSummary.duplicateInFile === 'number' ? ` (داخل الملف: ${importSummary.duplicateInFile})` : ''}`
                    : `New: ${typeof importSummary.newCount === 'number' ? importSummary.newCount : '-'} — Duplicates: ${typeof importSummary.duplicates === 'number' ? importSummary.duplicates : '-'}${typeof importSummary.duplicateExisting === 'number' ? ` (DB: ${importSummary.duplicateExisting})` : ''}${typeof importSummary.duplicateInFile === 'number' ? ` (File: ${importSummary.duplicateInFile})` : ''}`}
                </div>
              )}
               
              {importSummary.errors && importSummary.errors.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {i18n.language === 'ar' ? 'تنبيهات أثناء الاستيراد:' : 'Import Warnings:'}
                  </h4>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {importSummary.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {t('import.supportedFields')}
          </div>
        </div>


      </div>
    </div>
  )
}

export default ImportLeadsModal
