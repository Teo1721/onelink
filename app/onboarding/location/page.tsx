'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OneLinkLogo } from '@/components/onelink-logo'
import { Loader2, CheckCircle2 } from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────────── */
type LocationType = 'restaurant' | 'sklep' | 'sklepik_szkolny' | 'stolowka' | 'produkcja' | 'magazyn' | 'inne'
type CostMethod   = 'fifo' | 'average' | 'manual'

interface FormState {
  name: string
  type: LocationType | ''
  currency: 'PLN' | 'EUR' | 'USD' | 'GBP'
  country: string
  city: string
  vat_default: number
  default_margin: number
  cost_method: CostMethod
  use_inventory: boolean
  use_recipes: boolean
  use_price_calculator: boolean
  use_daily_reports: boolean
  address: string
  phone: string
  notes: string
}

const INITIAL: FormState = {
  name: '', type: '', currency: 'PLN', country: 'Polska', city: '',
  vat_default: 8, default_margin: 30, cost_method: 'fifo',
  use_inventory: true, use_recipes: true, use_price_calculator: true, use_daily_reports: true,
  address: '', phone: '', notes: '',
}

const TYPE_LABELS: Record<LocationType, string> = {
  restaurant: 'Restauracja', sklep: 'Sklep', sklepik_szkolny: 'Sklepik szkolny',
  stolowka: 'Stołówka', produkcja: 'Produkcja', magazyn: 'Magazyn', inne: 'Inne',
}

const COST_LABELS: Record<CostMethod, string> = {
  fifo: 'FIFO', average: 'Średnia ważona', manual: 'Ręczna',
}

/* ─── Shared UI ──────────────────────────────────────────────────── */
const inputCls = 'w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-[#9CA3AF]'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">{children}</label>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-6">
      <div className="h-[1px] w-4 bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4]" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{children}</span>
      <div className="flex-1 h-[1px] bg-[#F3F4F6]" />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string | number | boolean | undefined }) {
  if (value === '' || value === undefined || value === null) return null
  const display = typeof value === 'boolean' ? (value ? '✓ Tak' : '✗ Nie') : String(value)
  return (
    <div className="flex justify-between items-start py-2 border-b border-[#F3F4F6] last:border-0">
      <span className="text-[13px] text-[#6B7280]">{label}</span>
      <span className="text-[13px] font-medium text-[#111827] text-right max-w-[55%]">{display}</span>
    </div>
  )
}

/* ─── Progress bar ───────────────────────────────────────────────── */
function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Powitanie', 'Szczegóły', 'Podsumowanie']
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => {
        const n = i + 1
        const active = n === step
        const done   = n < step
        return (
          <div key={label} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex items-center gap-2">
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0',
                done   ? 'bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] text-white' : '',
                active ? 'bg-[#1D4ED8] text-white ring-4 ring-blue-100' : '',
                !active && !done ? 'bg-[#E5E7EB] text-[#9CA3AF]' : '',
              ].join(' ')}>
                {done ? <CheckCircle2 size={13} /> : n}
              </div>
              <span className={`text-[12px] font-medium hidden sm:block whitespace-nowrap ${active ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-[2px] mx-3 rounded-full ${done ? 'bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4]' : 'bg-[#E5E7EB]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function OnboardingLocationPage() {
  const router = useRouter()
  const [step, setStep]   = useState<1 | 2 | 3>(1)
  const [form, setForm]   = useState<FormState>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleCreate() {
    setSaving(true); setError(null)
    try {
      const res  = await fetch('/api/onboarding/create-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Wystąpił błąd')
      router.push('/admin')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setSaving(false)
    }
  }

  /* ── Step 1: Welcome ── */
  if (step === 1) return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl px-8 py-10 border border-[#E5E7EB] shadow-sm text-center">
          <ProgressBar step={1} />
          <div className="flex justify-center mb-8">
            <OneLinkLogo iconSize={40} textSize="text-[22px]" dark={false} />
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#E0F2FE] border border-blue-100 flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-[#1D4ED8]" stroke="currentColor" strokeWidth={1.75}>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-[28px] font-bold text-[#111827] mb-2 tracking-tight">Witaj w OneLink!</h1>
          <p className="text-[16px] text-[#6B7280] mb-3">Zanim zaczniesz, utwórz pierwszą lokalizację</p>
          <p className="text-[13px] text-[#9CA3AF] leading-relaxed max-w-sm mx-auto mb-8">
            Lokalizacja to Twój punkt sprzedaży — restauracja, sklep, stołówka lub magazyn.
            Każda lokalizacja ma własne raporty, magazyn i ustawienia.
            Możesz dodać więcej w dowolnym momencie.
          </p>
          <button
            onClick={() => setStep(2)}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white font-bold text-[15px] hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
          >
            Utwórz pierwszą lokalizację →
          </button>
        </div>
      </div>
    </main>
  )

  /* ── Step 2: Form ── */
  if (step === 2) return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl px-8 py-8 border border-[#E5E7EB] shadow-sm">
          <ProgressBar step={2} />
          <h2 className="text-[22px] font-bold text-[#111827] mb-1">Szczegóły lokalizacji</h2>
          <p className="text-[13px] text-[#9CA3AF] mb-2">Pola z * są wymagane. Resztę możesz uzupełnić później.</p>

          {/* Basic */}
          <SectionTitle>Podstawowe informacje</SectionTitle>
          <div className="space-y-4">
            <div>
              <FieldLabel>Nazwa lokalizacji *</FieldLabel>
              <input
                className={inputCls} placeholder="np. Restauracja Centrum"
                value={form.name} onChange={e => set('name', e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Typ lokalizacji *</FieldLabel>
              <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value as LocationType)}>
                <option value="">— wybierz typ —</option>
                {(Object.entries(TYPE_LABELS) as [LocationType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Waluta</FieldLabel>
                <select className={inputCls} value={form.currency} onChange={e => set('currency', e.target.value as FormState['currency'])}>
                  {(['PLN', 'EUR', 'USD', 'GBP'] as const).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Kraj</FieldLabel>
                <input className={inputCls} value={form.country} onChange={e => set('country', e.target.value)} />
              </div>
            </div>
            <div>
              <FieldLabel>Miasto</FieldLabel>
              <input className={inputCls} placeholder="np. Warszawa" value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
          </div>

          {/* Finance */}
          <SectionTitle>Ustawienia finansowe</SectionTitle>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Domyślny VAT (%)</FieldLabel>
                <input type="number" min={0} max={100} className={inputCls} value={form.vat_default} onChange={e => set('vat_default', Number(e.target.value))} />
              </div>
              <div>
                <FieldLabel>Domyślna marża (%)</FieldLabel>
                <input type="number" min={0} max={100} className={inputCls} value={form.default_margin} onChange={e => set('default_margin', Number(e.target.value))} />
              </div>
            </div>
            <div>
              <FieldLabel>Metoda wyceny kosztu</FieldLabel>
              <select className={inputCls} value={form.cost_method} onChange={e => set('cost_method', e.target.value as CostMethod)}>
                {(Object.entries(COST_LABELS) as [CostMethod, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Modules */}
          <SectionTitle>Moduły</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              ['use_inventory',        'Magazyn'],
              ['use_recipes',          'Receptury'],
              ['use_price_calculator', 'Kalkulator cen'],
              ['use_daily_reports',    'Raporty dzienne'],
            ] as [keyof FormState, string][]).map(([key, label]) => (
              <label key={key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${form[key] ? 'border-blue-300 bg-blue-50' : 'border-[#E5E7EB] hover:border-[#D1D5DB]'}`}>
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={e => set(key, e.target.checked as FormState[typeof key])}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-[13px] font-medium text-[#374151]">{label}</span>
              </label>
            ))}
          </div>

          {/* Optional */}
          <SectionTitle>Opcjonalnie</SectionTitle>
          <div className="space-y-3">
            <div>
              <FieldLabel>Adres</FieldLabel>
              <input className={inputCls} placeholder="ul. Przykładowa 1" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Telefon</FieldLabel>
              <input className={inputCls} placeholder="+48 123 456 789" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Notatki</FieldLabel>
              <textarea rows={3} className={inputCls + ' resize-none'} placeholder="Dodatkowe informacje..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {/* Nav */}
          <div className="flex gap-3 mt-8">
            <button onClick={() => setStep(1)} className="flex-1 h-11 rounded-xl border border-[#E5E7EB] text-[14px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-colors">
              Wstecz
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!form.name.trim() || !form.type}
              className="flex-[2] h-11 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white font-bold text-[14px] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Dalej →
            </button>
          </div>
        </div>
      </div>
    </main>
  )

  /* ── Step 3: Confirm ── */
  return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl px-8 py-8 border border-[#E5E7EB] shadow-sm">
          <ProgressBar step={3} />
          <h2 className="text-[22px] font-bold text-[#111827] mb-1">Podsumowanie</h2>
          <p className="text-[13px] text-[#9CA3AF] mb-5">Sprawdź dane przed utworzeniem lokalizacji.</p>

          <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] px-5 py-3 mb-5">
            <SummaryRow label="Nazwa"          value={form.name} />
            <SummaryRow label="Typ"            value={form.type ? TYPE_LABELS[form.type as LocationType] : undefined} />
            <SummaryRow label="Waluta"         value={form.currency} />
            <SummaryRow label="Kraj"           value={form.country} />
            <SummaryRow label="Miasto"         value={form.city} />
            <SummaryRow label="Domyślny VAT"   value={`${form.vat_default}%`} />
            <SummaryRow label="Domyślna marża" value={`${form.default_margin}%`} />
            <SummaryRow label="Metoda wyceny"  value={COST_LABELS[form.cost_method]} />
          </div>

          <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] px-5 py-3 mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Moduły</p>
            <div className="grid grid-cols-2 gap-x-4">
              <SummaryRow label="Magazyn"         value={form.use_inventory} />
              <SummaryRow label="Receptury"        value={form.use_recipes} />
              <SummaryRow label="Kalkulator cen"   value={form.use_price_calculator} />
              <SummaryRow label="Raporty dzienne"  value={form.use_daily_reports} />
            </div>
          </div>

          {(form.address || form.phone || form.notes) && (
            <div className="bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] px-5 py-3 mb-5">
              <SummaryRow label="Adres"   value={form.address} />
              <SummaryRow label="Telefon" value={form.phone} />
              <SummaryRow label="Notatki" value={form.notes} />
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} disabled={saving} className="flex-1 h-11 rounded-xl border border-[#E5E7EB] text-[14px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-colors disabled:opacity-40">
              Wstecz
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-[2] h-11 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white font-bold text-[14px] hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Tworzę lokalizację…</>
                : 'Utwórz lokalizację'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
