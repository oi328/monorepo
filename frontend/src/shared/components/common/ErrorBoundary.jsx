import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    try {
      const payload = {
        message: error?.message || 'Unexpected error',
        stack: error?.stack || null,
        componentStack: info?.componentStack || null,
        url: typeof window !== 'undefined' ? window.location.href : null,
      }
      try { window.__lastReactError = payload } catch {}
      console.error('ReactErrorBoundary', payload)
      const evt = new CustomEvent('app:toast', { detail: { type: 'error', message: error?.message || 'Unexpected error' } })
      window.dispatchEvent(evt)
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="p-6 rounded-lg border bg-white/80 dark:bg-neutral-900">
            <div className="text-red-600 font-semibold">Something went wrong</div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
