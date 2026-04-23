'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const PLN = (v: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 }).format(v || 0)
const PCT = (v: number) => (v * 100).toFixed(1) + '%'

interface ReportData {
  companyName: string
  locationName: string
  date: string
  netRevenue: number
  grossRevenue: number
  discounts: number
  laborCost: number
  laborPct: number
  cosCost: number
  cosPct: number
  opex: number
  operatingProfit: number
  netMargin: number
  pendingInvoices: number
  invoices: { supplier_name: string; invoice_type: string; total_amount: number; invoice_number: string }[]
}

export default function DailyReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
      <DailyReportPDF />
    </Suspense>
  )
}

function DailyReportPDF() {
  const params = useSearchParams()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const date = params.get('date') ?? new Date().toLocaleDateString('sv-SE')
  const locationId = params.get('locationId')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: profile } = await supabase
        .from('user_profiles').select('company_id').eq('id', user.id).maybeSingle()
      if (!profile?.company_id) { setError('Brak profilu'); return }

      const companyId = profile.company_id

      const [{ data: company }, { data: location }, { data: salesRows }, { data: invoices }] = await Promise.all([
        supabase.from('companies').select('name').eq('id', companyId).maybeSingle(),
        locationId ? supabase.from('locations').select('name').eq('id', locationId).maybeSingle() : { data: null },
        supabase.from('sales_daily').select('*')
          .eq('date', date)
          .then(q => locationId ? supabase.from('sales_daily').select('*').eq('date', date).eq('location_id', locationId) : q),
        supabase.from('invoices').select('supplier_name,invoice_type,total_amount,invoice_number')
          .eq('service_date', date).eq('company_id', companyId).in('status', ['approved', 'submitted']),
      ])

      let salesQ = supabase.from('sales_daily').select('*').eq('date', date)
      if (locationId) salesQ = salesQ.eq('location_id', locationId)
      else {
        const { data: locs } = await supabase.from('locations').select('id').eq('company_id', companyId)
        if (locs?.length) salesQ = salesQ.in('location_id', locs.map((l: any) => l.id))
      }
      const { data: sales } = await salesQ

      const netRevenue  = (sales ?? []).reduce((s: number, r: any) => s + (r.net_revenue || 0), 0)
      const grossRevenue = (sales ?? []).reduce((s: number, r: any) => s + (r.gross_revenue || 0), 0)
      const discounts   = grossRevenue - netRevenue
      const laborHours  = (sales ?? []).reduce((s: number, r: any) => s + (r.total_labor_hours || 0), 0)
      const laborRate   = (sales ?? []).reduce((s: number, r: any) => s + (r.avg_hourly_rate || 0), 0) / Math.max((sales?.length ?? 1), 1)
      const laborCost   = laborHours * laborRate
      const cosCost     = (invoices ?? []).filter((i: any) => i.invoice_type === 'COS').reduce((s: number, i: any) => s + (i.total_amount || 0), 0)
      const opex        = (invoices ?? []).filter((i: any) => i.invoice_type === 'OPEX').reduce((s: number, i: any) => s + (i.total_amount || 0), 0)
      const operatingProfit = netRevenue - laborCost - cosCost - opex
      const pending = (invoices ?? []).filter((i: any) => i.status === 'submitted').length

      setData({
        companyName: company?.name ?? '—',
        locationName: location?.name ?? 'Wszystkie lokalizacje',
        date,
        netRevenue, grossRevenue, discounts,
        laborCost, laborPct: netRevenue > 0 ? laborCost / netRevenue : 0,
        cosCost, cosPct: netRevenue > 0 ? cosCost / netRevenue : 0,
        opex, operatingProfit,
        netMargin: netRevenue > 0 ? operatingProfit / netRevenue : 0,
        pendingInvoices: pending,
        invoices: invoices ?? [],
      })
    })()
  }, [])

  useEffect(() => {
    if (data) setTimeout(() => window.print(), 600)
  }, [data])

  if (error) return <div className="p-8 text-red-600">{error}</div>

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  const formattedDate = new Date(data.date).toLocaleDateString('pl-PL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; margin: 0; }
      `}</style>

      <div className="max-w-[780px] mx-auto px-8 py-8 text-[#111827]">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-[#111827]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-1">Raport dzienny P&L</div>
            <h1 className="text-[28px] font-black mb-1">{data.companyName}</h1>
            <p className="text-[14px] text-[#6B7280]">{data.locationName}</p>
            <p className="text-[14px] text-[#374151] capitalize mt-1">{formattedDate}</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-1">Zysk operacyjny</div>
            <div className={`text-[32px] font-black ${data.operatingProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {PLN(data.operatingProfit)}
            </div>
            <div className={`text-[14px] font-bold ${data.netMargin >= 0.1 ? 'text-emerald-600' : data.netMargin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
              marża {PCT(data.netMargin)}
            </div>
          </div>
        </div>

        {/* Revenue section */}
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#6B7280] mb-3">Przychody</h2>
        <table className="w-full mb-6 text-[13px]">
          <tbody>
            <Row label="Przychód brutto" value={data.grossRevenue} />
            <Row label="Rabaty / vouchery" value={-data.discounts} neg />
            <RowBold label="Przychód netto" value={data.netRevenue} />
          </tbody>
        </table>

        {/* Costs section */}
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#6B7280] mb-3">Koszty</h2>
        <table className="w-full mb-6 text-[13px]">
          <tbody>
            <Row label={`Koszt pracy (${PCT(data.laborPct)})`} value={data.laborCost} neg />
            <Row label={`Food cost / COS (${PCT(data.cosPct)})`} value={data.cosCost} neg />
            <Row label="OPEX" value={data.opex} neg />
            <RowBold label="Łączne koszty" value={data.laborCost + data.cosCost + data.opex} neg />
          </tbody>
        </table>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8 p-5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
          <div>
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Przychód netto</p>
            <p className="text-[18px] font-black">{PLN(data.netRevenue)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Łączne koszty</p>
            <p className="text-[18px] font-black text-red-600">{PLN(data.laborCost + data.cosCost + data.opex)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Zysk operacyjny</p>
            <p className={`text-[18px] font-black ${data.operatingProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{PLN(data.operatingProfit)}</p>
          </div>
        </div>

        {/* Invoices */}
        {data.invoices.length > 0 && (
          <>
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#6B7280] mb-3">Faktury ({data.invoices.length})</h2>
            <table className="w-full text-[12px] mb-8">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  <th className="text-left pb-2 text-[#9CA3AF] font-semibold">Dostawca</th>
                  <th className="text-left pb-2 text-[#9CA3AF] font-semibold">Numer</th>
                  <th className="text-left pb-2 text-[#9CA3AF] font-semibold">Typ</th>
                  <th className="text-right pb-2 text-[#9CA3AF] font-semibold">Kwota</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv, i) => (
                  <tr key={i} className="border-b border-[#F3F4F6]">
                    <td className="py-1.5">{inv.supplier_name}</td>
                    <td className="py-1.5 text-[#6B7280]">{inv.invoice_number || '—'}</td>
                    <td className="py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${inv.invoice_type === 'COS' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{inv.invoice_type}</span></td>
                    <td className="py-1.5 text-right font-semibold">{PLN(inv.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-[10px] text-[#9CA3AF]">
          <span>OneLink — System zarządzania restauracją</span>
          <span>Wygenerowano: {new Date().toLocaleString('pl-PL')}</span>
        </div>
      </div>

      {/* Print button — hidden on print */}
      <div className="no-print fixed bottom-6 right-6">
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 rounded-xl bg-[#111827] text-white text-[13px] font-bold shadow-lg hover:bg-[#1F2937] transition-colors"
        >
          Drukuj / Zapisz PDF
        </button>
      </div>
    </>
  )
}

function Row({ label, value, neg }: { label: string; value: number; neg?: boolean }) {
  return (
    <tr className="border-b border-[#F3F4F6]">
      <td className="py-1.5 text-[#374151]">{label}</td>
      <td className={`py-1.5 text-right font-semibold ${neg && value > 0 ? 'text-red-600' : ''}`}>
        {neg && value > 0 ? `(${PLN(value)})` : PLN(value)}
      </td>
    </tr>
  )
}

function RowBold({ label, value, neg }: { label: string; value: number; neg?: boolean }) {
  return (
    <tr className="border-t-2 border-[#111827]">
      <td className="py-2 font-bold text-[#111827]">{label}</td>
      <td className={`py-2 text-right font-black ${neg ? 'text-red-700' : 'text-[#111827]'}`}>{PLN(value)}</td>
    </tr>
  )
}
