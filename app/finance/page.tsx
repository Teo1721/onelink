'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OneLinkLogo } from '@/components/onelink-logo'
import {
  BarChart3, Receipt, TrendingUp, TrendingDown, LogOut,
  Download, Loader2, ChevronDown, ChevronUp, Calendar,
  Building2, AlertTriangle, Check, FileText,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'

type Tab = 'overview' | 'invoices' | 'pnl' | 'locations'

const PLN = (v: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(v || 0)
const PCT = (v: number) => (v * 100).toFixed(1) + '%'

interface MonthlyPnl {
  month: string
  revenue: number
  costs: number
  profit: number
  margin: number
}

interface Invoice {
  id: string
  service_date: string
  supplier_name: string
  invoice_number: string | null
  total_amount: number
  invoice_type: string
  status: string
  location_name: string | null
}

interface LocationSummary {
  id: string
  name: string
  revenue30d: number
  costs30d: number
  profit30d: number
}

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  approved: { label: 'Zatwierdzona', bg: 'bg-emerald-100 text-emerald-700' },
  submitted: { label: 'Oczekuje', bg: 'bg-amber-100 text-amber-700' },
  draft: { label: 'Szkic', bg: 'bg-gray-100 text-gray-600' },
  rejected: { label: 'Odrzucona', bg: 'bg-red-100 text-red-700' },
}

export default function FinancePage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)

  // Data
  const [monthlyPnl, setMonthlyPnl] = useState<MonthlyPnl[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [locations, setLocations] = useState<LocationSummary[]>([])
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all')
  const [invoiceSortDir, setInvoiceSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, company_id, full_name')
        .eq('id', user.id)
        .maybeSingle()

      // Only accounting role (or owner) can access this page
      if (!profile || !['accounting', 'owner', 'superadmin', 'admin'].includes(profile.role)) {
        router.replace('/auth/login')
        return
      }

      setUserName(profile.full_name ?? user.email ?? 'Użytkownik')
      setCompanyId(profile.company_id)

      const { data: company } = await supabase
        .from('companies').select('name').eq('id', profile.company_id).maybeSingle()
      setCompanyName(company?.name ?? '')

      await loadAllData(profile.company_id)
      setLoading(false)
    })()
  }, [])

  async function loadAllData(cId: string) {
    const { data: locs } = await supabase.from('locations').select('id,name').eq('company_id', cId)
    const locIds = locs?.map((l: any) => l.id) ?? []

    // Fetch 6 months of sales_daily
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const since = sixMonthsAgo.toLocaleDateString('sv-SE')

    const [{ data: sales }, { data: invs }] = await Promise.all([
      locIds.length
        ? supabase.from('sales_daily').select('date,net_revenue,location_id').in('location_id', locIds).gte('date', since)
        : { data: [] },
      locIds.length
        ? supabase.from('invoices').select('id,service_date,supplier_name,invoice_number,total_amount,invoice_type,status,location_id').in('location_id', locIds).order('service_date', { ascending: false })
        : { data: [] },
    ])

    // Build monthly P&L
    const byMonth: Record<string, { revenue: number; costs: number }> = {}
    for (const s of sales ?? []) {
      const m = s.date.slice(0, 7)
      if (!byMonth[m]) byMonth[m] = { revenue: 0, costs: 0 }
      byMonth[m].revenue += s.net_revenue || 0
    }
    for (const inv of invs ?? []) {
      if (inv.status !== 'approved') continue
      const m = inv.service_date?.slice(0, 7)
      if (!m) continue
      if (!byMonth[m]) byMonth[m] = { revenue: 0, costs: 0 }
      byMonth[m].costs += inv.total_amount || 0
    }
    const pnl = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { revenue, costs }]) => ({
        month,
        revenue,
        costs,
        profit: revenue - costs,
        margin: revenue > 0 ? (revenue - costs) / revenue : 0,
      }))
    setMonthlyPnl(pnl)

    // Invoices with location name
    const locMap: Record<string, string> = {}
    for (const l of locs ?? []) locMap[l.id] = l.name
    setInvoices(
      (invs ?? []).map((inv: any) => ({
        ...inv,
        location_name: locMap[inv.location_id] ?? '—',
      }))
    )

    // 30-day location summary
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    const t30 = thirtyAgo.toLocaleDateString('sv-SE')
    const { data: sales30 } = locIds.length
      ? await supabase.from('sales_daily').select('location_id,net_revenue').in('location_id', locIds).gte('date', t30)
      : { data: [] }
    const { data: invs30 } = locIds.length
      ? await supabase.from('invoices').select('location_id,total_amount').in('location_id', locIds).eq('status', 'approved').gte('service_date', t30)
      : { data: [] }

    const revByLoc: Record<string, number> = {}
    const costByLoc: Record<string, number> = {}
    for (const s of sales30 ?? []) revByLoc[s.location_id] = (revByLoc[s.location_id] ?? 0) + (s.net_revenue || 0)
    for (const i of invs30 ?? []) costByLoc[i.location_id] = (costByLoc[i.location_id] ?? 0) + (i.total_amount || 0)

    setLocations((locs ?? []).map((l: any) => ({
      id: l.id,
      name: l.name,
      revenue30d: revByLoc[l.id] ?? 0,
      costs30d: costByLoc[l.id] ?? 0,
      profit30d: (revByLoc[l.id] ?? 0) - (costByLoc[l.id] ?? 0),
    })))
  }

  function exportCSV() {
    const rows = [
      ['Data', 'Lokalizacja', 'Dostawca', 'Numer', 'Typ', 'Kwota', 'Status'],
      ...filteredInvoices.map(inv => [
        inv.service_date, inv.location_name ?? '', inv.supplier_name,
        inv.invoice_number ?? '', inv.invoice_type,
        inv.total_amount.toFixed(2).replace('.', ','), inv.status,
      ]),
    ].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `faktury_${new Date().toLocaleDateString('sv-SE')}.csv`
    a.click()
  }

  const filteredInvoices = invoices
    .filter(inv => invoiceFilter === 'all' || inv.status === invoiceFilter)
    .sort((a, b) => invoiceSortDir === 'desc'
      ? b.service_date.localeCompare(a.service_date)
      : a.service_date.localeCompare(b.service_date)
    )

  const totalRevenue = monthlyPnl.reduce((s, m) => s + m.revenue, 0)
  const totalCosts   = monthlyPnl.reduce((s, m) => s + m.costs, 0)
  const totalProfit  = totalRevenue - totalCosts
  const avgMargin    = totalRevenue > 0 ? totalProfit / totalRevenue : 0
  const lastMonth    = monthlyPnl.at(-1)
  const prevMonth    = monthlyPnl.at(-2)
  const revTrend     = prevMonth && prevMonth.revenue > 0 ? (lastMonth!.revenue - prevMonth.revenue) / prevMonth.revenue : 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
      <Loader2 className="w-6 h-6 animate-spin text-[#9CA3AF]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-[200px] bg-white border-r border-[#E5E7EB] flex flex-col z-30">
        <div className="h-14 flex items-center px-4 border-b border-[#E5E7EB]">
          <OneLinkLogo dark={false} iconSize={20} textSize="text-[13px]" />
        </div>
        <div className="px-4 py-3 border-b border-[#E5E7EB]">
          <p className="text-[12px] font-semibold text-[#111827] truncate">{userName}</p>
          <p className="text-[10px] text-[#9CA3AF]">Ksigowość / Finanse</p>
        </div>
        <nav className="flex-1 py-2 px-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9CA3AF] px-2 pt-3 pb-1.5">Widoki</p>
          {([
            { key: 'overview',   label: 'Przegląd',   icon: BarChart3 },
            { key: 'pnl',        label: 'P&L miesięczny', icon: TrendingUp },
            { key: 'invoices',   label: 'Faktury',    icon: Receipt },
            { key: 'locations',  label: 'Lokalizacje',icon: Building2 },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`relative w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[12px] font-medium transition-colors ${
                tab === key ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#374151] hover:bg-[#F9FAFB]'
              }`}
            >
              {tab === key && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#2563EB]" />}
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>
        <div className="px-2 py-2 border-t border-[#E5E7EB]">
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
            className="w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[12px] font-medium text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Wyloguj
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-[200px] p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-black text-[#111827]">
              {tab === 'overview' ? 'Przegląd finansowy' :
               tab === 'pnl' ? 'P&L miesięczny' :
               tab === 'invoices' ? 'Faktury' : 'Lokalizacje'}
            </h1>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">{companyName} · Tylko do odczytu</p>
          </div>
          {tab === 'invoices' && (
            <button onClick={exportCSV} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* KPI strip */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Przychód 6M', value: PLN(totalRevenue), sub: null },
                { label: 'Koszty 6M',  value: PLN(totalCosts),   sub: null },
                { label: 'Zysk 6M',    value: PLN(totalProfit),  sub: PCT(avgMargin) + ' marży', positive: totalProfit >= 0 },
                { label: 'Trend przychodów', value: (revTrend >= 0 ? '+' : '') + PCT(revTrend), sub: 'vs poprzedni mies.', positive: revTrend >= 0 },
              ].map(({ label, value, sub, positive }) => (
                <div key={label} className={`rounded-2xl border p-5 ${positive === false ? 'bg-red-50 border-red-200' : positive ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[#E5E7EB]'}`}>
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-1">{label}</p>
                  <p className={`text-[22px] font-black ${positive === false ? 'text-red-600' : positive ? 'text-emerald-600' : 'text-[#111827]'}`}>{value}</p>
                  {sub && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{sub}</p>}
                </div>
              ))}
            </div>

            {/* Revenue chart */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
              <p className="text-[14px] font-bold text-[#111827] mb-4">Przychody i koszty — ostatnie 6 miesięcy</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyPnl} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => PLN(v).replace(' zł', 'k')} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(v: any) => PLN(v)} />
                  <Bar dataKey="revenue" fill="#3B82F6" name="Przychód" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costs" fill="#F87171" name="Koszty" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Profit chart */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
              <p className="text-[14px] font-bold text-[#111827] mb-4">Zysk operacyjny</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthlyPnl} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => PLN(v).replace(' zł', 'k')} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(v: any) => PLN(v)} />
                  <Area dataKey="profit" fill="url(#profitGrad)" stroke="#10B981" strokeWidth={2} name="Zysk" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── P&L TABLE ── */}
        {tab === 'pnl' && (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="text-left py-3 px-5 text-[#9CA3AF] font-semibold">Miesiąc</th>
                  <th className="text-right py-3 px-5 text-[#9CA3AF] font-semibold">Przychód</th>
                  <th className="text-right py-3 px-5 text-[#9CA3AF] font-semibold">Koszty</th>
                  <th className="text-right py-3 px-5 text-[#9CA3AF] font-semibold">Zysk</th>
                  <th className="text-right py-3 px-5 text-[#9CA3AF] font-semibold">Marża</th>
                </tr>
              </thead>
              <tbody>
                {[...monthlyPnl].reverse().map(row => (
                  <tr key={row.month} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                    <td className="py-3 px-5 font-semibold text-[#111827]">{row.month}</td>
                    <td className="py-3 px-5 text-right text-[#111827]">{PLN(row.revenue)}</td>
                    <td className="py-3 px-5 text-right text-red-600">{PLN(row.costs)}</td>
                    <td className={`py-3 px-5 text-right font-bold ${row.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{PLN(row.profit)}</td>
                    <td className={`py-3 px-5 text-right font-semibold ${row.margin >= 0.1 ? 'text-emerald-600' : row.margin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{PCT(row.margin)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#111827]">
                  <td className="py-3 px-5 font-black text-[#111827]">Łącznie</td>
                  <td className="py-3 px-5 text-right font-black text-[#111827]">{PLN(totalRevenue)}</td>
                  <td className="py-3 px-5 text-right font-black text-red-600">{PLN(totalCosts)}</td>
                  <td className={`py-3 px-5 text-right font-black ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{PLN(totalProfit)}</td>
                  <td className={`py-3 px-5 text-right font-black ${avgMargin >= 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>{PCT(avgMargin)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── INVOICES ── */}
        {tab === 'invoices' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex bg-white rounded-xl border border-[#E5E7EB] p-0.5">
                {['all', 'approved', 'submitted', 'draft'].map(s => (
                  <button key={s} onClick={() => setInvoiceFilter(s)}
                    className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${
                      invoiceFilter === s ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:text-[#111827]'
                    }`}
                  >
                    {s === 'all' ? 'Wszystkie' : STATUS_CFG[s]?.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setInvoiceSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[#E5E7EB] bg-white text-[11px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB]"
              >
                {invoiceSortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                Data
              </button>
              <span className="text-[12px] text-[#9CA3AF]">{filteredInvoices.length} faktur · łącznie {PLN(filteredInvoices.reduce((s, i) => s + i.total_amount, 0))}</span>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="text-left py-3 px-4 text-[#9CA3AF] font-semibold">Data</th>
                    <th className="text-left py-3 px-4 text-[#9CA3AF] font-semibold">Lokalizacja</th>
                    <th className="text-left py-3 px-4 text-[#9CA3AF] font-semibold">Dostawca</th>
                    <th className="text-left py-3 px-4 text-[#9CA3AF] font-semibold">Numer</th>
                    <th className="text-left py-3 px-4 text-[#9CA3AF] font-semibold">Typ</th>
                    <th className="text-right py-3 px-4 text-[#9CA3AF] font-semibold">Kwota</th>
                    <th className="text-center py-3 px-4 text-[#9CA3AF] font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                      <td className="py-2.5 px-4 text-[#6B7280]">{inv.service_date}</td>
                      <td className="py-2.5 px-4 text-[#6B7280] truncate max-w-[120px]">{inv.location_name}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#111827]">{inv.supplier_name}</td>
                      <td className="py-2.5 px-4 text-[#9CA3AF] font-mono text-[11px]">{inv.invoice_number ?? '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${inv.invoice_type === 'COS' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {inv.invoice_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#111827]">{PLN(inv.total_amount)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CFG[inv.status]?.bg ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_CFG[inv.status]?.label ?? inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-[#9CA3AF] text-[13px]">Brak faktur</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LOCATIONS ── */}
        {tab === 'locations' && (
          <div className="space-y-4">
            {locations.map(loc => (
              <div key={loc.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-[15px] font-bold text-[#111827]">{loc.name}</p>
                  </div>
                  <span className={`text-[13px] font-bold ${loc.profit30d >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {loc.profit30d >= 0 ? '+' : ''}{PLN(loc.profit30d)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Przychód 30d</p>
                    <p className="text-[18px] font-black text-[#111827]">{PLN(loc.revenue30d)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Koszty 30d</p>
                    <p className="text-[18px] font-black text-red-600">{PLN(loc.costs30d)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Marża</p>
                    <p className={`text-[18px] font-black ${loc.revenue30d > 0 && loc.profit30d / loc.revenue30d >= 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {loc.revenue30d > 0 ? PCT(loc.profit30d / loc.revenue30d) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {locations.length === 0 && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center text-[13px] text-[#9CA3AF]">Brak lokalizacji</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
