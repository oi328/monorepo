import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { getCompanySetup, saveCompanyInfo, saveModules, saveDepartments, saveVisibility } from '../services/companySetupApi'

const CompanySetupContext = createContext(null)

export function CompanySetupProvider({ children }) {
  const [companyInfo, setCompanyInfo] = useState({ companyName: '', industry: '', address: '', phone: '', logoUrl: '' })
  const [subscription, setSubscription] = useState({ plan: 'Free', features: [] })
  const [enabledModules, setEnabledModules] = useState([])
  const [departments, setDepartments] = useState([])
  const [visibility, setVisibility] = useState({})
  const [loading, setLoading] = useState(false)

  const permissions = useMemo(() => ({
    modules: enabledModules,
    departments: visibility,
  }), [enabledModules, visibility])

  const updateCompanyInfo = useCallback(async (payload) => {
    setCompanyInfo(prev => ({ ...prev, ...payload }))
    try { await saveCompanyInfo(payload) } catch {}
  }, [])

  const toggleModule = useCallback(async (moduleKey) => {
    setEnabledModules(prev => {
      const exists = prev.includes(moduleKey)
      const next = exists ? prev.filter(m => m !== moduleKey) : [...prev, moduleKey]
      return next
    })
    try { await saveModules(enabledModules) } catch {}
  }, [enabledModules])

  const addDepartment = useCallback(async (dept) => {
    setDepartments(prev => [...prev, { ...dept, id: dept.id || `dept-${Date.now()}` }])
    try { await saveDepartments(departments) } catch {}
  }, [departments])

  const updateDepartment = useCallback(async (deptId, changes) => {
    setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, ...changes } : d))
    try { await saveDepartments(departments) } catch {}
  }, [departments])

  const updateVisibility = useCallback(async (nextVisibility) => {
    setVisibility(nextVisibility)
    try { await saveVisibility(nextVisibility) } catch {}
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await getCompanySetup()
        if (!mounted) return
        setCompanyInfo(data.companyInfo || {})
        setSubscription(data.subscription || { plan: 'Free', features: [] })
        setEnabledModules(Array.isArray(data.enabledModules) ? data.enabledModules : [])
        setDepartments(Array.isArray(data.departments) ? data.departments : [])
        setVisibility(data.visibility || {})
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const value = useMemo(() => ({
    companySetup: {
      companyInfo,
      subscription,
      enabledModules,
      departments,
      visibility,
    },
    permissions,
    loading,
    updateCompanyInfo,
    toggleModule,
    addDepartment,
    updateDepartment,
    updateVisibility,
  }), [companyInfo, subscription, enabledModules, departments, visibility, permissions, loading, updateCompanyInfo, toggleModule, addDepartment, updateDepartment, updateVisibility])

  return (
    <CompanySetupContext.Provider value={value}>
      {children}
    </CompanySetupContext.Provider>
  )
}

export function useCompanySetup() {
  const ctx = useContext(CompanySetupContext)
  if (!ctx) throw new Error('useCompanySetup must be used within CompanySetupProvider')
  return ctx
}