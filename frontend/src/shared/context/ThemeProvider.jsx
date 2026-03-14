import { createContext, useContext, useEffect, useState } from 'react'
import { palette, fonts } from '../../theme.js'

const ThemeContext = createContext({ theme: 'dark', setTheme: () => {} })

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      // Prefer theme from system preferences
      const prefsRaw = localStorage.getItem('systemPrefs')
      if (prefsRaw) {
        const prefs = JSON.parse(prefsRaw)
        if (prefs && (prefs.theme === 'light' || prefs.theme === 'dark' || prefs.theme === 'auto')) {
          return prefs.theme
        }
      }
      const saved = localStorage.getItem('theme')
      return (saved === 'light' || saved === 'auto') ? saved : 'light'
    } catch {
      return 'light'
    }
  })

  const [resolvedTheme, setResolvedTheme] = useState('dark')

  const setTheme = (val) => {
    setThemeState(val.toLowerCase())
  }

  useEffect(() => {
    const updateTheme = () => {
      let mode = theme
      
      if (theme === 'auto') {
        const hour = new Date().getHours()
        // Light Mode: 5:00 AM to 4:59 PM (16:59)
        if (hour >= 5 && hour < 17) {
          mode = 'light'
        } else {
          mode = 'dark'
        }
      }

      setResolvedTheme(mode)
      const root = document.documentElement
      if (mode === 'dark') {
        root.classList.add('dark')
        root.classList.remove('light')
      } else {
        root.classList.remove('dark')
        root.classList.add('light')
      }
    }

    updateTheme()

    let interval
    if (theme === 'auto') {
      interval = setInterval(updateTheme, 60000) // Check every minute
    }

    try {
      localStorage.setItem('theme', theme)
      // Keep system preferences in sync with theme changes
      const prefsRaw = localStorage.getItem('systemPrefs')
      const prefs = prefsRaw ? JSON.parse(prefsRaw) : {}
      prefs.theme = theme
      localStorage.setItem('systemPrefs', JSON.stringify(prefs))
    } catch {}

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [theme])

  // On mount, apply density and direction from system preferences
  useEffect(() => {
    try {
      const prefsRaw = localStorage.getItem('systemPrefs')
      if (prefsRaw) {
        const prefs = JSON.parse(prefsRaw)
        const root = document.documentElement
        if (prefs && prefs.density) {
          root.classList.remove('density-compact', 'density-comfortable', 'density-default')
          const cls = `density-${prefs.density}`
          root.classList.add(cls)
        }
        if (prefs && prefs.direction) {
          document.dir = prefs.direction === 'rtl' ? 'rtl' : 'ltr'
        }
      }
    } catch {}
  }, [])

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      resolvedTheme,
      palette, 
      fonts,
      isDark: resolvedTheme === 'dark',
      isDarkMode: resolvedTheme === 'dark'
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
