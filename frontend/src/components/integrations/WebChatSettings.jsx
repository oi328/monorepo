import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { webChatService } from '../../services/webChatService'

export default function WebChatSettings({ onClose }) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState(() => webChatService.loadSettings())
  
  useEffect(() => {
    webChatService.saveSettings(settings)
  }, [settings])

  const handleChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))
  
  const resetAll = () => {
    webChatService.resetSettings()
    setSettings({})
  }

  const Badge = ({ ok, label }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
      {label}
    </span>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-bold">{t('WebChat Widget Settings')}</h2>
          <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar">
            <Badge ok={!!settings.isEnabled} label={settings.isEnabled ? t('Active') : t('Inactive')} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
           <button onClick={onClose} className="btn btn-outline btn-sm rtl:flex-row-reverse">{t('Back to Integrations')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card glass-card p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{t('Widget Appearance')}</h3>
            <button className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" onClick={resetAll}>{t('Reset')}</button>
          </div>
          
          <div className="flex items-center gap-2 p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
            <input id="isEnabled" type="checkbox" checked={!!settings.isEnabled} onChange={(e)=>handleChange('isEnabled', e.target.checked)} className="checkbox checkbox-sm checkbox-primary" />
            <label htmlFor="isEnabled" className="text-sm font-medium cursor-pointer select-none">{t('Enable Chat Widget on Website')}</label>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">{t('Brand Color')}</label>
            <div className="flex gap-2 items-center">
              <input type="color" className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0" value={settings.themeColor || '#2563eb'} onChange={(e)=>handleChange('themeColor', e.target.value)} />
              <input className="input flex-1" value={settings.themeColor || '#2563eb'} onChange={(e)=>handleChange('themeColor', e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">{t('Welcome Message')}</label>
            <textarea className="textarea h-24" value={settings.greeting || ''} onChange={(e)=>handleChange('greeting', e.target.value)} placeholder="Hello! How can we help you?" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">{t('Position')}</label>
            <select className="select" value={settings.position || 'bottom-right'} onChange={(e)=>handleChange('position', e.target.value)}>
              <option value="bottom-right">{t('Bottom Right')}</option>
              <option value="bottom-left">{t('Bottom Left')}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-center bg-gray-100 dark:bg-black/20 rounded-xl p-8 relative min-h-[300px]">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          {/* Mock Preview */}
          <div className={`absolute p-4 w-64 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 ${settings.position === 'bottom-left' ? 'bottom-8 left-8' : 'bottom-8 right-8'}`} style={{ display: settings.isEnabled ? 'block' : 'none' }}>
             <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
               <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: settings.themeColor || '#2563eb' }}>Bot</div>
               <div className="text-sm font-bold">{t('Support')}</div>
             </div>
             <div className="bg-gray-100 dark:bg-gray-900/50 p-2 rounded-lg rounded-tl-none text-xs mb-4">
               {settings.greeting || 'Hello! How can we help you?'}
             </div>
             <div className="h-8 bg-gray-50 dark:bg-gray-900/30 rounded border border-gray-100 dark:border-gray-700"></div>
          </div>

          {!settings.isEnabled && (
            <div className="text-center opacity-50">
              <div className="text-2xl mb-2">🙈</div>
              <div>{t('Widget is disabled')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
