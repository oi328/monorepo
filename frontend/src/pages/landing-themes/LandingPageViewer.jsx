import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../utils/api'
import Theme1 from './Theme1'
import Theme2 from './Theme2'

export default function LandingPageViewer() {
  const { slug } = useParams()
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) {
      console.error('LandingPageViewer: No slug provided')
      setLoading(false)
      return
    }

    console.log('LandingPageViewer: Fetching landing page for slug:', slug)
    setLoading(true)

    // Timeout fallback
    const timer = setTimeout(() => {
      console.warn('LandingPageViewer: Request timed out')
      setLoading(false)
      setError(new Error('Request timed out'))
    }, 10000)

    api.get(`/api/p/${slug}`)
      .then(res => {
        console.log('LandingPageViewer: Fetched data:', res.data)
        setPayload(res.data.data)
        setLoading(false)
        clearTimeout(timer)
      })
      .catch(err => {
        console.error('Failed to load landing page:', err)
        setError(err)
        setLoading(false)
        clearTimeout(timer)
      })

    return () => clearTimeout(timer)
  }, [slug])

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

    // 1. Meta Pixel (Standard)
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

    // 2. GTM (Standard)
    if (payload.gtmId && payload.isGtmEnabled) {
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

    // 3. Custom Header Script
    if (payload.headerScriptEnabled && payload.headerScript) {
        const cleanup = injectScripts(payload.headerScript, document.head)
        cleanups.push(cleanup)
    }

    // 4. Custom Body Script
    if (payload.bodyScriptEnabled && payload.bodyScript) {
        const cleanup = injectScripts(payload.bodyScript, document.body)
        cleanups.push(cleanup)
    }

    return () => {
        cleanups.forEach(c => c && c())
    }
  }, [payload])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !payload) {
    const is404 = error?.response?.status === 404
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{is404 ? 'Page Not Found' : 'Error Loading Page'}</h1>
          <p className="text-gray-500 mb-6">
            {is404 
              ? `The landing page "${slug}" could not be found. It may have been deleted or the link is incorrect.`
              : 'Something went wrong while loading this page. Please try again later.'}
          </p>
          {!is404 && (
             <button 
               onClick={() => window.location.reload()}
               className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
             >
               Retry
             </button>
          )}
        </div>
      </div>
    )
  }

  // Theme Selector
  const theme = payload.theme || 'theme1'
  
  if (theme !== 'theme1' && theme !== 'theme2') {
      console.warn('Unknown theme:', theme, 'Falling back to Theme1')
      return <Theme1 data={payload} />
  }

  return (
    <>
      {theme === 'theme1' && <Theme1 data={payload} />}
      {theme === 'theme2' && <Theme2 data={payload} />}
    </>
  )
}
