// src/echo.js
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echo = null;
let lastToken = null;

const reverbEnabled = String(import.meta.env.VITE_REVERB_ENABLED || '').toLowerCase() === 'true';
const appKey = import.meta.env.VITE_REVERB_APP_KEY;

const getToken = () => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('token') || window.sessionStorage.getItem('token');
};

const disconnectEcho = () => {
    if (!echo) return;
    try {
        echo.disconnect();
    } catch {}
    echo = null;
    lastToken = null;
    try {
        if (window.Echo) delete window.Echo;
    } catch {}
};

export const ensureEcho = () => {
    if (!reverbEnabled) return null;
    if (!appKey || appKey === 'your-pusher-app-key' || String(appKey).includes('placeholder')) return null;

    const token = getToken();
    if (!token) return null;

    // Recreate if token changes (login / logout / switch storage).
    if (echo && lastToken === token) {
        return echo;
    }
    if (echo && lastToken !== token) {
        disconnectEcho();
    }

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

    const reverbHost = import.meta.env.VITE_REVERB_HOST || host;
    const reverbPort = Number(import.meta.env.VITE_REVERB_PORT || 80);
    const reverbScheme = String(import.meta.env.VITE_REVERB_SCHEME || 'http').toLowerCase();
    const reverbPath = String(import.meta.env.VITE_REVERB_PATH || '').trim();

    // Reverb uses the Pusher protocol where the socket URL already includes `/app/{APP_KEY}`.
    // Setting `wsPath` to `/app` results in `/app/app/{APP_KEY}` (and the connection fails).
    const wsPath = reverbPath && reverbPath !== '/app' ? reverbPath : undefined;

    echo = new Echo({
        broadcaster: 'reverb',
        key: appKey,
        wsHost: reverbHost,
        wsPort: reverbPort,
        wssPort: reverbPort,
        forceTLS: reverbScheme === 'https',
        enabledTransports: ['ws', 'wss'],
        ...common,
        ...(wsPath ? { wsPath } : {}),
    });

    lastToken = token;
    window.Echo = echo;

    return echo;
};

// Best-effort initialization on page load (will no-op if no token yet).
ensureEcho();

export const getEcho = () => echo;
export { disconnectEcho };

export default echo;
