import { api } from '@utils/api'
import { useMutation, useQuery } from '@tanstack/react-query'

export const login = async (email, password, subdomain, rememberMe = false) => {
  const payload = { email, password };
  if (subdomain) {
    payload.subdomain = subdomain;
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isSubdomain = (() => {
    const parts = host.split('.');
    if (parts[0] === 'www') parts.shift();
    const isLocal = parts.includes('localhost');
    const threshold = isLocal ? 1 : 2;
    return parts.length > threshold;
  })();
  const endpoint = isSubdomain ? '/api/login' : '/api/crm/login-redirect';
  const res = await api.post(endpoint, payload);

  // Check for 2FA
  if (res?.data?.requires_2fa) {
    return { 
      requires_2fa: true, 
      message: res.data.message 
    };
  }

  const token = res?.data?.data?.token || res?.data?.token;
  const redirectUrl = res?.data?.redirect_url;
  const user = res?.data?.user;
  if (token) {
    if (typeof window !== 'undefined') {
      if (rememberMe) {
        window.localStorage.setItem('token', token);
        window.sessionStorage.removeItem('token');
      } else {
        window.sessionStorage.setItem('token', token);
        window.localStorage.removeItem('token');
      }
      const host = window.location.hostname;
      const parts = host.split('.');
      if (parts[0] === 'www') parts.shift();
      // Fix for .test domains and general 2-part domains (e.g. alisraa.test)
      // We want the last two parts for the domain (e.g. .alisraa.test, .localhost)
      const domain = parts.includes('localhost') ? '.localhost' : (parts.length > 1 ? '.' + parts.slice(-2).join('.') : '');
      if (domain) {
        const maxAge = rememberMe ? 7 * 24 * 60 * 60 : '';
        document.cookie = `token=${encodeURIComponent(token)};path=/;domain=${domain};${maxAge ? `max-age=${maxAge};` : ''}SameSite=Lax`;
      }
    }
    const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: 'Logged in' } });
    window.dispatchEvent(evt);
  }
  
  // Force route for Super Admin immediately
  const isSuperAdmin = user?.is_super_admin || 
                       user?.email?.toLowerCase() === 'system@besouhoula.com' || 
                       user?.email?.toLowerCase() === 'admin@example.com' ||
                       user?.email?.toLowerCase() === 'admin@besouhoula.com';

  if (isSuperAdmin) {
    // Return early to let the caller handle redirection after state update
    return { token, redirected: true, user, isSuperAdmin: true };
  }

  if (!isSubdomain && redirectUrl) {
    if (typeof window !== 'undefined') {
      const tok = token ? encodeURIComponent(token) : '';
      const nextPath = isSuperAdmin ? '/system/dashboard' : '/dashboard';
      const encodedNext = encodeURIComponent(nextPath);
      const normalizeHost = (host) => String(host || '').replace(/^www\./i, '').toLowerCase();
      let shouldHardRedirect = true;

      try {
        const redirectOrigin = new URL(redirectUrl).origin;
        const currentOrigin = window.location.origin;
        const redirectHost = new URL(redirectOrigin).hostname;
        const currentHost = window.location.hostname;

        const sameExactOrigin = redirectOrigin === currentOrigin;
        const sameCanonicalHost = normalizeHost(redirectHost) === normalizeHost(currentHost);
        shouldHardRedirect = !(sameExactOrigin || sameCanonicalHost);
      } catch {
        shouldHardRedirect = !redirectUrl.startsWith(window.location.origin);
      }

      if (shouldHardRedirect) {
        window.location.href = `${redirectUrl}/#/auth/callback?token=${tok}&next=${encodedNext}`;
        return { token, redirected: true, user };
      }

      window.location.hash = `#${nextPath}`;
      return { token, redirected: true, user };
    }
  }
  return { token, redirected: false, user };
}

export const logout = async () => {
  try {
    await api.post('/api/logout')
  } catch {}
  window.localStorage.removeItem('token')
  window.sessionStorage.removeItem('token')
  try {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const parts = host.split('.');
      if (parts[0] === 'www') parts.shift();
      
      // 1. Clear for current path
      document.cookie = `token=;path=/;max-age=0`;
      
      // 2. Clear for root domain (e.g. .besouholacrm.net)
      const rootDomain = parts.length > 1 ? '.' + parts.slice(-2).join('.') : null;
      if (rootDomain) {
        document.cookie = `token=;path=/;domain=${rootDomain};max-age=0`;
      }
      
      // 3. Clear for current domain (e.g. .tenant.besouholacrm.net)
      const currentDomain = '.' + parts.join('.');
      if (currentDomain !== rootDomain) {
        document.cookie = `token=;path=/;domain=${currentDomain};max-age=0`;
      }
      
      // 4. Clear for localhost if applicable
      if (host === 'localhost') {
         document.cookie = `token=;path=/;domain=.localhost;max-age=0`;
      }
    }
  } catch {}
  const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: 'Logged out' } })
  window.dispatchEvent(evt)
}

export const getProfile = async () => {
  const res = await api.get('/api/company-info')
  return res?.data?.data || res?.data
}

export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: getProfile })

export const useLogin = () => useMutation({ mutationFn: ({ email, password, rememberMe }) => login(email, password, undefined, rememberMe) })
