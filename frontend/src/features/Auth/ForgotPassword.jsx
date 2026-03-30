import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/context/ThemeProvider';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, Globe, Loader2 } from 'lucide-react';
import lightLogo from '../../assets/be-souhola-logo-light.png';
import DarkLogo from '../../assets/be-souhola-logo-dark.png';
import { api } from '../../utils/api'; // Ensure we use the configured axios instance

const FloatingInput = ({ 
  id, 
  type = 'text', 
  label, 
  value, 
  onChange, 
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
      </div>
    </div>
  );
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'dark' ? DarkLogo : lightLogo;
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await api.post('/api/password/email', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
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
                ? 'استعادة الوصول إلى حسابك بسهولة وأمان.'
                : 'Restore access to your account simply and securely.'}
            </p>
          </motion.div>
        </div>

        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
      </motion.div>

      {/* Right Panel - Form (55%) */}
      <div className="w-full lg:w-[55%] flex flex-col relative overflow-y-auto">
        
        {/* Top Bar */}
        <div className="absolute top-6 right-6 rtl:right-auto rtl:left-6 z-20">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-medium"
          >
            <Globe size={16} />
            <span>{i18n.language === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16">
          <div className="w-full max-w-md space-y-8">
            
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <img src={logo} alt="Logo" className="h-16 w-auto mx-auto mb-4" />
            </div>

            {/* Header */}
            <div className="text-center lg:text-start space-y-2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('forgot_password.title', 'Forgot Password?')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {t('forgot_password.subtitle', 'Enter your email to receive reset instructions.')}
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3 text-green-700"
              >
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle size={18} />
                </div>
                <div className="text-sm font-medium">
                  {t('forgot_password.success', 'Reset link sent! Check your email.')}
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-700"
              >
                <div className="text-sm font-medium">
                  {error}
                </div>
              </motion.div>
            )}

            {/* Form */}
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <FloatingInput
                  id="email"
                  type="email"
                  label={t('login.email_label', 'Email Address')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      {t('forgot_password.send_btn', 'Send Reset Link')}
                      {i18n.language === 'ar' ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
                    </>
                  )}
                </button>
              </form>
            ) : (
                <div className="text-center">
                    <p className="text-gray-600 mb-6">
                        {t('forgot_password.check_email_instruction', 'We have sent a password reset link to your email address. Please check your inbox (and spam folder) to proceed.')}
                    </p>
                </div>
            )}

            {/* Back to Login */}
            <div className="text-center">
              <Link 
                to="/login" 
                className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                {i18n.language === 'ar' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                {t('forgot_password.back_to_login', 'Back to Login')}
              </Link>
            </div>
            
             {/* Branding Footer */}
             <div className="mt-8 flex justify-center">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-sm border border-gray-200 dark:border-gray-700" dir="ltr">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Created by</span>
                  <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Besouhola CRM</span>
                </div>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
}

