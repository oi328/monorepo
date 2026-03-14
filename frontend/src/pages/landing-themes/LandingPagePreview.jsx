import { useMemo, useEffect, useState } from 'react'
import Theme1 from './Theme1'
import Theme2 from './Theme2'
import { api } from '../../utils/api'

export default function LandingPagePreview() {
  const searchStr = (() => {
    if (typeof window === 'undefined') return ''
    const h = window.location.hash || ''
    if (h.includes('?')) return h.split('?')[1]
    return window.location.search || ''
  })()
  
  const params = new URLSearchParams(searchStr)
  
  const localPayload = useMemo(() => {
    const raw = params.get('data') || ''
    try {
      const decoded = decodeURIComponent(raw)
      const normalized = decoded
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(decoded.length / 4) * 4, '=')
      const bin = atob(normalized)
      const bytes = new Uint8Array([...bin].map(c => c.charCodeAt(0)))
      const json = new TextDecoder().decode(bytes)
      return JSON.parse(json)
    } catch { return null }
  }, [params])

  const token = params.get('token') || ''
  const [payload, setPayload] = useState(localPayload)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localPayload) setPayload(localPayload)
  }, [localPayload])

  useEffect(() => {
    if (payload) return
    if (!token) return
    let mounted = true
    setLoading(true)
    api.get(`/share-links/${encodeURIComponent(token)}`)
      .then((res) => {
        const data = res?.data?.data || null
        if (mounted) setPayload(data)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [payload, token])

  // Helper to inject scripts safely (handles <script> tags and HTML content)
  const injectScripts = (html, location) => {
    if (!html) return () => {};
    
    const div = document.createElement('div');
    div.innerHTML = html;
    
    const addedNodes = [];
    
    Array.from(div.childNodes).forEach(node => {
        let newNode;
        if (node.nodeName === 'SCRIPT') {
            newNode = document.createElement('script');
            Array.from(node.attributes).forEach(attr => newNode.setAttribute(attr.name, attr.value));
            newNode.text = node.innerHTML;
        } else {
            newNode = node.cloneNode(true);
        }
        location.appendChild(newNode);
        addedNodes.push(newNode);
    });

    return () => {
        addedNodes.forEach(node => {
            if (location.contains(node)) {
                location.removeChild(node);
            }
        });
    };
  };

  // Handle Scripts Injection
  useEffect(() => {
    if (!payload) return
    const cleanups = []

    // 1. Meta Pixel
    if (payload.pixelId) {
        const pixelScript = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${payload.pixelId}');
        fbq('track', 'PageView');
        `
        const cleanup = injectScripts(`<script>${pixelScript}</script>`, document.head)
        cleanups.push(cleanup)
        
        // NoScript for Pixel
        const noScript = `<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${payload.pixelId}&ev=PageView&noscript=1" /></noscript>`
        const cleanupNoScript = injectScripts(noScript, document.body)
        cleanups.push(cleanupNoScript)
    }

    // 2. Google Tag Manager (GTM)
    if (payload.gtmId && payload.isGtmEnabled !== false) {
        const gtmScript = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${payload.gtmId}');`
        
        const cleanup = injectScripts(`<script>${gtmScript}</script>`, document.head)
        cleanups.push(cleanup)
        
        // NoScript for GTM
        const noScript = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${payload.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`
        const cleanupNoScript = injectScripts(noScript, document.body)
        cleanups.push(cleanupNoScript)
    }

    // 3. Custom Header Script (Only if enabled)
    if (payload.headerScriptEnabled !== false && payload.headerScript) {
        const cleanup = injectScripts(payload.headerScript, document.head)
        cleanups.push(cleanup)
    }

    // 4. Custom Body Script (Only if enabled)
    if (payload.bodyScriptEnabled !== false && payload.bodyScript) {
        const cleanup = injectScripts(payload.bodyScript, document.body)
        cleanups.push(cleanup)
    }

    return () => {
        cleanups.forEach(c => c && c())
    }
  }, [payload])

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{loading ? 'Loading...' : 'No Data Found'}</h1>
          <p className="text-gray-500">{loading ? 'Please wait...' : 'This preview link is invalid or has expired.'}</p>
        </div>
      </div>
    )
  }

  // Theme Selector (Expandable for more themes later)
  const theme = payload.theme || 'theme1'
  
  return (
    <>
      {theme === 'theme1' && <Theme1 data={payload} />}
      {theme === 'theme2' && <Theme2 data={payload} />}
      {/* Add more themes here */}
    </>
  )
}
