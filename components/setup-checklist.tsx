'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Rocket, X } from 'lucide-react'
import Link from 'next/link'

type Step = { id: string; label: string; done: boolean; url: string | null }

export function SetupChecklist({ companyId }: { companyId: string }) {
  const [steps, setSteps]         = useState<Step[]>([])
  const [completed, setCompleted] = useState(0)
  const [total, setTotal]         = useState(0)
  const [allDone, setAllDone]     = useState(false)
  const [expanded, setExpanded]   = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded]       = useState(false)

  useEffect(() => {
    // Check if user already dismissed
    const key = `setup-checklist-dismissed-${companyId}`
    if (typeof window !== 'undefined' && localStorage.getItem(key) === 'true') {
      setDismissed(true)
      return
    }
    fetch(`/api/onboarding/status?companyId=${companyId}`)
      .then(r => r.json())
      .then(data => {
        setSteps(data.steps ?? [])
        setCompleted(data.completedCount ?? 0)
        setTotal(data.total ?? 0)
        setAllDone(data.allDone ?? false)
        setLoaded(true)
        // Auto-collapse when almost done
        if ((data.completedCount ?? 0) >= (data.total ?? 1) - 1) setExpanded(false)
      })
      .catch(() => setLoaded(true))
  }, [companyId])

  const dismiss = () => {
    const key = `setup-checklist-dismissed-${companyId}`
    localStorage.setItem(key, 'true')
    setDismissed(true)
  }

  if (!loaded || dismissed || allDone) return null

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <Rocket className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-blue-900">Konfiguracja konta</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-blue-600 font-semibold shrink-0">{completed}/{total}</span>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-blue-400 hover:text-blue-600 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={dismiss} className="text-blue-300 hover:text-blue-500 shrink-0" title="Zamknij">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Steps */}
      {expanded && (
        <div className="border-t border-blue-200 bg-white/60 px-4 py-2 space-y-1.5">
          {steps.map(step => (
            <div key={step.id} className="flex items-center gap-2.5 py-1">
              {step.done
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
              {step.done || !step.url
                ? <span className={`text-[13px] ${step.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{step.label}</span>
                : <Link href={step.url} className="text-[13px] text-blue-700 hover:text-blue-900 hover:underline font-medium">{step.label} →</Link>}
            </div>
          ))}
          <p className="text-[11px] text-blue-400 pb-1 pt-0.5">Kliknij krok, aby przejść do odpowiedniej sekcji</p>
        </div>
      )}
    </div>
  )
}
