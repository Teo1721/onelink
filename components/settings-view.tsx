'use client'

import { useState, useEffect } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  Building2, MapPin, CreditCard, Bell, Save, Plus, Trash2,
  Loader2, Check, ExternalLink, RefreshCw, Mail, Smartphone,
  Shield, ChevronRight, AlertCircle,
} from 'lucide-react'

type Location = { id: string; name: string; address: string | null }
type Company  = { id: string; name: string }

type Tab = 'company' | 'locations' | 'subscription' | 'notifications'

/* ── Tab button ─────────────────────────────────────────── */
function TabBtn({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: any; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
        active ? 'bg-[#111827] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}

/* ── Toast ──────────────────────────────────────────────── */
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-[13px] font-semibold transition-all ${
      ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  )
}

/* ── Company tab ────────────────────────────────────────── */
function CompanyTab({ supabase, company }: { supabase: SupabaseClient; company: Company }) {
  const [name, setName] = useState(company.name)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('companies').update({ name: name.trim() }).eq('id', company.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-bold text-[#111827] mb-1">Dane firmy</h3>
        <p className="text-[13px] text-[#6B7280]">Nazwa wyświetlana w raportach i emailach.</p>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5">
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Nazwa firmy / restauracji</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-11 px-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[14px] text-[#111827] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
          />
        </div>
        <button
          onClick={save}
          disabled={saving || name === company.name}
          className="flex items-center gap-2 h-10 px-5 rounded-xl bg-[#111827] text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-[#1F2937] transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Zapisano!' : 'Zapisz zmiany'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-200 p-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-[#111827] mb-1">Strefa niebezpieczna</p>
            <p className="text-[12px] text-[#6B7280] mb-3">Usunięcie konta jest nieodwracalne. Wszystkie dane zostaną trwale usunięte.</p>
            <p className="text-[12px] text-[#9CA3AF]">Aby usunąć konto, skontaktuj się z pomocą techniczną: <a href="mailto:kontakt@onelink.pl" className="text-red-600 underline">kontakt@onelink.pl</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Locations tab ──────────────────────────────────────── */
function LocationsTab({ supabase, companyId }: { supabase: SupabaseClient; companyId: string }) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAddr, setNewAddr] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    supabase.from('locations').select('id,name,address').eq('company_id', companyId).order('name')
      .then(({ data }) => { setLocations(data ?? []); setLoading(false) })
  }, [companyId])

  const add = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('locations')
      .insert({ company_id: companyId, name: newName.trim(), address: newAddr.trim() || null })
      .select().single()
    setSaving(false)
    if (error) { showToast('Błąd: ' + error.message, false); return }
    setLocations(l => [...l, data])
    setNewName(''); setNewAddr(''); setAdding(false)
    showToast('Lokalizacja dodana')
  }

  const remove = async (id: string) => {
    if (!confirm('Usunąć tę lokalizację? Wszystkie powiązane dane zostaną zachowane.')) return
    await supabase.from('locations').delete().eq('id', id)
    setLocations(l => l.filter(x => x.id !== id))
    showToast('Lokalizacja usunięta')
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" /></div>

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
      <div>
        <h3 className="text-[15px] font-bold text-[#111827] mb-1">Lokalizacje</h3>
        <p className="text-[13px] text-[#6B7280]">Zarządzaj lokalami w sieci. Każda lokalizacja ma osobne dane sprzedaży, pracowników i magazyn.</p>
      </div>

      <div className="space-y-3">
        {locations.map(loc => (
          <div key={loc.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111827]">{loc.name}</p>
                {loc.address && <p className="text-[12px] text-[#9CA3AF]">{loc.address}</p>}
              </div>
            </div>
            <button onClick={() => remove(loc.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {locations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E5E7EB]">
            <MapPin className="w-8 h-8 text-[#D1D5DB] mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-[#374151] mb-1">Brak lokalizacji</p>
            <p className="text-[12px] text-[#9CA3AF]">Dodaj pierwszy lokal, aby zacząć zbierać dane.</p>
          </div>
        )}
      </div>

      {adding ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
          <p className="text-[13px] font-bold text-[#111827]">Nowa lokalizacja</p>
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Nazwa lokalu *</label>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="np. Chmielna 1" autoFocus
              className="w-full h-11 px-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[14px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Adres (opcjonalnie)</label>
            <input value={newAddr} onChange={e => setNewAddr(e.target.value)}
              placeholder="ul. Chmielna 1, 00-001 Warszawa"
              className="w-full h-11 px-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[14px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving || !newName.trim()}
              className="flex items-center gap-2 h-10 px-5 rounded-xl bg-[#111827] text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-[#1F2937] transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Dodaj
            </button>
            <button onClick={() => { setAdding(false); setNewName(''); setNewAddr('') }}
              className="h-10 px-4 rounded-xl border border-[#E5E7EB] text-[13px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB] transition-colors">
              Anuluj
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 h-10 px-5 rounded-xl border border-dashed border-[#D1D5DB] text-[13px] font-semibold text-[#6B7280] hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all w-full justify-center">
          <Plus className="w-4 h-4" />
          Dodaj lokalizację
        </button>
      )}
    </div>
  )
}

/* ── Subscription tab ───────────────────────────────────── */
function SubscriptionTab({ plan }: { plan: string | null }) {
  const [loading, setLoading] = useState(false)

  const PLAN_NAMES: Record<string, string> = { plan1: 'Start', plan2: 'Rozwój', plan3: 'Sieć' }
  const PLAN_COLORS: Record<string, string> = {
    plan1: 'from-slate-500 to-slate-700',
    plan2: 'from-[#1D4ED8] to-[#06B6D4]',
    plan3: 'from-violet-600 to-purple-700',
  }

  const openPortal = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-bold text-[#111827] mb-1">Subskrypcja</h3>
        <p className="text-[13px] text-[#6B7280]">Zarządzaj planem, fakturami i metodą płatności przez portal Stripe.</p>
      </div>

      {/* Current plan card */}
      <div className={`rounded-2xl p-6 text-white bg-gradient-to-br ${plan ? PLAN_COLORS[plan] ?? 'from-slate-600 to-slate-800' : 'from-slate-600 to-slate-800'}`}>
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-70 mb-1">Aktywny plan</p>
        <p className="text-[32px] font-black leading-none">{plan ? PLAN_NAMES[plan] ?? plan : 'Trial'}</p>
        {plan && (
          <p className="text-[13px] opacity-60 mt-2">
            {plan === 'plan1' ? '1 lokal · 1 manager · CFO AI' :
             plan === 'plan2' ? 'Do 2 lokali · 2 managerów · 3 Dyrektory AI' :
             'Do 5 lokali · 5 managerów · Wszystkie Dyrektory AI'}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button onClick={openPortal} disabled={loading}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-[#111827]">Portal płatności Stripe</p>
              <p className="text-[11px] text-[#9CA3AF]">Zmień plan, zaktualizuj kartę, pobierz faktury</p>
            </div>
          </div>
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#9CA3AF]" /> : <ExternalLink className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#374151] transition-colors" />}
        </button>

        <a href="/pricing" className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-semibold text-[#111827]">Zmień plan</p>
              <p className="text-[11px] text-[#9CA3AF]">Porównaj plany i wybierz odpowiedni dla Twojej sieci</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#374151] transition-colors" />
        </a>
      </div>
    </div>
  )
}

/* ── Notifications tab ──────────────────────────────────── */
function NotificationsTab({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const [prefs, setPrefs] = useState({
    email_weekly_summary: true,
    email_critical_alerts: true,
    email_invoice_pending: true,
    push_critical_alerts: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('user_notification_prefs').select('*').eq('user_id', userId).maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs(p => ({ ...p, ...data }))
        setLoading(false)
      })
  }, [userId])

  const save = async () => {
    setSaving(true)
    await supabase.from('user_notification_prefs').upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }))

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[#9CA3AF]" /></div>

  const NOTIFS = [
    { key: 'email_weekly_summary' as const, icon: Mail, label: 'Tygodniowy briefing email', desc: 'Każdy poniedziałek — podsumowanie P&L, alerty, rekomendacje CFO AI' },
    { key: 'email_critical_alerts' as const, icon: Mail, label: 'Krytyczne alerty email', desc: 'Natychmiastowy email gdy AI wykryje krytyczny problem finansowy lub HR' },
    { key: 'email_invoice_pending' as const, icon: Mail, label: 'Faktury do zatwierdzenia email', desc: 'Przypomnienie o niezatwierdzonych fakturach starszych niż 7 dni' },
    { key: 'push_critical_alerts' as const, icon: Smartphone, label: 'Push: krytyczne alerty', desc: 'Powiadomienie push na telefon dla alertów o poziomie krytycznym' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-bold text-[#111827] mb-1">Powiadomienia</h3>
        <p className="text-[13px] text-[#6B7280]">Wybierz jak i kiedy chcesz być informowany o ważnych zdarzeniach.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
        {NOTIFS.map(({ key, icon: Icon, label, desc }) => (
          <div key={key} className="flex items-center justify-between p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-[#6B7280]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#111827]">{label}</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5 max-w-sm">{desc}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ml-4 ${prefs[key] ? 'bg-emerald-500' : 'bg-[#D1D5DB]'}`}
              style={{ height: 22, width: 40 }}
            >
              <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${prefs[key] ? 'translate-x-[18px]' : ''}`} />
            </button>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 h-10 px-5 rounded-xl bg-[#111827] text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-[#1F2937] transition-colors">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
        {saved ? 'Zapisano!' : 'Zapisz preferencje'}
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Main export
══════════════════════════════════════════════════════════ */
export function SettingsView({
  supabase, companyId, userId, subscriptionPlan,
}: {
  supabase: SupabaseClient
  companyId: string
  userId: string
  subscriptionPlan: string | null
}) {
  const [tab, setTab] = useState<Tab>('company')
  const [company, setCompany] = useState<Company | null>(null)

  useEffect(() => {
    supabase.from('companies').select('id,name').eq('id', companyId).maybeSingle()
      .then(({ data }) => setCompany(data))
  }, [companyId])

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'company',       label: 'Firma',          icon: Building2 },
    { key: 'locations',     label: 'Lokalizacje',    icon: MapPin },
    { key: 'subscription',  label: 'Subskrypcja',    icon: CreditCard },
    { key: 'notifications', label: 'Powiadomienia',  icon: Bell },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Ustawienia</h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">Zarządzaj firmą, lokalizacjami, subskrypcją i powiadomieniami.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-7 p-1 bg-[#F3F4F6] rounded-2xl w-fit">
        {TABS.map(t => <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} icon={t.icon} label={t.label} />)}
      </div>

      {/* Content */}
      <div className="max-w-2xl">
        {tab === 'company'       && company && <CompanyTab supabase={supabase} company={company} />}
        {tab === 'locations'     && <LocationsTab supabase={supabase} companyId={companyId} />}
        {tab === 'subscription'  && <SubscriptionTab plan={subscriptionPlan} />}
        {tab === 'notifications' && <NotificationsTab supabase={supabase} userId={userId} />}
      </div>
    </div>
  )
}
