import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'

const ToastContext = createContext({ show: () => {} })

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const show = useCallback((payload) => {
    const id = Math.random().toString(36).slice(2)
    const item = { id, type: payload?.type || 'info', message: payload?.message || '' }
    setToasts((prev) => [...prev, item])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  useEffect(() => {
    const handler = (e) => show(e.detail)
    window.addEventListener('app:toast', handler)
    return () => window.removeEventListener('app:toast', handler)
  }, [show])

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className={`${t.type === 'error' ? 'bg-red-600' : t.type === 'success' ? 'bg-green-600' : 'bg-slate-700'} text-white px-4 py-2 rounded shadow`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => React.useContext(ToastContext)