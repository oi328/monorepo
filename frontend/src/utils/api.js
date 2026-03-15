import axios from 'axios';

// التعديل المطلوب في ملف axiosConfig.js
const host = String(window.location.hostname || '').replace(/\.+$/, ''); // سيعيد demo.besouholacrm.net
const parts = host.split('.');
const subdomain = (parts.length > 2 && parts[0] !== 'www') ? parts[0] : null;

// الرابط من الـ env يجب أن يكون https://api.besouholacrm.net/api
const baseApiUrl = (import.meta.env.VITE_API_URL || 'https://api.besouholacrm.net/api').replace(/\/+$/, '');

export const api = axios.create({
  // اجعل الـ baseURL ثابت دائماً للكل
  baseURL: baseApiUrl,
  withCredentials: (import.meta.env.VITE_USE_CREDENTIALS === 'true') || false,
  headers: {
    'Accept': 'application/json',
    // هنا السر: نرسل اسم الشركة في الهيدر والـ API سيعرف من هو المستأجر
    ...(subdomain ? { 'X-Tenant-Id': subdomain } : {}),
  }
});

// Interceptor للتأكد من نظافة الروابط المرسلة
api.interceptors.request.use((config) => {
    // تنظيف الرابط من أي تكرار لـ /api/
    if (config.url) {
        const hasApiSuffixInBase = /\/api\/?$/.test(String(config.baseURL || ''));

        // إذا كان الـ baseURL ينتهي بـ /api، والرابط يبدأ بـ /api/، نحذف واحدة منهم
        // الطريقة الأكثر أماناً: التأكد أننا لا نرسل /api/ مرتين
        
        // 1. إذا كان الرابط يبدأ بـ /api/ والـ baseURL يحتوي /api، نحذفها
        if (hasApiSuffixInBase && config.url.startsWith('/api/')) {
            config.url = config.url.substring(4); // حذف /api
        }
        
        // 2. إذا كان الرابط يبدأ بـ api/ (بدون سلاش) والـ baseURL يحتوي /api، نحذفها
        if (hasApiSuffixInBase && config.url.startsWith('api/')) {
             config.url = config.url.substring(3);
        }

        // 3. التأكد أن الرابط يبدأ بـ / لضمان دمجه بشكل صحيح مع الـ baseURL
        if (!config.url.startsWith('/')) {
            config.url = '/' + config.url;
        }
    }
    
    const token = window.localStorage.getItem('token') || window.sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormData) {
        try {
            if (typeof config.headers?.delete === 'function') {
                config.headers.delete('Content-Type');
                config.headers.delete('content-type');
            } else {
                if (config.headers) {
                    delete config.headers['Content-Type'];
                    delete config.headers['content-type'];
                }
            }
        } catch (e) {}
    }
    
    return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    try {
      const status = err?.response?.status;
      if (status === 401) {
        // Only trigger logout if not already on login page
        const isLoginPage = window.location.hash.includes('login') || window.location.pathname.includes('login') || window.location.pathname === '/';
        
        if (!isLoginPage) {
            window.localStorage.removeItem('token');
            window.sessionStorage.removeItem('token');
            // Clear all cookies
            document.cookie.split(";").forEach((c) => {
              document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
            // Redirect to login immediately
            if (window.location.hash) {
                window.location.hash = '#/login';
            } else {
                window.location.href = '/#/login';
            }
            
            // Reload page to clear any state (optional, can cause loops if logic is flawed)
            // window.location.reload(); 
        } else {
            // Even if on login page, ensure tokens are cleared to prevent infinite retries by AppStateProvider
            window.localStorage.removeItem('token');
            window.sessionStorage.removeItem('token');
        }
        return Promise.reject(err);
      } else if (status === 403) {
        const msg = err?.response?.data?.message || '';
        if (msg && msg.toLowerCase().includes('suspended')) {
             if (typeof window !== 'undefined') window.location.hash = '#/suspended';
        } else {
             const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: msg || 'Access Denied' } });
             window.dispatchEvent(evt);
        }
      } else if (status === 429) {
        const message = 'Too many requests. Please wait a moment.';
        const evt = new CustomEvent('app:toast', { detail: { type: 'error', message } });
        window.dispatchEvent(evt);
      } else {
        const msg = err?.response?.data?.message || err?.message || 'Request failed';
        const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: msg } });
        window.dispatchEvent(evt);
      }
    } catch (e) {}
    return Promise.reject(err);
  }
);

export const logExportEvent = (payload) => {
  try {
    const body = {
      module: payload.module,
      action: payload.action || 'export',
      file_name: payload.fileName,
      format: payload.format || 'xlsx',
      status: payload.status || 'success',
      error_message: payload.error || payload.errorMessage || null,
    };
    return api.post('/exports', body).catch(() => null);
  } catch (e) {}
};

export const logImportEvent = (payload) => {
  try {
    const body = {
      module: payload.module,
      action: 'import',
      file_name: payload.fileName,
      status: payload.status || 'success',
      meta_data: payload.meta || {},
      error_message: payload.error || payload.errorMessage || null,
    };
    return api.post('/exports', body).catch(() => null);
  } catch (e) {}
};
