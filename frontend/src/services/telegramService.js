
export const telegramService = {
  loadSettings: () => {
    try {
      return JSON.parse(localStorage.getItem('telegram.integration') || '{}')
    } catch (_) {
      return {}
    }
  },

  saveSettings: (settings) => {
    const safe = { ...settings }
    delete safe.botToken
    localStorage.setItem('telegram.integration', JSON.stringify(safe))
  },

  resetSettings: () => {
    localStorage.removeItem('telegram.integration')
  },

  simulateMessage: (settings) => {
    return {
      chat_id: settings.chatId || '123456789',
      text: '🔔 New Lead Received:\nName: Ahmed Ali\nPhone: +2010xxxxxx',
      parse_mode: 'Markdown'
    }
  },

  sendTestMessage: async (payload) => {
    await new Promise(r => setTimeout(r, 800))
    return { 
      ok: true, 
      result: { 
        message_id: 123, 
        chat: { id: payload.chat_id, title: 'Test Group' },
        date: Math.floor(Date.now() / 1000),
        text: payload.text
      } 
    }
  }
}
