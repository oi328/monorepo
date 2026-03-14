import { useEffect, useState, useCallback } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { api } from '../utils/api';

// Configure Pusher
window.Pusher = Pusher;

let audioCtx = null;

const initAudio = () => {
    if (typeof window === 'undefined') return;
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(err => {
                // Ignore autoplay policy errors until user gesture
                console.debug('Audio resume failed (autoplay policy):', err);
            });
        }
    } catch (e) {
        console.warn('Audio initialization failed', e);
    }
};

if (typeof window !== 'undefined') {
    ['click', 'keydown', 'touchstart'].forEach(event => {
        window.addEventListener(event, initAudio, { once: true });
    });
}

function shouldPlaySound() {
    try {
        const stored = localStorage.getItem('notificationsSettings');
        if (!stored) return true;
        const parsed = JSON.parse(stored);
        if (typeof parsed.soundEnabled === 'boolean') return parsed.soundEnabled;
    } catch { }
    return true;
}

export function playNotificationSound() {
    try {
        if (!audioCtx) initAudio();
        if (!audioCtx) return;

        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }

        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        // Pleasant chime sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, t); // C5
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.1); // Slide to A5

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.5);
    } catch (e) {
        console.error('Failed to play notification sound', e);
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const useNotifications = (user) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [echoInstance, setEchoInstance] = useState(null);

    // Fetch initial notifications
    const fetchNotifications = useCallback(async () => {
        if (!user || !user.id) return;
        
        // Skip if offline
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return;
        }

        try {
            // Fetch combined notifications and unread count in one call
            const { data } = await api.get('/api/notifications', { timeout: 15000 });
            
            const rawNotifications = data.notifications?.data || [];
            const preciseCount = data.unread_count || 0;

            const mapped = rawNotifications.map(n => {
                let derivedType = 'system';
                const typeStr = n.type || '';
                if (typeStr.includes('Lead') || typeStr.includes('Customer')) derivedType = 'lead';
                else if (typeStr.includes('Task')) derivedType = 'task';
                else if (typeStr.includes('Campaign')) derivedType = 'campaign';
                else if (typeStr.includes('Invoice') || typeStr.includes('Rent')) derivedType = 'inventory';

                return {
                    id: n.id,
                    type: derivedType,
                    title: n.data.title || n.data.subject || 'Notification',
                    body: n.data.message || n.data.body || '',
                    createdAt: new Date(n.created_at).getTime(),
                    read: !!n.read_at,
                    archived: !!n.archived_at,
                    source: derivedType.charAt(0).toUpperCase() + derivedType.slice(1),
                    link: n.data.link
                };
            });
            
            const active = mapped.filter(n => !n.archived);
            setNotifications(active);
            setUnreadCount(preciseCount);

        } catch (error) {
            // Log as warning to avoid console spam during network issues
            console.warn('Failed to fetch notifications (likely network issue):', error.message);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();

        // Poll for new notifications every 2 minutes (120000ms) to keep badge in sync and reduce server load
        const interval = setInterval(fetchNotifications, 120000);

        const handleUpdate = () => fetchNotifications();
        window.addEventListener('notificationsUpdated', handleUpdate);
        return () => {
            clearInterval(interval);
            window.removeEventListener('notificationsUpdated', handleUpdate);
        };
    }, [fetchNotifications]);

    useEffect(() => {
        if (!user || !user.id) return;

        const reverbEnabled = String(import.meta.env.VITE_REVERB_ENABLED || '').toLowerCase() === 'true';
        const pusherEnabled = String(import.meta.env.VITE_PUSHER_ENABLED || '').toLowerCase() === 'true';
        const enabled = reverbEnabled || pusherEnabled;

        const appKey = reverbEnabled
            ? (import.meta.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_PUSHER_APP_KEY)
            : import.meta.env.VITE_PUSHER_APP_KEY;

        // Don't initialize if key is missing or is a common placeholder
        if (!enabled || !appKey || appKey === 'your-pusher-app-key' || appKey.includes('placeholder')) {
            return;
        }

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            // Ensure authEndpoint uses /api/broadcasting/auth as registered in api.php
            const baseUrl = (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/api\/?$/, '');
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

            const echo = reverbEnabled
                ? new Echo({
                    broadcaster: 'reverb',
                    key: appKey,
                    wsHost: import.meta.env.VITE_REVERB_HOST || host,
                    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 80),
                    wssPort: Number(import.meta.env.VITE_REVERB_PORT || 443),
                    wsPath: import.meta.env.VITE_REVERB_PATH || '/app',
                    forceTLS: String(import.meta.env.VITE_REVERB_SCHEME || 'http').toLowerCase() === 'https',
                    enabledTransports: ['ws', 'wss'],
                    ...common,
                })
                : new Echo({
                    broadcaster: 'pusher',
                    key: appKey,
                    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
                    forceTLS: true,
                    ...common,
                });

            setEchoInstance(echo);

            // Channel name must match what Laravel sends
            const channelName = `App.Models.User.${user.id}`;
            
            // Listen to notification events
            echo.private(channelName)
                .notification((notification) => {
                    let derivedType = 'system';
                    const typeStr = notification.type || '';
                    if (typeStr.includes('Lead') || typeStr.includes('Customer')) derivedType = 'lead';
                    else if (typeStr.includes('Task')) derivedType = 'task';
                    else if (typeStr.includes('Campaign')) derivedType = 'campaign';
                    else if (typeStr.includes('Invoice') || typeStr.includes('Rent')) derivedType = 'inventory';

                    const newNotif = {
                        id: notification.id,
                        type: derivedType,
                        title: notification.title || notification.subject || 'Notification',
                        body: notification.message || notification.body || '',
                        createdAt: Date.now(),
                        read: false,
                        archived: false,
                        source: derivedType.charAt(0).toUpperCase() + derivedType.slice(1),
                        link: notification.link
                    };

                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    
                    // Show toast notification for better visibility (Facebook-like)
                    if (typeof window !== 'undefined') {
                        const toastEvent = new CustomEvent('app:toast', {
                            detail: {
                                type: 'info',
                                message: newNotif.body || newNotif.title,
                                duration: 5000,
                                link: newNotif.link
                            }
                        });
                        window.dispatchEvent(toastEvent);
                    }

                    if (shouldPlaySound()) {
                        playNotificationSound();
                    }
                });

            return () => {
                echo.leave(channelName);
            };
        } catch (err) {
            console.warn('Realtime notifications disabled (WebSocket not available)', err);
        }
    }, [user]);

    const registerWebPush = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push messaging is not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Permission not granted for Notification');
                return;
            }

            const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

            if (!vapidKey) {
                console.error('VAPID Public Key not found');
                return;
            }

            const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            await api.post('/api/push/subscribe', subscription);
            console.log('Web Push Subscribed successfully');

        } catch (error) {
            console.error('Failed to register web push:', error);
        }
    }, []);

    return {
        notifications,
        unreadCount,
        registerWebPush,
        fetchNotifications,
        echo: echoInstance
    };
};
