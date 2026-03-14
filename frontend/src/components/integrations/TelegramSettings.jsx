import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { telegramService } from '../../services/telegramService'

export default function TelegramSettings({ onClose }) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState(() => telegramService.loadSettings())
  const [testPayload, setTestPayload] = useState(null)
  const [serverAck, setServerAck] = useState(null)

  useEffect(() => {
    const safe = { ...settings }
    delete safe.botToken
    telegramService.saveSettings(safe)
  }, [settings])

  const status = useMemo(() => ({
    chat: !!settings.chatId,
  }), [settings])

  const handleChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))
  
  const resetAll = () => {
    telegramService.resetSettings()
    setSettings({})
    setTestPayload(null)
    setServerAck(null)
  }

  const simulateMessage = () => {
    setTestPayload(telegramService.simulateMessage(settings))
  }

  const sendTestMessage = async () => {
    try {
      const payload = testPayload || telegramService.simulateMessage(settings)
      const j = await telegramService.sendTestMessage(payload)
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
          <h2 className="text-xl font-bold">{t('Telegram Bot Settings')}</h2>
          <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar">
            <Badge ok={status.chat} label={t('Chat ID')} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
           <button onClick={onClose} className="btn btn-outline btn-sm rtl:flex-row-reverse">{t('Back to Integrations')}</button>
        </div>
      </div>

      <div className="card glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('Bot Configuration')}</h3>
          <button className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" onClick={resetAll}>{t('Reset')}</button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">{t('Chat ID (Group or User)')}</label>
            <input className="input" value={settings.chatId || ''} onChange={(e)=>handleChange('chatId', e.target.value)} placeholder="e.g., -100123456789" />
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--muted-text)] bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
          ℹ️ {t('Bot token is managed securely on the server. Add the bot to your group and make it an admin to receive notifications.')}
        </p>
      </div>

      <div className="card glass-card p-4">
        <h3 className="text-lg font-semibold mb-4">{t('Testing Tools')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <button className="btn btn-primary btn-sm" onClick={simulateMessage}>{t('Draft Notification')}</button>
           <button className="btn btn-outline btn-sm" onClick={sendTestMessage}>{t('Send to Telegram')}</button>
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
