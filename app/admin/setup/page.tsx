'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OneLinkLogo } from '@/components/onelink-logo'
import {
  MapPin, Users, Check, ArrowRight, Loader2,
  Plus, Trash2, ChevronRight, Building2, Sparkles,
} from 'lucide-react'

type Step = 1 | 2 | 3

interface Employee {
  full_name: string
  position: string
  email: string
}

const POSITIONS = [
  'Kierownik', 'Szef kuchni', 'Kucharz', 'Kelner', 'Barista',
  'Barman', 'Kasjer', 'Pracownik sali', 'Sprzątaczka', 'Inne',
]

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
            n < current ? 'bg-emerald-500 text-white'
            : n === current ? 'bg-[#1D4ED8] text-white shadow-lg shadow-blue-500/30'
            : 'bg-[#E5E7EB] text-[#9CA3AF]'
          }`}>
            {n < current ? <Check className="w-4 h-4" /> : n}
          </div>
          {n < total && (
            <div className={`w-12 h-0.5 rounded-full transition-all ${n < current ? 'bg-emerald-500' : 'bg-[#E5E7EB]'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function SetupPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [checking, setChecking] = useState(true)

  // Step 1 — location
  const [locName, setLocName] = useState('')
  const [locAddr, setLocAddr] = useState('')
  const [locSaving, setLocSaving] = useState(false)
  const [locationId, setLocationId] = useState<string | null>(null)

  // Step 2 — employees
  const [employees, setEmployees] = useState<Employee[]>([{ full_name: '', position: 'Kelner', email: '' }])
  const [empSaving, setEmpSaving] = useState(false)
  const [empSkipped, setEmpSkipped] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: profile } = await supabase
        .from('user_profiles').select('company_id').eq('id', user.id).maybeSingle()

      if (!profile?.company_id) { router.replace('/admin'); return }
      setCompanyId(profile.company_id)

      // If they already have a location, skip to admin
      const { data: locs } = await supabase
        .from('locations').select('id').eq('company_id', profile.company_id).limit(1)
      if (locs && locs.length > 0) { router.replace('/admin'); return }

      setChecking(false)
    })()
  }, [supabase, router])

  // Step 1: Save location
  const saveLocation = async () => {
    if (!locName.trim() || !companyId) return
    setLocSaving(true)
    const { data, error } = await supabase.from('locations')
      .insert({ company_id: companyId, name: locName.trim(), address: locAddr.trim() || null })
      .select('id').single()
    setLocSaving(false)
    if (error || !data) { alert('Błąd: ' + error?.message); return }
    setLocationId(data.id)
    setStep(2)
  }

  // Step 2: Save employees
  const saveEmployees = async () => {
    const valid = employees.filter(e => e.full_name.trim())
    if (!valid.length || !companyId || !locationId) { setStep(3); return }
    setEmpSaving(true)
    await supabase.from('employees').insert(
      valid.map(e => ({
        company_id: companyId,
        location_id: locationId,
        full_name: e.full_name.trim(),
        position: e.position,
        email: e.email.trim() || null,
        status: 'active',
      }))
    )
    setEmpSaving(false)
    setStep(3)
  }

  const addEmployee = () => setEmployees(prev => [...prev, { full_name: '', position: 'Kelner', email: '' }])
  const removeEmployee = (i: number) => setEmployees(prev => prev.filter((_, idx) => idx !== i))
  const updateEmployee = (i: number, field: keyof Employee, value: string) =>
    setEmployees(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="w-6 h-6 animate-spin text-[#9CA3AF]" />
      </div>
    )
  }

  const inp = "w-full h-11 px-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[14px] text-[#111827] placeholder-[#D1D5DB] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center px-6">
        <OneLinkLogo dark={false} iconSize={22} textSize="text-[14px]" />
        <span className="ml-4 text-[13px] text-[#9CA3AF]">Konfiguracja konta</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[560px]">

          {/* Progress */}
          <div className="flex flex-col items-center mb-10">
            <StepIndicator current={step} total={3} />
            <p className="text-[12px] text-[#9CA3AF] mt-3">Krok {step} z 3</p>
          </div>

          {/* ── STEP 1: Location ── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-[20px] font-black text-[#111827]">Dodaj swój lokal</h1>
                  <p className="text-[13px] text-[#9CA3AF]">Możesz dodać więcej lokalizacji później w ustawieniach</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                    Nazwa lokalu <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={locName}
                    onChange={e => setLocName(e.target.value)}
                    placeholder="np. Restauracja Centrum, Kawiarnia Mokotów"
                    className={inp}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                    Adres (opcjonalnie)
                  </label>
                  <input
                    value={locAddr}
                    onChange={e => setLocAddr(e.target.value)}
                    placeholder="np. ul. Marszałkowska 1, Warszawa"
                    className={inp}
                  />
                </div>
              </div>

              <button
                onClick={saveLocation}
                disabled={!locName.trim() || locSaving}
                className="mt-6 w-full h-12 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-[14px] font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {locSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Dalej</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* ── STEP 2: Employees ── */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h1 className="text-[20px] font-black text-[#111827]">Dodaj pracowników</h1>
                  <p className="text-[13px] text-[#9CA3AF]">Możesz pominąć i uzupełnić później w zakładce Pracownicy</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {employees.map((emp, i) => (
                  <div key={i} className="flex gap-2 items-start bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3">
                    <div className="flex-1 space-y-2">
                      <input
                        value={emp.full_name}
                        onChange={e => updateEmployee(i, 'full_name', e.target.value)}
                        placeholder="Imię i nazwisko"
                        className="w-full h-9 px-3 rounded-lg bg-white border border-[#E5E7EB] text-[13px] text-[#111827] placeholder-[#D1D5DB] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      />
                      <div className="flex gap-2">
                        <select
                          value={emp.position}
                          onChange={e => updateEmployee(i, 'position', e.target.value)}
                          className="flex-1 h-9 px-3 rounded-lg bg-white border border-[#E5E7EB] text-[13px] text-[#111827] focus:outline-none focus:border-blue-400"
                        >
                          {POSITIONS.map(p => <option key={p}>{p}</option>)}
                        </select>
                        <input
                          value={emp.email}
                          onChange={e => updateEmployee(i, 'email', e.target.value)}
                          placeholder="Email (opcj.)"
                          type="email"
                          className="flex-1 h-9 px-3 rounded-lg bg-white border border-[#E5E7EB] text-[13px] text-[#111827] placeholder-[#D1D5DB] focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                    {employees.length > 1 && (
                      <button onClick={() => removeEmployee(i)} className="mt-1 text-[#9CA3AF] hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addEmployee}
                className="flex items-center gap-2 text-[13px] font-semibold text-[#2563EB] hover:text-blue-700 mb-6 transition-colors"
              >
                <Plus className="w-4 h-4" /> Dodaj kolejnego pracownika
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => { setEmpSkipped(true); setStep(3) }}
                  className="flex-1 h-11 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
                >
                  Pomiń
                </button>
                <button
                  onClick={saveEmployees}
                  disabled={!employees.some(e => e.full_name.trim()) || empSaving}
                  className="flex-[2] h-11 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-[14px] font-bold text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {empSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Zapisz i kontynuuj</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-[24px] font-black text-[#111827] mb-2">Gotowe! Konto skonfigurowane</h1>
              <p className="text-[14px] text-[#6B7280] mb-2">
                Lokal <strong className="text-[#111827]">«{locName}»</strong> został dodany.
                {!empSkipped && <> Pracownicy zostali zapisani.</>}
              </p>
              <p className="text-[13px] text-[#9CA3AF] mb-8">
                Przejdź do dashboardu i zacznij korzystać z pełnej platformy OneLink.
              </p>

              {/* Quick links */}
              <div className="grid grid-cols-2 gap-3 mb-8 text-left">
                {[
                  { label: 'Dodaj pierwsze dane sprzedaży', desc: 'Raport dzienny → wprowadź utarg', icon: '📊' },
                  { label: 'Skonfiguruj faktury', desc: 'Zatwierdzenia → Faktury', icon: '🧾' },
                  { label: 'Uruchom AI dyrektorów', desc: 'CFO, HR, Sprzedaż, Inwestorski', icon: '🤖' },
                  { label: 'Zaproś współpracownika', desc: 'Admin → Użytkownicy', icon: '👥' },
                ].map(({ label, desc, icon }) => (
                  <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                    <span className="text-[18px] shrink-0">{icon}</span>
                    <div>
                      <p className="text-[12px] font-semibold text-[#374151]">{label}</p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push('/admin')}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-[14px] font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <span>Otwórz dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
