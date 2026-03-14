import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as svcLogin, logout as svcLogout, getProfile } from '@services/auth'
import { captureDeviceInfo, saveDeviceForUser } from '@utils/device'
import { api } from '@utils/api'
import { preloadRotationSettings } from '@services/rotationService'
import i18n from '../../i18n'

const AppStateContext = createContext(null)

export function AppStateProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [company, setCompany] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [activeModules, setActiveModules] = useState([])
  const [permissions, setPermissions] = useState([])
  const [bootstrapped, setBootstrapped] = useState(false)
  const [crmSettings, setCrmSettings] = useState(null)
  const [inventoryBadges, setInventoryBadges] = useState(null)
  const isSubscriptionActive = useMemo(() => {
    if (!subscription) return false
    const status = String(subscription.status || '').toLowerCase()
    if (status !== 'active') return false
    const end = subscription.end_date ? new Date(subscription.end_date) : null
    return end ? end.getTime() >= Date.now() : true
  }, [subscription])

  const setProfile = useCallback((payload) => {
    if (!payload) return
    
    // Normalize role name for display purposes
    const rawUser = payload.user || null
    if (rawUser && rawUser.role) {
      const roleLower = rawUser.role.toLowerCase()
      if (roleLower === 'tenant admin' || roleLower === 'tenant-admin') {
        rawUser.role = 'admin'
      }
    }
    
    setUser(rawUser)

    // Sync Language Preference from User Profile
    if (rawUser && rawUser.locale) {
      const currentLng = i18n.language;
      if (currentLng !== rawUser.locale) {
        i18n.changeLanguage(rawUser.locale);
        localStorage.setItem('language', rawUser.locale);
      }
    }

    setCompany(payload.company || payload.tenant || null)
    
    // Store subscription plan string if it's 'super_admin', otherwise store subscription object
    if (payload.subscription_plan === 'super_admin') {
        setSubscription({ status: 'active', plan: 'super_admin' })
    } else {
        setSubscription(payload.subscription || null)
    }

    setPermissions(payload.user_permissions || payload.permissions || [])
    
    let modules = []
    if (payload.enabled_modules && Array.isArray(payload.enabled_modules)) {
      modules = payload.enabled_modules.map(m => m.slug)
    } else if (Array.isArray(payload.activeModules)) {
      modules = payload.activeModules
    }
    setActiveModules(modules)
  }, [])

  const fetchCompanyInfo = useCallback(async () => {
    const payload = await getProfile()
    setProfile(payload)
    try {
      const res = await api.get('/api/crm-settings')
      setCrmSettings(res?.data?.settings || null)
      await preloadRotationSettings()
    } catch {}
    return payload
  }, [setProfile])

  const refreshInventoryBadges = useCallback(async () => {
    try {
      const res = await api.get('/api/inventory/new-counts')
      const data = res?.data?.data || res?.data || {}
      setInventoryBadges(data)
    } catch {
      setInventoryBadges(prev => prev || {})
    }
  }, [])

  const login = useCallback(async (email, password, subdomain, rememberMe = false) => {
    const result = await svcLogin(email, password, subdomain, rememberMe)
    if (result?.requires_2fa) {
      return result
    }
    
    // Always fetch latest profile data to ensure state is fresh, 
    // even if redirection is flagged (e.g. for Super Admin)
    const payload = await fetchCompanyInfo()
    try {
      const uid = payload?.user?.id || email
      const device = captureDeviceInfo()
      saveDeviceForUser(uid, device)
    } catch {}
    
    // Check if user is Super Admin
    const isSuperAdmin = 
        payload?.user?.is_super_admin || 
        payload?.user?.subscription_plan === 'super_admin' ||
        result?.isSuperAdmin;

    if (isSuperAdmin) {
       // Super Admin routing is handled in Login.jsx
       result.subscription_plan = 'super_admin';
       result.isSuperAdmin = true;
    }

    return {
      ...result,
      user: payload?.user || null,
      tenant: payload?.company || payload?.tenant || null,
      subscription_plan: payload?.subscription_plan || result?.subscription_plan,
    }
  }, [fetchCompanyInfo])

  const logout = useCallback(async () => {
    // 1. Clear state immediately to stop UI from trying to fetch user-dependent data
    setUser(null)
    setCompany(null)
    setSubscription(null)
    setActiveModules([])
    setPermissions([])
    
    // 2. Clear tokens immediately (don't wait for server)
    window.localStorage.removeItem('token')
    window.sessionStorage.removeItem('token')
    
    // Clear cookies with domain handling (Matching auth.js logic)
    document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts[0] === 'www') parts.shift();
    
    // 1. Root domain
    const rootDomain = parts.length > 1 ? '.' + parts.slice(-2).join('.') : null;
    if (rootDomain) {
       document.cookie = `token=; Path=/; Domain=${rootDomain}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    }
    
    // 2. Current domain (subdomain)
    const currentDomain = '.' + parts.join('.');
    if (currentDomain !== rootDomain) {
        document.cookie = `token=; Path=/; Domain=${currentDomain}; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    }
    
    // 3. Localhost
    if (host === 'localhost') {
        document.cookie = `token=; Path=/; Domain=.localhost; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    }
    
    // 3. Navigate immediately
    navigate('/login', { replace: true })
    
    // 4. Call service logout (clears tokens again and calls API)
    try {
      await svcLogout()
    } catch {}
  }, [navigate])

  const canAccess = useCallback((moduleKey, requiredPermission = null) => {
    if (!moduleKey) return false
    
    const roleLower = String(user?.role || '').toLowerCase()
    const isSuperAdmin =
      user?.is_super_admin ||
      roleLower.includes('super admin') ||
      roleLower.includes('superadmin') ||
      roleLower === 'owner'
    
    const isTenantAdmin =
      roleLower === 'admin' ||
      roleLower === 'tenant admin' ||
      roleLower === 'tenant-admin'

    if (isSuperAdmin) return true
    
    // Tenant Admin has full access to reports regardless of module settings
    if (isTenantAdmin && moduleKey === 'reports') return true

    const expandedModulesMap = {
      inventory: [
        'inventory',
        'items',
        'products',
        'suppliers',
        'warehouse',
        'stockManagement',
        'inventoryTransactions',
        'projects',
        'properties',
        'developers',
        'brokers',
        'requests',
        'buyerRequests',
        'sellerRequests',
        'orders',
      ],
      sales: [
        'leads',
        'customers',
        'orders',
        'sales',
        'quotations',
        'invoices'
      ]
    }

    const keysToCheck = expandedModulesMap[moduleKey] || [moduleKey]
    const hasAnyModule = keysToCheck.some(k => activeModules.includes(k))
    if (!hasAnyModule) return false
    
    if (requiredPermission) {
      if (isTenantAdmin) return true 
      return permissions.includes(requiredPermission)
    }
    
    return true
  }, [activeModules, permissions, user])

  const value = useMemo(() => ({
    user,
    company,
    subscription,
    activeModules,
    permissions,
    isSubscriptionActive,
    setProfile,
    fetchCompanyInfo,
    login,
    logout,
    canAccess,
    bootstrapped,
    crmSettings,
    setCrmSettings,
    inventoryBadges,
    refreshInventoryBadges,
  }), [user, company, subscription, activeModules, permissions, isSubscriptionActive, setProfile, fetchCompanyInfo, login, logout, canAccess, bootstrapped, crmSettings, setCrmSettings, inventoryBadges, refreshInventoryBadges])

useEffect(() => {
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  };

  const lsToken = window.localStorage.getItem('token');
  const ssToken = window.sessionStorage.getItem('token');
  const cookieToken = getCookie('token');
  
  // إذا كان التوكن موجوداً في الكوكيز وغير موجود في الـ LocalStorage (حالة انتقال الدومين)
  if (!lsToken && !ssToken && cookieToken) {
    window.sessionStorage.setItem('token', cookieToken);
  }

  const token = lsToken || ssToken || cookieToken;
  if (token) {
    fetchCompanyInfo()
      .catch((err) => {
        // Only clear if 401 Unauthorized
        if (err?.response?.status === 401) {
          window.localStorage.removeItem('token');
          window.sessionStorage.removeItem('token');
        }
      })
      .finally(() => {
        setBootstrapped(true);
      });
  } else {
    setBootstrapped(true);
  }
}, [fetchCompanyInfo]);

useEffect(() => {
  if (!user) return
  refreshInventoryBadges()
}, [user, refreshInventoryBadges]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
