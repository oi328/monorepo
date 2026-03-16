import { useTranslation } from 'react-i18next'
import { FaArrowRight, FaCheckCircle, FaCog } from 'react-icons/fa'
import { useTheme } from '@shared/context/ThemeProvider'

export default function IntegrationCard({ integration, onConnect, onConfigure }) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme !== 'dark'
  const { name, description, icon: Icon, bg, status, connected } = integration

  return (
    <div className="bg-transparent border border-gray-200/50 dark:border-white/10 rounded-xl p-4 hover:bg-white/5 transition-all flex flex-col items-start gap-3 relative overflow-hidden group">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shadow-lg shadow-black/5 z-10`}>
        {Icon && <Icon className="text-white w-5 h-5" />}
      </div>
      
      <div className="flex-1 w-full z-10">
        <h3 className={`text-sm font-bold mb-1.5 flex items-center gap-2 ${isLight ? 'text-black' : 'text-white'}`}>
          {t(name)}
          {connected && <FaCheckCircle className="text-emerald-500 w-3 h-3" />}
        </h3>
        <p className={`text-xs leading-relaxed mb-3 min-h-[32px] ${isLight ? 'text-black' : 'text-white'}`}>
          {t(description)}
        </p>
        
        <div className="flex items-center gap-3 mt-auto">
          {connected ? (
            <button 
              onClick={onConfigure}
              className={`px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors ${isLight ? 'text-black' : 'text-white'}`}
            >
              <FaCog size={12} />
              {t('Configure')}
            </button>
          ) : (
            <button 
              onClick={onConnect}
              className="text-cyan-500 text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all"
            >
              {t('Connect Now')} <FaArrowRight size={10} className="transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>
      </div>

      {/* Status indicator */}
      {status && (
        <div className={`absolute top-4 right-4 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 ${isLight ? 'text-black' : 'text-white'}`}>
          {status}
        </div>
      )}
    </div>
  )
}
