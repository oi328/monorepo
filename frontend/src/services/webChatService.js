
export const webChatService = {
  loadSettings: () => {
    try {
      return JSON.parse(localStorage.getItem('webchat.integration') || '{}')
    } catch (_) {
      return {}
    }
  },

  saveSettings: (settings) => {
    localStorage.setItem('webchat.integration', JSON.stringify(settings))
  },

  resetSettings: () => {
    localStorage.removeItem('webchat.integration')
  },

  getPreviewConfig: (settings) => {
    return {
      themeColor: settings.themeColor || '#2563eb',
      greeting: settings.greeting || 'Hello! How can we help you?',
      position: settings.position || 'bottom-right',
      isEnabled: !!settings.isEnabled
    }
  }
}
