'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, CheckCircle } from 'lucide-react'

interface Props {
  userId: string
}

export function PushNotificationsToggle({ userId }: Props) {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSupported('serviceWorker' in navigator && 'PushManager' in window)

    // Check if already subscribed
    navigator.serviceWorker?.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setSubscribed(!!sub)
      })
    }).catch(() => {})
  }, [])

  async function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
  }

  async function subscribe() {
    setLoading(true)
    setStatus('idle')
    try {
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('error')
        setLoading(false)
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: await urlBase64ToUint8Array(vapidKey),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), userId }),
      })

      setSubscribed(true)
      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      setSubscribed(false)
      setStatus('idle')
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <div className="flex items-center gap-2">
      {status === 'success' && !loading && (
        <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium animate-fade-in">
          <CheckCircle className="w-3 h-3" />
          Włączone
        </div>
      )}
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        title={subscribed ? 'Wyłącz powiadomienia push' : 'Włącz powiadomienia push'}
        className={[
          'flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-all border',
          subscribed
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]',
          loading ? 'opacity-60 cursor-not-allowed' : '',
        ].join(' ')}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : subscribed ? (
          <Bell className="w-3.5 h-3.5" />
        ) : (
          <BellOff className="w-3.5 h-3.5" />
        )}
        {subscribed ? 'Push: ON' : 'Push: OFF'}
      </button>
    </div>
  )
}
