'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MapPin, Clock, CheckCircle, LogOut, Loader2, ChevronLeft, XCircle, Camera, CameraOff } from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────────── */
type ClockRecord = {
  id: string; work_date: string
  clock_in_at: string | null; clock_out_at: string | null
  clock_in_photo_url: string | null; clock_out_photo_url: string | null
}
type Employee = { id: string; full_name: string; position: string | null; record: ClockRecord | null }
type Location  = { id: string; name: string }
type Screen    = 'loading' | 'invalid' | 'pick' | 'action' | 'done'

/* ─── Helpers ───────────────────────────────────────────────────── */
function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}
function calcWorked(inAt: string | null, outAt: string | null) {
  if (!inAt || !outAt) return null
  const ms = new Date(outAt).getTime() - new Date(inAt).getTime()
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}
function statusOf(emp: Employee) {
  if (!emp.record?.clock_in_at)  return { dot: 'bg-slate-500',                     label: 'Nieobecny',   text: 'text-slate-400' }
  if (!emp.record?.clock_out_at) return { dot: 'bg-green-400 animate-pulse',        label: 'W pracy',     text: 'text-green-400' }
  return                               { dot: 'bg-orange-400',                     label: 'Zakończona',  text: 'text-orange-400' }
}

/* ─── Camera hook ───────────────────────────────────────────────── */
function useCamera(active: boolean) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const [ready, setReady]     = useState(false)
  const [denied, setDenied]   = useState(false)

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setReady(false)
      return
    }
    let cancelled = false
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream }
        setReady(true)
      })
      .catch(() => { if (!cancelled) setDenied(true) })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [active])

  function capture(): string | null {
    const video = videoRef.current
    if (!video || !ready) return null
    const MAX = 480
    const scale  = Math.min(1, MAX / (video.videoWidth || MAX))
    const canvas = document.createElement('canvas')
    canvas.width  = Math.round((video.videoWidth  || MAX) * scale)
    canvas.height = Math.round((video.videoHeight || 360) * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.78)
  }

  return { videoRef, ready, denied, capture }
}

/* ─── Main inner component ───────────────────────────────────────── */
function ClockPageInner() {
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [screen,    setScreen]    = useState<Screen>('loading')
  const [location,  setLocation]  = useState<Location | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected,  setSelected]  = useState<Employee | null>(null)
  const [record,    setRecord]    = useState<ClockRecord | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [acting,    setActing]    = useState(false)
  const [flash,     setFlash]     = useState(false)
  const [donePhoto, setDonePhoto] = useState<string | null>(null)
  const [now,       setNow]       = useState(new Date())

  const cam = useCamera(screen === 'action')

  /* ── Live clock ── */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  /* ── Load employees ── */
  useEffect(() => {
    if (!token) { setScreen('invalid'); return }
    ;(async () => {
      const res  = await fetch(`/api/clock/employees?token=${encodeURIComponent(token)}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error); setScreen('invalid'); return }
      setLocation(json.location)
      setEmployees(json.employees ?? [])
      setScreen('pick')
    })()
  }, [token])

  function pickEmployee(emp: Employee) {
    setSelected(emp); setRecord(emp.record); setError(null); setScreen('action')
  }

  /* ── Clock action with photo ── */
  async function doAction(action: 'in' | 'out') {
    if (!selected) return
    setActing(true); setError(null)

    // Camera flash + capture
    setFlash(true); setTimeout(() => setFlash(false), 180)
    const photoBase64 = cam.capture()

    const res  = await fetch('/api/clock/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, employee_id: selected.id, action, photo_base64: photoBase64 }),
    })
    const json = await res.json()

    if (!res.ok) { setError(json.error); setActing(false); return }

    setRecord(json.record)
    setDonePhoto(photoBase64) // show local preview immediately
    setEmployees(prev => prev.map(e => e.id === selected.id ? { ...e, record: json.record } : e))
    setScreen('done')
    setActing(false)
  }

  /* ══════════════════════════════════════════════════════════
     INVALID
  ══════════════════════════════════════════════════════════ */
  if (screen === 'invalid') return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 border border-[#E5E7EB] shadow-sm text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <XCircle className="text-red-500 w-8 h-8" />
        </div>
        <h2 className="text-[20px] font-bold text-[#111827] mb-2">Kod QR wygasł</h2>
        <p className="text-[14px] text-[#6B7280] mb-2">{error ?? 'Kod jest nieprawidłowy lub wygasł.'}</p>
        <p className="text-[13px] text-[#9CA3AF]">Poproś managera o odświeżenie kodu QR i spróbuj ponownie.</p>
      </div>
    </main>
  )

  /* ══════════════════════════════════════════════════════════
     LOADING
  ══════════════════════════════════════════════════════════ */
  if (screen === 'loading') return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </main>
  )

  /* ══════════════════════════════════════════════════════════
     DONE
  ══════════════════════════════════════════════════════════ */
  if (screen === 'done') {
    const isIn   = !!record?.clock_in_at && !record?.clock_out_at
    const worked = calcWorked(record?.clock_in_at ?? null, record?.clock_out_at ?? null)
    return (
      <main className={`min-h-screen flex flex-col items-center justify-center p-4 gap-4 ${isIn ? 'bg-[#F0FDF4]' : 'bg-[#FFF7ED]'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isIn ? 'bg-green-100' : 'bg-orange-100'}`}>
          <CheckCircle className={`w-10 h-10 ${isIn ? 'text-green-500' : 'text-orange-500'}`} />
        </div>
        <h2 className={`text-[26px] font-bold ${isIn ? 'text-green-700' : 'text-orange-700'}`}>
          {isIn ? 'Zmiana rozpoczęta!' : 'Zmiana zakończona!'}
        </h2>
        <p className="text-[17px] font-semibold text-slate-700">{selected?.full_name}</p>
        <p className="text-[14px] text-slate-500 flex items-center gap-1">
          <MapPin className="w-4 h-4" />{location?.name}
        </p>
        {isIn  && <p className="text-[28px] font-mono font-bold text-green-600">{fmtTime(record?.clock_in_at)}</p>}
        {!isIn && worked && <p className="text-[20px] font-bold text-orange-600">Przepracowano: {worked}</p>}

        {/* Photo preview */}
        {donePhoto && (
          <div className="mt-1">
            <img
              src={donePhoto} alt="Zdjęcie odbicia"
              className={`w-32 h-32 rounded-2xl object-cover shadow-lg border-4 ${isIn ? 'border-green-200' : 'border-orange-200'}`}
            />
            <p className="text-center text-[11px] text-slate-400 mt-1.5">📷 Zdjęcie zapisane</p>
          </div>
        )}

        <button
          onClick={() => { setScreen('pick'); setSelected(null); setRecord(null); setDonePhoto(null) }}
          className="mt-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-[14px] font-semibold shadow-sm"
        >
          ← Wróć do listy
        </button>
      </main>
    )
  }

  /* ══════════════════════════════════════════════════════════
     EMPLOYEE PICK
  ══════════════════════════════════════════════════════════ */
  if (screen === 'pick') return (
    <main className="min-h-screen bg-[#0F172A] flex flex-col">
      <div className="px-4 pt-8 pb-5 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <MapPin className="text-blue-400 w-4 h-4" />
          <span className="text-blue-400 text-[14px] font-medium">{location?.name}</span>
        </div>
        <div className="text-[32px] font-mono font-bold text-white tabular-nums">
          {now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <p className="text-slate-400 text-[13px] mt-1 capitalize">
          {now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="px-4 pb-2">
        <p className="text-slate-400 text-[13px] font-semibold uppercase tracking-wider">Wybierz pracownika</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2.5">
        {employees.length === 0 ? (
          <p className="text-slate-500 text-center py-10 text-[14px]">Brak aktywnych pracowników</p>
        ) : employees.map(emp => {
          const st = statusOf(emp)
          return (
            <button
              key={emp.id}
              onClick={() => pickEmployee(emp)}
              className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-2xl px-4 py-3.5 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-[18px] shrink-0">
                {emp.full_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[16px] truncate">{emp.full_name}</p>
                <p className="text-slate-400 text-[13px]">{emp.position ?? 'Pracownik'}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                <span className={`text-[12px] font-medium ${st.text}`}>{st.label}</span>
              </div>
            </button>
          )
        })}
      </div>
    </main>
  )

  /* ══════════════════════════════════════════════════════════
     CLOCK ACTION (with camera)
  ══════════════════════════════════════════════════════════ */
  if (screen === 'action' && selected) {
    const clocked_in  = !!record?.clock_in_at
    const clocked_out = !!record?.clock_out_at

    return (
      <main className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 relative">
        {/* Flash overlay */}
        <div className={`fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 ${flash ? 'opacity-80' : 'opacity-0'}`} />

        {/* Back */}
        <button
          onClick={() => setScreen('pick')}
          className="absolute top-4 left-4 flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-[14px]"
        >
          <ChevronLeft className="w-5 h-5" /> Wróć
        </button>

        {/* Employee name */}
        <div className="text-center mb-5">
          <h1 className="text-[22px] font-bold text-white mb-0.5">{selected.full_name}</h1>
          <div className="flex items-center justify-center gap-1.5">
            <MapPin className="text-blue-400 w-4 h-4" />
            <span className="text-blue-400 text-[13px]">{location?.name}</span>
          </div>
        </div>

        {/* Camera preview */}
        <div className="relative mb-4">
          <div className={`w-44 h-44 rounded-full overflow-hidden border-4 ${clocked_in ? 'border-orange-500/60' : 'border-green-500/60'} bg-black/40`}>
            {cam.denied ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <CameraOff className="text-slate-500 w-8 h-8" />
                <span className="text-slate-500 text-[11px] text-center px-3">Brak dostępu do kamery</span>
              </div>
            ) : (
              <>
                <video
                  ref={cam.videoRef}
                  autoPlay playsInline muted
                  className={`w-full h-full object-cover transition-opacity duration-300 ${cam.ready ? 'opacity-100' : 'opacity-0'}`}
                />
                {!cam.ready && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="text-slate-500 w-7 h-7 animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>
          {/* Camera indicator */}
          {!cam.denied && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-0.5">
              <Camera className="text-blue-400 w-3 h-3" />
              <span className="text-[10px] text-blue-300">Zdjęcie automatyczne</span>
            </div>
          )}
        </div>

        {/* Clock display */}
        <div className="text-[44px] font-mono font-bold text-white tabular-nums mb-1">
          {now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <p className="text-slate-400 text-[13px] mb-6 capitalize">
          {now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {/* Today status card */}
        <div className="bg-white/10 rounded-2xl p-4 mb-6 w-full max-w-xs">
          <div className="flex justify-between">
            <div className="text-center flex-1">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Przyjście</p>
              <p className={`text-[20px] font-bold font-mono ${clocked_in ? 'text-green-400' : 'text-slate-600'}`}>
                {fmtTime(record?.clock_in_at)}
              </p>
              {record?.clock_in_photo_url && (
                <img src={record.clock_in_photo_url} alt="" className="w-8 h-8 rounded-lg object-cover mx-auto mt-1 border border-green-500/30" />
              )}
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center flex-1">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Wyjście</p>
              <p className={`text-[20px] font-bold font-mono ${clocked_out ? 'text-orange-400' : 'text-slate-600'}`}>
                {fmtTime(record?.clock_out_at)}
              </p>
              {record?.clock_out_photo_url && (
                <img src={record.clock_out_photo_url} alt="" className="w-8 h-8 rounded-lg object-cover mx-auto mt-1 border border-orange-500/30" />
              )}
            </div>
          </div>
          {calcWorked(record?.clock_in_at ?? null, record?.clock_out_at ?? null) && (
            <div className="text-center pt-3 border-t border-white/10 mt-3">
              <span className="text-white font-semibold text-[13px]">
                Przepracowano: {calcWorked(record?.clock_in_at ?? null, record?.clock_out_at ?? null)}
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-[13px] text-red-300 text-center max-w-xs">
            {error}
          </div>
        )}

        {/* Action button */}
        <div className="w-full max-w-xs">
          {clocked_out ? (
            <div className="py-4 rounded-xl bg-white/10 text-center">
              <p className="text-slate-300 font-semibold">✓ Zmiana zakończona</p>
            </div>
          ) : !clocked_in ? (
            <button
              onClick={() => doAction('in')} disabled={acting}
              className="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-400 text-white font-bold text-[18px] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {acting ? <Loader2 className="animate-spin" /> : <><Clock className="w-5 h-5" /> Rozpocznij zmianę</>}
            </button>
          ) : (
            <button
              onClick={() => doAction('out')} disabled={acting}
              className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-[18px] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {acting ? <Loader2 className="animate-spin" /> : <><LogOut className="w-5 h-5" /> Zakończ zmianę</>}
            </button>
          )}
        </div>
      </main>
    )
  }

  return null
}

export default function ClockPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </main>
    }>
      <ClockPageInner />
    </Suspense>
  )
}
