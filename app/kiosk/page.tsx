'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/app/supabase-client'
import QRCode from 'react-qr-code'
import { RefreshCw, MapPin, Clock, Wifi } from 'lucide-react'

const REFRESH_INTERVAL = 270 // 4.5 minutes in seconds (refresh before 5-min token expires)

type Location = { id: string; name: string }
type QRData = { clockUrl: string; expiresIn: number } | null

function KioskInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [locations,    setLocations]    = useState<Location[]>([])
  const [locationId,   setLocationId]   = useState<string>('')
  const [qrData,       setQrData]       = useState<QRData>(null)
  const [countdown,    setCountdown]    = useState(REFRESH_INTERVAL)
  const [loading,      setLoading]      = useState(false)
  const [authChecked,  setAuthChecked]  = useState(false)
  const [now,          setNow]          = useState(new Date())

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Auth check ───────────────────────────────────────────────── */
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setAuthChecked(true)

      const { data } = await supabase
        .from('user_access')
        .select('location_id, locations(id, name)')
        .eq('user_id', user.id)

      const locs: Location[] = ((data ?? []) as Array<{ location_id: string; locations: { id: string; name: string }[] | { id: string; name: string } | null }>)
        .map(r => {
          const loc = Array.isArray(r.locations) ? r.locations[0] : r.locations
          return loc ? { id: loc.id, name: loc.name } : null
        })
        .filter((l): l is Location => l !== null)

      setLocations(locs)

      // Pre-select from URL param
      const paramLoc = searchParams.get('location')
      if (paramLoc && locs.find(l => l.id === paramLoc)) {
        setLocationId(paramLoc)
      } else if (locs.length === 1) {
        setLocationId(locs[0].id)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Fetch QR token ───────────────────────────────────────────── */
  const fetchToken = useCallback(async (locId: string) => {
    if (!locId) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/clock/token?locationId=${locId}`)
      const json = await res.json()
      if (res.ok) {
        setQrData({ clockUrl: json.clockUrl, expiresIn: json.expiresIn })
        setCountdown(Math.min(json.expiresIn - 10, REFRESH_INTERVAL))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Auto-refresh when locationId changes ─────────────────────── */
  useEffect(() => {
    if (!locationId || !authChecked) return
    fetchToken(locationId)
  }, [locationId, authChecked, fetchToken])

  /* ── Countdown + auto-refresh ─────────────────────────────────── */
  useEffect(() => {
    if (!locationId) return
    if (countdownRef.current) clearInterval(countdownRef.current)

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchToken(locationId)
          return REFRESH_INTERVAL
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [locationId, fetchToken])

  /* ── Live clock ───────────────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtCountdown = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const selectedLoc = locations.find(l => l.id === locationId)

  /* ── Location selector screen ─────────────────────────────────── */
  if (authChecked && locations.length > 1 && !locationId) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="text-white w-8 h-8" />
            </div>
            <h1 className="text-[28px] font-bold text-white mb-2">Kiosk odbitek</h1>
            <p className="text-slate-400">Wybierz lokalizację do wyświetlenia</p>
          </div>
          <div className="space-y-3">
            {locations.map(loc => (
              <button
                key={loc.id}
                onClick={() => setLocationId(loc.id)}
                className="w-full px-5 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-left transition-all"
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      </main>
    )
  }

  /* ── Main kiosk screen ────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 select-none">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-slate-400 text-[13px] font-medium uppercase tracking-widest mb-1">Kiosk odbitek czasu pracy</p>
        {selectedLoc && (
          <div className="flex items-center justify-center gap-1.5">
            <MapPin className="text-blue-400 w-4 h-4" />
            <h1 className="text-[22px] font-bold text-white">{selectedLoc.name}</h1>
          </div>
        )}
      </div>

      {/* QR card */}
      <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-black/50 mb-6">
        {loading || !qrData ? (
          <div className="w-[260px] h-[260px] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <QRCode value={qrData.clockUrl} size={260} level="M" />
        )}
      </div>

      {/* Instructions */}
      <div className="text-center mb-6 max-w-xs">
        <p className="text-white font-semibold text-[18px] mb-1">Zeskanuj, aby się odbić</p>
        <p className="text-slate-400 text-[14px]">Użyj kamery telefonu lub dowolnej aplikacji QR</p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 mb-8">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-4 h-4" />
          <span className="text-[13px] font-mono">{fmtTime(now)}</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <div className="flex items-center gap-2 text-slate-400">
          <Wifi className="w-4 h-4" />
          <span className="text-[13px]">Odświeży za {fmtCountdown(countdown)}</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <button
          onClick={() => fetchToken(locationId)}
          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-[13px] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Odśwież
        </button>
      </div>

      {/* Date */}
      <p className="text-slate-500 text-[13px] capitalize">{fmtDate(now)}</p>

      {/* Location switcher */}
      {locations.length > 1 && (
        <button
          onClick={() => setLocationId('')}
          className="mt-4 text-slate-600 hover:text-slate-400 text-[12px] transition-colors"
        >
          Zmień lokalizację
        </button>
      )}
    </main>
  )
}

export default function KioskPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <KioskInner />
    </Suspense>
  )
}
