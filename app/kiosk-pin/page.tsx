'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/app/supabase-client'
import { MapPin, Loader2, CheckCircle, XCircle, ChevronLeft, Delete } from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────────── */
type Employee = {
  id: string; full_name: string; position: string | null; has_pin: boolean
  record: { clock_in_at: string | null; clock_out_at: string | null } | null
}
type Location  = { id: string; name: string }
type Screen    = 'loading' | 'location_pick' | 'pick' | 'pin' | 'camera' | 'done' | 'error'

/* ── Camera hook (mirrors /clock/page.tsx) ──────────────────────── */
function useCamera(active: boolean) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readyRef  = useRef(false)
  const [ready,  setReady]  = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null; readyRef.current = false; setReady(false); return
    }
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        readyRef.current = true
        setReady(true)
      })
      .catch(() => { if (!cancelled) setDenied(true) })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      readyRef.current = false
    }
  }, [active])

  function capture(): string | null {
    const video = videoRef.current
    if (!video || !readyRef.current) return null
    const MAX = 480, scale = Math.min(1, MAX / (video.videoWidth || MAX))
    const canvas = document.createElement('canvas')
    canvas.width  = Math.round((video.videoWidth  || MAX) * scale)
    canvas.height = Math.round((video.videoHeight || 360) * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.78)
  }

  return { videoRef, ready, denied, capture, readyRef }
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmtTime(d: Date)  { return d.toLocaleTimeString('pl-PL',  { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
function fmtDate(d: Date)  { return d.toLocaleDateString('pl-PL',  { weekday: 'long', day: 'numeric', month: 'long' }) }
function fmtShort(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}
function calcWorked(inAt: string | null, outAt: string | null) {
  if (!inAt || !outAt) return null
  const ms = new Date(outAt).getTime() - new Date(inAt).getTime()
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
function KioskPinInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const [screen,     setScreen]     = useState<Screen>('loading')
  const [locations,  setLocations]  = useState<Location[]>([])
  const [locationId, setLocationId] = useState('')
  const [location,   setLocation]   = useState<Location | null>(null)
  const [employees,  setEmployees]  = useState<Employee[]>([])
  const [selected,   setSelected]   = useState<Employee | null>(null)
  const [pinDigits,  setPinDigits]  = useState('')
  const [pinError,   setPinError]   = useState('')
  const [countdown,  setCountdown]  = useState(3)
  const [flash,      setFlash]      = useState(false)
  const [acting,     setActing]     = useState(false)
  const [doneData,   setDoneData]   = useState<{ record: any; photo: string | null; name: string } | null>(null)
  const [errorMsg,   setErrorMsg]   = useState('')
  const [now,        setNow]        = useState(new Date())

  const cam            = useCamera(screen === 'camera')
  const pendingRef     = useRef<{ pin: string; action: 'in' | 'out' } | null>(null)
  const resetTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Live clock ── */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  /* ── Auth + location init ── */
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('user_access').select('location_id, locations(id, name)').eq('user_id', user.id)

      const locs: Location[] = ((data ?? []) as any[])
        .map(r => { const l = Array.isArray(r.locations) ? r.locations[0] : r.locations; return l ?? null })
        .filter(Boolean)

      setLocations(locs)

      const paramLoc = searchParams.get('location')
      const chosen = (paramLoc && locs.find(l => l.id === paramLoc))
        ? paramLoc
        : locs.length === 1 ? locs[0].id : ''

      if (chosen) {
        setLocationId(chosen)
        setLocation(locs.find(l => l.id === chosen) ?? null)
      } else {
        setScreen('location_pick')
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Load employees when location chosen ── */
  const loadEmployees = useCallback(async (locId: string) => {
    const res  = await fetch(`/api/kiosk-pin/employees?locationId=${locId}`)
    const json = await res.json()
    if (!res.ok) { setErrorMsg(json.error ?? 'Błąd ładowania'); setScreen('error'); return }
    setEmployees(json.employees ?? [])
    if (json.location) setLocation(json.location)
    setScreen('pick')
  }, [])

  useEffect(() => {
    if (locationId) loadEmployees(locationId)
  }, [locationId, loadEmployees])

  /* ── Camera countdown + auto-capture ── */
  useEffect(() => {
    if (screen !== 'camera') return
    setCountdown(3)
    let count = 3
    const t = setInterval(() => {
      count--
      setCountdown(count)
      if (count <= 0) {
        clearInterval(t)
        const pending = pendingRef.current
        if (pending) doClockWithPin(pending.pin, pending.action)
      }
    }, 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  /* ── Actions ── */
  function pickEmployee(emp: Employee) {
    setSelected(emp); setPinDigits(''); setPinError(''); setScreen('pin')
  }

  function pressDigit(d: string) {
    if (acting) return
    setPinDigits(prev => {
      if (prev.length >= 4) return prev
      const next = prev + d
      if (next.length === 4) {
        const action = selected?.record?.clock_in_at && !selected?.record?.clock_out_at ? 'out' : 'in'
        pendingRef.current = { pin: next, action }
        setTimeout(() => setScreen('camera'), 120)
      }
      return next
    })
  }

  function deleteDigit() { if (!acting) setPinDigits(p => p.slice(0, -1)) }

  function cancelToIdle() {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    setScreen('pick'); setSelected(null); setPinDigits(''); setPinError(''); pendingRef.current = null
  }

  async function doClockWithPin(pin: string, action: 'in' | 'out') {
    if (!selected || acting) return

    // Block if camera not ready
    if (cam.denied || !cam.readyRef.current) {
      setPinError(cam.denied ? 'Zdjęcie jest wymagane. Odblokuj dostęp do kamery.' : 'Kamera się inicjuje — spróbuj ponownie.')
      setScreen('pin')
      pendingRef.current = null
      return
    }

    setActing(true)

    setFlash(true)
    setTimeout(() => setFlash(false), 180)
    const photoBase64 = cam.capture()

    if (!photoBase64) {
      setPinError('Nie udało się zrobić zdjęcia. Spróbuj ponownie.')
      setActing(false)
      setScreen('pin')
      pendingRef.current = null
      return
    }

    const res  = await fetch('/api/clock/pin-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: selected.id, pin, action, photo_base64: photoBase64, location_id: locationId }),
    })
    const json = await res.json()
    setActing(false)

    if (!res.ok) {
      setPinError(json.error ?? 'Błąd')
      setPinDigits('')
      pendingRef.current = null
      setScreen('pin')
      return
    }

    setDoneData({ record: json.record, photo: photoBase64, name: json.employee?.full_name ?? selected.full_name })
    setEmployees(prev => prev.map(e => e.id === selected.id ? { ...e, record: json.record } : e))
    setScreen('done')

    // Auto-reset to employee list after 4 seconds
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => {
      setScreen('pick'); setSelected(null); setDoneData(null); setPinDigits('')
    }, 4000)
  }

  /* ══════════════════════════════════════════════════════════
     SCREENS
  ══════════════════════════════════════════════════════════ */

  /* Loading */
  if (screen === 'loading') return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </main>
  )

  /* Error */
  if (screen === 'error') return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="bg-white/10 rounded-2xl p-8 text-center max-w-sm">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-white font-semibold">{errorMsg}</p>
      </div>
    </main>
  )

  /* Location picker */
  if (screen === 'location_pick') return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            <MapPin className="text-white w-7 h-7" />
          </div>
          <h1 className="text-[26px] font-bold text-white">Kiosk PIN</h1>
          <p className="text-slate-400 mt-1">Wybierz lokal</p>
        </div>
        <div className="space-y-3">
          {locations.map(loc => (
            <button key={loc.id} onClick={() => { setLocationId(loc.id); setLocation(loc) }}
              className="w-full px-5 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-left transition-all active:scale-[0.98]">
              {loc.name}
            </button>
          ))}
        </div>
      </div>
    </main>
  )

  /* Employee pick grid */
  if (screen === 'pick') return (
    <main className="min-h-screen bg-[#0F172A] flex flex-col select-none">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-0.5">Kiosk PIN</p>
          {location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="text-blue-400 w-3.5 h-3.5 shrink-0" />
              <p className="text-white font-semibold text-[15px]">{location.name}</p>
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-white font-mono text-[20px] font-bold leading-none">{fmtTime(now)}</p>
          <p className="text-slate-500 text-[11px] capitalize mt-0.5">{fmtDate(now)}</p>
        </div>
      </div>

      <p className="text-slate-400 text-center text-[13px] mb-4 px-4">Naciśnij swoje imię, aby się odbić</p>

      {/* Grid */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {employees.map(emp => {
            const isClockedIn = !!emp.record?.clock_in_at && !emp.record?.clock_out_at
            const isDone = !!emp.record?.clock_out_at
            return (
              <button key={emp.id}
                onClick={() => emp.has_pin ? pickEmployee(emp) : null}
                disabled={!emp.has_pin}
                className={`relative p-4 rounded-2xl text-left transition-all ${emp.has_pin
                  ? 'bg-white/10 hover:bg-white/[0.15] active:scale-95 cursor-pointer'
                  : 'bg-white/5 opacity-40 cursor-not-allowed'
                }`}>
                <div className={`w-2.5 h-2.5 rounded-full mb-3 ${
                  isClockedIn ? 'bg-green-400 animate-pulse' : isDone ? 'bg-orange-400' : 'bg-slate-600'
                }`} />
                <p className="text-white font-bold text-[14px] leading-tight">
                  {emp.full_name.split(' ')[0]}
                </p>
                <p className="text-white/50 text-[12px]">
                  {emp.full_name.split(' ').slice(1).join(' ')}
                </p>
                <p className={`text-[11px] mt-1.5 font-medium ${
                  isClockedIn ? 'text-green-400' : isDone ? 'text-orange-400' : 'text-slate-500'
                }`}>
                  {isClockedIn ? '● W pracy' : isDone ? 'Zakończona' : 'Nieobecny'}
                </p>
                {!emp.has_pin && (
                  <p className="text-[9px] text-slate-600 mt-0.5">Brak PIN</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {locations.length > 1 && (
        <button onClick={() => { setLocationId(''); setScreen('location_pick') }}
          className="shrink-0 text-slate-600 text-[12px] text-center pb-4 hover:text-slate-400 transition-colors">
          Zmień lokal
        </button>
      )}
    </main>
  )

  /* PIN numpad */
  if (screen === 'pin') {
    const isClockedIn = !!selected?.record?.clock_in_at && !selected?.record?.clock_out_at
    return (
      <main className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 select-none">
        <button onClick={cancelToIdle}
          className="absolute top-5 left-5 flex items-center gap-1.5 text-slate-400 hover:text-white text-[13px] transition-colors">
          <ChevronLeft className="w-4 h-4" />Wróć
        </button>

        <p className="text-slate-400 text-[14px] mb-1">{selected?.full_name}</p>
        <p className={`text-[24px] font-black mb-8 ${isClockedIn ? 'text-orange-400' : 'text-green-400'}`}>
          {isClockedIn ? 'Wyjście ze zmiany' : 'Wejście na zmianę'}
        </p>

        {/* PIN dots */}
        <div className="flex gap-5 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-5 h-5 rounded-full transition-all duration-150 ${
              i < pinDigits.length ? 'bg-blue-400 scale-110' : 'bg-white/20'
            }`} />
          ))}
        </div>

        {pinError && (
          <p className="text-red-400 text-[13px] mb-5 font-semibold bg-red-500/10 px-4 py-2 rounded-xl">
            {pinError}
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[300px]">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} onClick={() => pressDigit(d)}
              className="h-[72px] rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 active:bg-white/30 text-white text-[28px] font-semibold transition-all">
              {d}
            </button>
          ))}
          <div />
          <button onClick={() => pressDigit('0')}
            className="h-[72px] rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-[28px] font-semibold transition-all">
            0
          </button>
          <button onClick={deleteDigit}
            className="h-[72px] rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all">
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </main>
    )
  }

  /* Camera + countdown */
  if (screen === 'camera') return (
    <main className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center relative overflow-hidden select-none">
      {/* Flash */}
      {flash && <div className="absolute inset-0 bg-white z-50 pointer-events-none" />}

      <p className="text-slate-400 text-[13px] mb-4 z-10">{selected?.full_name} — zdjęcie za…</p>

      {/* Camera preview */}
      <div className="relative rounded-3xl overflow-hidden w-[260px] h-[260px] bg-black border-4 border-white/10 z-10">
        <video ref={cam.videoRef} autoPlay playsInline muted
          className="w-full h-full object-cover scale-x-[-1]" />
        {!cam.ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}
        {/* Countdown overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[90px] font-black text-white/60 drop-shadow-2xl leading-none">
            {countdown > 0 ? countdown : '📸'}
          </span>
        </div>
      </div>

      <p className="text-slate-500 text-[12px] mt-4 z-10">Patrz w kamerę</p>
    </main>
  )

  /* Done confirmation */
  if (screen === 'done' && doneData) {
    const isIn   = !!doneData.record?.clock_in_at && !doneData.record?.clock_out_at
    const worked = calcWorked(doneData.record?.clock_in_at, doneData.record?.clock_out_at)
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center p-6 gap-5 select-none ${
        isIn ? 'bg-[#052E16]' : 'bg-[#431407]'
      }`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isIn ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
          <CheckCircle className={`w-10 h-10 ${isIn ? 'text-green-400' : 'text-orange-400'}`} />
        </div>

        <div className="text-center">
          <p className={`text-[30px] font-black ${isIn ? 'text-green-400' : 'text-orange-400'}`}>
            {isIn ? 'Dobry dzień!' : 'Do widzenia!'}
          </p>
          <p className="text-white text-[18px] font-semibold mt-1">{doneData.name}</p>
        </div>

        {isIn && (
          <p className="text-green-300 text-[36px] font-mono font-bold">
            {fmtShort(doneData.record?.clock_in_at)}
          </p>
        )}
        {!isIn && worked && (
          <p className="text-orange-300 text-[20px] font-bold">Przepracowano: {worked}</p>
        )}

        {doneData.photo && (
          <img src={doneData.photo} alt=""
            className={`w-28 h-28 rounded-2xl object-cover border-4 ${isIn ? 'border-green-500/30' : 'border-orange-500/30'}`} />
        )}

        <p className="text-white/25 text-[12px]">Powrót za chwilę…</p>
      </main>
    )
  }

  return null
}

export default function KioskPinPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <KioskPinInner />
    </Suspense>
  )
}
