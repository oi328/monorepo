// src/echo.js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echo = null;

const reverbEnabled = String(import.meta.env.VITE_REVERB_ENABLED || '').toLowerCase() === 'true';
const pusherEnabled = String(import.meta.env.VITE_PUSHER_ENABLED || '').toLowerCase() === 'true';
const enabled = reverbEnabled || pusherEnabled;

const appKey = reverbEnabled
    ? (import.meta.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_PUSHER_APP_KEY)
    : import.meta.env.VITE_PUSHER_APP_KEY;

const token = typeof window !== 'undefined'
    ? (window.localStorage.getItem('token') || window.sessionStorage.getItem('token'))
    : null;

// Initialize Echo only when a valid token exists and key is not a placeholder
if (enabled && appKey && token && appKey !== 'your-pusher-app-key' && !appKey.includes('placeholder')) {
    // Determine the auth endpoint base (using /api prefix as registered in api.php)
    const baseUrl = (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'https://api.besouholacrm.net').replace(/\/api\/?$/, '');
    const authEndpoint = `${baseUrl}/api/broadcasting/auth`;

    // Determine Tenant ID from subdomain
    const host = window.location.hostname; 
    const parts = host.split('.');
    const subdomain = (parts.length > 2 && parts[0] !== 'www') ? parts[0] : null;

    const common = {
        authEndpoint,
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                ...(subdomain ? { 'X-Tenant-Id': subdomain } : {}),
            },
        },
        disableStats: true,
    };

    if (reverbEnabled) {
        const reverbHost = import.meta.env.VITE_REVERB_HOST || host;
        const reverbPort = Number(import.meta.env.VITE_REVERB_PORT || 80);
        const reverbScheme = String(import.meta.env.VITE_REVERB_SCHEME || 'http').toLowerCase();
        const reverbPath = import.meta.env.VITE_REVERB_PATH || '/app';

        echo = new Echo({
            broadcaster: 'reverb',
            key: appKey,
            wsHost: reverbHost,
            wsPort: reverbPort,
            wssPort: reverbPort,
            wsPath: reverbPath,
            forceTLS: reverbScheme === 'https',
            enabledTransports: ['ws', 'wss'],
            ...common,
        });
    } else {
        echo = new Echo({
            broadcaster: 'pusher',
            key: appKey,
            cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
            forceTLS: true,
            ...common,
        });
    }

    window.Echo = echo;
}

export default echo;
