import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { whatsappService } from '../../services/whatsappService'

export default function WhatsAppSettings({ onClose }) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState(() => whatsappService.loadSettings())
  const [testPayload, setTestPayload] = useState(null)
  const [serverAck, setServerAck] = useState(null)

  useEffect(() => {
    whatsappService.saveSettings(settings)
  }, [settings])

  const status = useMemo(() => ({
    configured: !!settings.phoneNumberId && !!settings.accessToken,
  }), [settings])

  const handleChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))
  
  const resetAll = () => {
    whatsappService.resetSettings()
    setSettings({})
    setTestPayload(null)
    setServerAck(null)
  }

  const simulateMessage = () => {
    setTestPayload(whatsappService.simulateMessage(settings))
  }

  const sendTestMessage = async () => {
    try {
      const payload = testPayload || whatsappService.simulateMessage(settings)
      const j = await whatsappService.sendTestMessage(payload)
      setServerAck(j)
    } catch (e) {
      setServerAck({ ok: false, error: e.message })
    }
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
          <h2 className="text-xl font-bold">{t('WhatsApp Business Settings')}</h2>
          <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar">
            <Badge ok={status.configured} label={t('API Configured')} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
           <button onClick={onClose} className="btn btn-outline btn-sm rtl:flex-row-reverse">{t('Back to Integrations')}</button>
        </div>
      </div>

      <div className="card glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('Cloud API Credentials')}</h3>
          <button className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" onClick={resetAll}>{t('Reset')}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">{t('Phone Number ID')}</label>
            <input className="input" value={settings.phoneNumberId || ''} onChange={(e)=>handleChange('phoneNumberId', e.target.value)} placeholder="e.g., 1059..." />
          </div>
           <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">{t('Business Account ID')}</label>
            <input className="input" value={settings.businessAccountId || ''} onChange={(e)=>handleChange('businessAccountId', e.target.value)} placeholder="e.g., 1002..." />
          </div>
        </div>
      </div>

      <div className="card glass-card p-4">
        <h3 className="text-lg font-semibold mb-4">{t('Testing Tools')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="flex flex-col gap-1">
              <label className="text-xs font-medium opacity-70">{t('Test Phone Number')}</label>
              <input className="input" value={settings.testPhone || ''} onChange={(e)=>handleChange('testPhone', e.target.value)} placeholder="+20..." />
           </div>
           <div className="flex items-end gap-2">
             <button className="btn btn-primary btn-sm flex-1" onClick={simulateMessage}>{t('Draft Template Msg')}</button>
             <button className="btn btn-outline btn-sm flex-1" onClick={sendTestMessage}>{t('Send')}</button>
           </div>
        </div>
        {testPayload && (
          <div className="mt-4 p-2 bg-gray-900 text-green-400 text-[10px] font-mono rounded overflow-hidden">
             <div className="mb-1 opacity-50 uppercase">Payload Preview</div>
             <pre className="overflow-auto max-h-32">{JSON.stringify(testPayload, null, 2)}</pre>
          </div>
        )}
        {serverAck && (
          <div className="mt-2 p-2 bg-gray-900 text-blue-400 text-[10px] font-mono rounded overflow-hidden">
             <div className="mb-1 opacity-50 uppercase">Server Response</div>
             <pre className="overflow-auto max-h-32">{JSON.stringify(serverAck, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
