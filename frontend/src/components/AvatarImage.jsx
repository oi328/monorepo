import React, { useState, useEffect } from 'react'
import { api } from '@utils/api'

// Cache to store object URLs to avoid re-fetching
const avatarCache = new Map();

// Custom Avatar Component that fetches image with Auth Token
export default function AvatarImage({ user, className, onError, alt = "User" }) {
  const [src, setSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Create a unique key for the cache based on user ID and avatar path/timestamp
  // If avatar changes, the path usually changes or we can use updated_at if available
  const cacheKey = user ? `avatar-${user.id}-${user.avatar || 'no-avatar'}` : null;

  useEffect(() => {
    let active = true;

    const fetchAvatar = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // 0. Check Cache
      if (cacheKey && avatarCache.has(cacheKey)) {
         setSrc(avatarCache.get(cacheKey));
         setLoading(false);
         return;
      }

      // If user has no avatar, do nothing (show fallback)
      if (!user.avatar && !user.avatar_url) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // 1. Try secure endpoint for private storage (primary method)
        if (user.avatar) {
            const response = await api.get(`/api/users/${user.id}/avatar`, { 
              responseType: 'blob' 
            });
            
            if (active) {
              const url = URL.createObjectURL(response.data);
              setSrc(url);
              // Cache it
              if (cacheKey) avatarCache.set(cacheKey, url);
            }
        } 
        // 2. Fallback to avatar_url (public/external)
        else if (user.avatar_url) {
            setSrc(user.avatar_url);
        }

      } catch (err) {
        // console.warn('Failed to fetch secure avatar', err);
        // Fallback to avatar_url if available and different
        if (active && user.avatar_url) {
            setSrc(user.avatar_url);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAvatar();
    
    return () => { 
      active = false;
      // We don't revoke immediately to allow cache to work across components
      // Ideally we should have a cache cleanup strategy
    };
  }, [user?.id, user?.avatar, user?.avatar_url, cacheKey]);

  if ((!src && !loading) || hasError) {
    // Show fallback (initials) if failed
    return (
      <div className={`${className} bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-sm`}>
        {(String(user?.name || user?.email || 'User').trim()[0] || 'U').toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src || ''} 
      alt={alt}
      className={`${className} transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}
      onError={(e) => {
        setHasError(true);
        if (onError) onError(e);
      }}
    />
  );
};
