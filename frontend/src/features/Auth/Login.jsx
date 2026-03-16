import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppState } from '@shared/context/AppStateProvider';
import { useTheme } from '@shared/context/ThemeProvider';
import { api } from '@utils/api';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Globe, Loader2, CheckCircle, Check } from 'lucide-react';
import lightLogo from '../../assets/be-souhola-logo-light.png';
import DarkLogo from '../../assets/be-souhola-logo-dark.png';


// --- Components ---

const FloatingInput = ({ 
  id, 
  type = 'text', 
  label, 
  value, 
  onChange, 
  togglePassword, 
  showPassword, 
  required, 
  autoFocus, 
  className 
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value && value.length > 0;

  return (
    <div className={`relative group ${className}`}>
      <div className={`
        relative flex items-center w-full rounded-xl border-2 transition-all duration-300
        ${focused ? 'border-blue-600 bg-white dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:border-blue-300 dark:hover:border-blue-500'}
      `}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          autoFocus={autoFocus}
          className="flex-1 w-full px-4 pt-5 pb-2 bg-transparent outline-none text-gray-900 dark:text-white font-medium z-10 min-w-0"
        />
        
        <label
          htmlFor={id}
          className={`absolute start-4 transition-all duration-300 pointer-events-none text-gray-500 dark:text-gray-400
            ${focused || hasValue ? 'text-xs top-1.5' : 'text-base top-3.5'}
          `}
        >
          {label}
        </label>

        {togglePassword && (
          <button
            type="button"
            onClick={togglePassword}
            className="p-3 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors z-20 focus:outline-none"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    </div>
  );
};

// --- Main Page ---

export default function Login() {
  const navigate = useNavigate();
  const { login, user, bootstrapped } = useAppState();
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'dark' ? DarkLogo : lightLogo;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const loginDebugEnabled = String(import.meta.env.VITE_API_DEBUG || (import.meta.env.DEV ? 'true' : 'false')).toLowerCase() === 'true'
    || window.localStorage.getItem('api_debug') === '1';

  const isSuperAdminUser = (u) => {
    if (!u) return false;
    const roleLower = String(u.role || '').toLowerCase();
    const emailLower = String(u.email || '').toLowerCase();
    return (
      !!u.is_super_admin ||
      roleLower === 'owner' ||
      roleLower.includes('super admin') ||
      roleLower.includes('superadmin') ||
      emailLower === 'system@besouhoula.com' ||
      emailLower === 'admin@example.com' ||
      emailLower === 'admin@besouhoula.com'
    );
  };

  useEffect(() => {
    if (!bootstrapped) return;

    const token = window.localStorage.getItem('token') || window.sessionStorage.getItem('token');
    const cookieToken = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    
    if ((token || cookieToken) && user) {
      if (isSuperAdminUser(user) || (user.subscription_plan === 'super_admin')) {
        navigate('/system/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [navigate, user, bootstrapped]);

  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const eTrim = (email || '').trim();
      const pTrim = (password || '').trim();
      const cTrim = (code || '').trim();
      
      const host = window.location.hostname;
      const parts = host.split('.');
      if (parts[0] === 'www') parts.shift();
      const isLocal = parts.includes('localhost');
      const threshold = isLocal ? 1 : 2;
      const subdomain = parts.length > threshold ? parts[0] : null;

      if (loginDebugEnabled) {
        console.info('🔑 LOGIN ATTEMPT', {
          email: eTrim,
          subdomain,
          rememberMe,
          requires2FA,
          host: window.location.hostname,
          apiUrl: import.meta.env.VITE_API_URL,
        });
      }

      if (requires2FA) {
        const response = await api.post('/api/auth/2fa/verify', { email: eTrim, code: cTrim, subdomain });

        const data = response.data;

        if (data.token) {
          if (rememberMe) {
            localStorage.setItem('token', data.token);
            sessionStorage.removeItem('token');
          } else {
            sessionStorage.setItem('token', data.token);
            localStorage.removeItem('token');
          }
          const host = window.location.hostname;
          const parts = host.split('.');
          if (parts[0] === 'www') parts.shift();
          const domain = parts.includes('localhost') ? '.localhost' : (parts.length > 1 ? '.' + parts.slice(-2).join('.') : '');
          if (domain) {
            const maxAge = rememberMe ? 7 * 24 * 60 * 60 : '';
            document.cookie = `token=${encodeURIComponent(data.token)};path=/;domain=${domain};${maxAge ? `max-age=${maxAge};` : ''}SameSite=Lax`;
          }
          const evt = new CustomEvent('app:toast', { detail: { type: 'success', message: 'Logged in' } });
          window.dispatchEvent(evt);
          // Redirect logic
          if (isSuperAdminUser(data?.user) || data?.subscription_plan === 'super_admin') {
             navigate('/system/dashboard', { replace: true });
          } else {
             window.location.href = '/dashboard';
          }
          return;
        }
      } else {
        const res = await login(eTrim, pTrim, subdomain, rememberMe);
        if (loginDebugEnabled) {
          console.info('🔑 LOGIN RESPONSE', res);
        }
        if (res?.requires_2fa) {
          setRequires2FA(true);
          setLoading(false);
          return;
        }
        
        // Use updated state/result logic
        const isSuperAdmin = res?.isSuperAdmin || 
                             isSuperAdminUser(res?.user) || 
                             res?.subscription_plan === 'super_admin';

        if (isSuperAdmin) {
          // Let AppStateProvider hydrate `user` from `/api/company-info`,
          // then the effect above will route to `/system/dashboard`.
          setLoading(false);
          return;
        } else {
              // Try to find tenant slug from various possible locations in response
              const tenantSlug = res?.tenant?.slug || res?.company?.slug || res?.user?.tenant?.slug;
              
              if (tenantSlug) {
                  const protocol = window.location.protocol;
                 const host = window.location.hostname;
                 const parts = host.split('.');
                 
                 // Check if we are on main domain
                 const isMainDomain = parts.length <= 2 || (parts.length === 3 && parts[0] === 'www');
                 
                 if (isMainDomain) {
                     // Construct new domain: https://slug.besouholacrm.net
                     // Handle cases like 'localhost' or 'besouholacrm.net'
                     let baseDomain = '';
                     if (parts.length >= 2) {
                        // Get the last two parts (domain.com)
                        baseDomain = parts.slice(-2).join('.');
                     } else {
                        // Localhost fallback
                        baseDomain = 'localhost'; 
                     }
                     
                     // Avoid redirect loop if slug is same as current subdomain (unlikely on main domain but good practice)
                     if (host !== `${tenantSlug}.${baseDomain}`) {
                        const newUrl = `${protocol}//${tenantSlug}.${baseDomain}/#/dashboard`;
                        console.log('Redirecting to tenant domain:', newUrl);
                        // Force hard redirect to subdomain
                        window.location.href = newUrl;
                        return;
                     }
                 }
             }
             
             // If we are already on subdomain or no tenant context, navigate internally
             navigate('/dashboard');
        }
      }
    } catch (err) {
      if (loginDebugEnabled) {
        console.info('🔑 LOGIN ERROR', {
          message: err?.message,
          status: err?.response?.status ?? null,
          data: err?.response?.data ?? null,
          hasResponse: !!err?.response,
        });
      }
      console.error(err);
      if (err.response && err.response.status === 401) {
        if (requires2FA) {
          setError(err.response.data?.message || t('login.invalid_code', 'Invalid verification code'));
        } else {
          setError(t('login.error_invalid_credentials', 'Invalid email or password'));
        }
      } else {
        setError(err.message || 'Invalid credentials or access denied');
      }
      // Shake animation trigger could be here
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-white dark:bg-gray-900 font-sans transition-colors duration-300">
      
      {/* Left Panel - Brand (45%) */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-[45%] relative bg-[#1e293b] flex-col items-center justify-center text-white p-12 overflow-hidden"
      >
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              opacity: [0.3, 0.5, 0.3] 
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 blur-[100px]"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -60, 0],
              opacity: [0.2, 0.4, 0.2] 
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 2 }}
            className="absolute bottom-0 right-0 w-[70%] h-[70%] rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 blur-[80px]"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-lg">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl"
          >
            <img src={DarkLogo} alt="Besouhola Logo" className="h-24 w-auto" />
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <p className="text-lg text-blue-100/80 font-light leading-relaxed">
              {i18n.language === 'ar' 
                ? 'نماء أعمالك يبدأ من هنا... بسهولة.'
                : 'Your business growth starts here... with ease.'}
            </p>
          </motion.div>
        </div>

        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
      </motion.div>

      {/* Right Panel - Form (55%) */}
      <div className="w-full lg:w-[55%] flex flex-col relative overflow-y-auto">
        
        {/* Top Bar */}
        <div className="absolute top-6 right-6 rtl:right-auto rtl:left-6 z-20">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Globe size={16} />
            <span>{i18n.language === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16">
          <div className="w-full max-w-md space-y-8">
            
            {/* Mobile Logo (Visible only on small screens) */}
            <div className="lg:hidden text-center mb-8">
              <img src={logo} alt="Logo" className="h-16 w-auto mx-auto mb-4" />
            </div>

            {/* Header */}
            <div className="text-center lg:text-start space-y-2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {requires2FA ? t('login.verify_title', 'Two-Factor Verification') : t('login.welcome', 'Welcome Back')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {requires2FA 
                  ? t('login.enter_code', 'Enter the 6-digit code sent to your email.')
                  : t('login.subtitle', 'Please enter your details to sign in.')}
              </p>
            </div>

            {/* 2FA Notification */}
            <AnimatePresence>
              {requires2FA && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3 text-blue-700"
                >
                  <div className="bg-blue-100 p-2 rounded-full">
                    <CheckCircle size={18} />
                  </div>
                  <div className="text-sm font-medium">
                    {t('login.code_sent', 'We sent a verification code to your email address.')}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              <AnimatePresence mode="wait">
                {requires2FA ? (
                  <motion.div
                    key="2fa"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <FloatingInput
                      id="code"
                      label={t('login.code_label', 'Verification Code')}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      autoFocus
                      className="text-center tracking-widest text-lg"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-5"
                  >
                    <FloatingInput
                      id="email"
                      type="email"
                      label={t('email', 'Email Address')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
                    />
                    
                    <div className="space-y-1">
                      <FloatingInput
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        label={t('password', 'Password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        togglePassword={() => setShowPassword(!showPassword)}
                        showPassword={showPassword}
                      />
                      <div className="flex justify-between items-center">
                        <label className="flex items-center gap-2 cursor-pointer group select-none">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:border-blue-400 dark:group-hover:border-blue-500'}`}>
                            {rememberMe && <Check size={14} className="text-white" />}
                          </div>
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={rememberMe} 
                            onChange={(e) => setRememberMe(e.target.checked)} 
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                            {t('login.remember_me', 'Remember me')}
                          </span>
                        </label>
                        <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                          {t('login.forgot_password', 'Forgot password?')}
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                transition={error ? { duration: 0.4 } : {}}
                type="submit"
                disabled={loading}
                className={`
                  w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-blue-500/30
                  flex items-center justify-center gap-2 transition-all
                  ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'}
                `}
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  requires2FA ? t('login.verify', 'Verify Access') : t('login.submit', 'Sign In')
                )}
              </motion.button>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
              {t('login.no_account', "Don't have an account?")}{' '}
              <a href="#" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                {t('login.signup', 'Contact Us')}
              </a>
            </p>

            {/* Branding */}
            <div className="mt-8 flex justify-center">
              <div className="px-5 py-2 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700 select-none">
                <span>{t('login.created_by', 'Created by')}</span>
                <div className="flex items-center gap-1" dir="ltr">
                  <span className="font-bold text-blue-600 dark:text-blue-400">{t('login.brand_name', 'Besouhola')}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70">{t('login.brand_suffix', 'crm')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
