'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, RotateCcw, Check, X, Loader2, AlertCircle } from 'lucide-react'

type Props = {
  onCapture: (blob: Blob) => void
  onClose: () => void
}

/**
 * Full-screen camera modal using getUserMedia.
 * Forces real-time capture — the device gallery is never accessible.
 *
 * Flow:
 *   1. Modal opens → starts rear camera stream
 *   2. User sees live preview → taps "Zrób zdjęcie"
 *   3. Frame is captured to canvas → shown as preview
 *   4. User confirms ("Użyj") or retakes ("Ponów")
 *   5. onCapture(blob) is called with the JPEG blob
 */
export function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)

  const [phase, setPhase]     = useState<'loading' | 'preview' | 'captured' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  // ── Start camera ────────────────────────────────────────────────
  const startCamera = async (facing: 'environment' | 'user') => {
    // Stop any existing stream first
    streamRef.current?.getTracks().forEach(t => t.stop())
    setPhase('loading')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setPhase('preview')
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      if (e.name === 'NotAllowedError') {
        setErrorMsg('Brak dostępu do kamery. Zezwól na dostęp do kamery w ustawieniach przeglądarki.')
      } else if (e.name === 'NotFoundError') {
        setErrorMsg('Nie znaleziono kamery na tym urządzeniu.')
      } else {
        setErrorMsg(e.message || 'Nie można uruchomić kamery.')
      }
      setPhase('error')
    }
  }

  useEffect(() => {
    startCamera(facingMode)
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Capture frame ────────────────────────────────────────────────
  const capturePhoto = () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    // Stop the stream while showing preview (saves battery)
    streamRef.current?.getTracks().forEach(t => t.stop())

    const url = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedUrl(url)
    setPhase('captured')
  }

  // ── Retake ───────────────────────────────────────────────────────
  const retake = () => {
    setCapturedUrl(null)
    startCamera(facingMode)
  }

  // ── Confirm and emit blob ────────────────────────────────────────
  const confirmCapture = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob)
      },
      'image/jpeg',
      0.92
    )
  }

  // ── Flip camera ──────────────────────────────────────────────────
  const flipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    startCamera(next)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-safe pt-4 pb-3">
        <button
          onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose() }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white"
        >
          <X className="w-5 h-5" />
        </button>
        {phase === 'preview' && (
          <button
            onClick={flipCamera}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Video / captured image ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {/* Loading spinner */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-[14px]">Uruchamianie kamery…</span>
          </div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <div className="flex flex-col items-center gap-3 px-8 text-center text-white">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-[14px] leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="mt-2 px-5 h-11 rounded-xl bg-white text-[#111827] text-[14px] font-semibold"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {/* Live viewfinder */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${phase === 'preview' ? 'block' : 'hidden'}`}
        />

        {/* Captured still */}
        {phase === 'captured' && capturedUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={capturedUrl} alt="Zdjęcie" className="w-full h-full object-contain" />
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* ── Bottom controls ── */}
      <div className="pb-safe pb-8 pt-4 flex items-center justify-center gap-8 bg-black">
        {phase === 'preview' && (
          <button
            onClick={capturePhoto}
            className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all active:scale-95"
          >
            <Camera className="w-8 h-8 text-white" />
          </button>
        )}

        {phase === 'captured' && (
          <>
            {/* Retake */}
            <button
              onClick={retake}
              className="flex flex-col items-center gap-1 text-white"
            >
              <div className="w-14 h-14 rounded-full border-2 border-white/50 bg-black/40 flex items-center justify-center">
                <RotateCcw className="w-6 h-6" />
              </div>
              <span className="text-[11px]">Ponów</span>
            </button>

            {/* Confirm */}
            <button
              onClick={confirmCapture}
              className="flex flex-col items-center gap-1 text-white"
            >
              <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-900/40">
                <Check className="w-9 h-9 text-white" />
              </div>
              <span className="text-[12px] font-semibold">Użyj</span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
