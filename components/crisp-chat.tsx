'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    $crisp: unknown[]
    CRISP_WEBSITE_ID: string
  }
}

/**
 * Crisp live chat widget.
 * Set NEXT_PUBLIC_CRISP_WEBSITE_ID in your .env to enable.
 * Get your website ID at https://crisp.chat
 */
export function CrispChat() {
  const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID

  useEffect(() => {
    if (!websiteId) return

    window.$crisp = []
    window.CRISP_WEBSITE_ID = websiteId

    const script = document.createElement('script')
    script.src = 'https://client.crisp.chat/l.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [websiteId])

  return null
}
