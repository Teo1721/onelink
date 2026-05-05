'use client'

import { useState } from 'react'
import { Save, RotateCcw, Trash2, Loader2, Cloud } from 'lucide-react'

type Props = {
  /** ISO timestamp from DB */
  savedAt: string | null
  /** True if there is a recoverable draft in DB */
  hasDraft: boolean
  /** True while the debounced upsert is in flight */
  saving: boolean
  /** Called when user clicks "Przywróć" */
  onRestore: () => Promise<void>
  /** Called when user clicks "Odrzuć" */
  onDiscard: () => Promise<void>
  /** Extra class names on wrapper */
  className?: string
}

/**
 * Small status bar shown at the top of forms that support draft saving.
 *
 * Behaviour:
 * - While saving (debounce in flight): spinner + "Zapisywanie…"
 * - After first save: "Wersja robocza zapisana o HH:MM ✓" + "Odrzuć"
 * - On first open when a pre-existing draft exists: also shows "Przywróć" button
 */
export function DraftBanner({ savedAt, hasDraft, saving, onRestore, onDiscard, className = '' }: Props) {
  const [restoring, setRestoring] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [restored, setRestored] = useState(false)
  // After the first restore we don't show the "Przywróć" button again
  const [offerRestore, setOfferRestore] = useState(true)

  if (!hasDraft && !saving) return null

  const timeLabel = savedAt
    ? new Date(savedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : null

  const handleRestore = async () => {
    setRestoring(true)
    await onRestore()
    setRestoring(false)
    setRestored(true)
    setOfferRestore(false)
  }

  const handleDiscard = async () => {
    setDiscarding(true)
    await onDiscard()
    setDiscarding(false)
    setOfferRestore(false)
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-[13px] mb-4 ${
      saving
        ? 'bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]'
        : 'bg-amber-50 border-amber-200 text-amber-800'
    } ${className}`}>
      {/* Icon */}
      {saving ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#6B7280] shrink-0" />
      ) : (
        <Cloud className="w-4 h-4 text-amber-500 shrink-0" />
      )}

      {/* Text */}
      <span className="flex-1">
        {saving
          ? 'Zapisywanie wersji roboczej…'
          : restored
          ? `Wersja robocza przywrócona ✓`
          : timeLabel
          ? `Wersja robocza z ${timeLabel} — niezapisana`
          : 'Wersja robocza'}
      </span>

      {/* Action buttons */}
      {!saving && (
        <div className="flex items-center gap-2 shrink-0">
          {offerRestore && hasDraft && !restored && (
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="flex items-center gap-1 px-3 h-7 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium text-[12px] transition-colors disabled:opacity-50"
            >
              {restoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Przywróć
            </button>
          )}
          {hasDraft && (
            <button
              onClick={handleDiscard}
              disabled={discarding}
              className="flex items-center gap-1 px-3 h-7 rounded-lg bg-white hover:bg-red-50 border border-amber-200 hover:border-red-300 text-amber-700 hover:text-red-600 font-medium text-[12px] transition-colors disabled:opacity-50"
            >
              {discarding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Odrzuć
            </button>
          )}
          {hasDraft && timeLabel && (
            <span className="flex items-center gap-1 text-[11px] text-amber-600 opacity-70">
              <Save className="w-3 h-3" />{timeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
