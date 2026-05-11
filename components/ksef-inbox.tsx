'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, Download, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronRight, Building2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

type KsefInvoice = {
  id: string
  ksef_reference_number: string
  invoice_number: string
  supplier_name: string
  supplier_nip: string
  issue_date: string
  sale_date: string
  total_net: number
  total_gross: number
  total_vat: number
  currency: string
  status: 'pending_review' | 'imported' | 'ignored'
  imported_at?: string
  items_json: {
    name: string; quantity: number; unit: string
    netPrice: number; vatRate: number; netValue: number; grossValue: number
  }[]
}

type Props = {
  companyId: string
  locationId: string
  locationName?: string
}

const fmt2 = (n: number) => n.toFixed(2)

export function KsefInbox({ companyId, locationId, locationName }: Props) {
  const supabase = createClient()
  const [invoices, setInvoices]     = useState<KsefInvoice[]>([])
  const [loading, setLoading]       = useState(true)
  const [syncing, setSyncing]       = useState(false)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [importing, setImporting]   = useState<string | null>(null)
  const [invoiceTypes, setInvoiceTypes] = useState<Record<string, 'COS' | 'SEMIS'>>({})
  const [syncResult, setSyncResult] = useState<{ imported: number; errors: number; errorDetails?: string[] } | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const { data, error: loadErr } = await supabase
      .from('ksef_invoices')
      .select('*')
      .eq('company_id', companyId)
      .order('issue_date', { ascending: false })
      .limit(100)
    if (loadErr) {
      setError(`Błąd ładowania faktur: ${loadErr.message}`)
      setLoading(false)
      return
    }
    setInvoices((data || []) as KsefInvoice[])
    // default type = COS for all
    const defaults: Record<string, 'COS' | 'SEMIS'> = {}
    for (const inv of data || []) defaults[inv.id] = 'COS'
    setInvoiceTypes(prev => ({ ...defaults, ...prev }))
    setLoading(false)
  }

  useEffect(() => { load() }, [companyId])

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null); setError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 270_000) // 4.5 min client timeout
    try {
      const res  = await fetch('/api/ksef/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
        signal: controller.signal,
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Sync failed'); return }
      setSyncResult({ imported: json.imported, errors: json.errors, errorDetails: json.errorDetails })
      await load()
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        setError('Synchronizacja przekroczyła limit czasu (90s). Spróbuj ponownie.')
      } else {
        setError((e as Error).message)
      }
    } finally {
      clearTimeout(timeout)
      setSyncing(false)
    }
  }

  const handleImport = async (inv: KsefInvoice) => {
    setImporting(inv.id); setError(null)
    try {
      const res  = await fetch('/api/ksef/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ksefInvoiceId: inv.id,
          locationId,
          invoiceType: invoiceTypes[inv.id] || 'COS',
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Import failed'); return }
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setImporting(null)
    }
  }

  const handleIgnore = async (id: string) => {
    await supabase.from('ksef_invoices').update({ status: 'ignored' }).eq('id', id)
    await load()
  }

  const pending  = invoices.filter(i => i.status === 'pending_review')
  const imported = invoices.filter(i => i.status === 'imported')
  const ignored  = invoices.filter(i => i.status === 'ignored')

  return (
    <div className="space-y-4">

      {/* Header + sync button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-600" /> KSeF — faktury elektroniczne
          </h3>
          <p className="text-[12px] text-slate-500 mt-0.5">Faktury pobrane automatycznie z Krajowego Systemu e-Faktur</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-[12px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Synchronizuję…' : 'Synchronizuj KSeF'}
        </Button>
      </div>

      {/* Active location banner */}
      <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
        <Building2 className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-[13px] text-blue-800">
          Importowanie do: <span className="font-bold">{locationName || locationId}</span>
        </p>
        <span className="ml-auto text-[11px] text-blue-400">Zmień lokalizację w górnym menu aby importować do innego lokalu</span>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div className="space-y-2">
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] ${syncResult.errors > 0 && syncResult.imported === 0 ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
            {syncResult.errors > 0 && syncResult.imported === 0
              ? <AlertCircle className="w-4 h-4 shrink-0" />
              : <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
            Pobrano <b className="mx-1">{syncResult.imported}</b> nowych faktur z KSeF.
            {syncResult.errors > 0 && <span className="font-semibold ml-1">({syncResult.errors} {syncResult.errors === 1 ? 'błąd' : 'błędów'})</span>}
          </div>
          {syncResult.errorDetails && syncResult.errorDetails.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 space-y-1">
              <p className="text-[11px] font-bold text-red-700 uppercase tracking-wide">Szczegóły błędu:</p>
              {syncResult.errorDetails.map((e, i) => (
                <p key={i} className="text-[12px] text-red-700">{e}</p>
              ))}
              {syncResult.errorDetails.some(e => e.includes('401') || e.includes('credentials') || e.includes('Unauthorized')) && (
                <p className="text-[11px] text-red-500 mt-1">Sprawdź czy NIP i Token KSeF są poprawnie ustawione w Admin → Ustawienia → Integracje.</p>
              )}
              {syncResult.errorDetails.some(e => e.includes('429') || e.includes('limit')) && (
                <p className="text-[11px] text-amber-600 mt-1">Limit zapytań KSeF wyczerpany. Poczekaj i spróbuj ponownie.</p>
              )}
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="space-y-1 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" /><span className="font-semibold">{error}</span>
          </div>
          {error.includes('credentials') && (
            <p className="text-[11px] text-red-500 pl-6">Przejdź do Admin → Ustawienia → Integracje i wprowadź NIP i Token KSeF.</p>
          )}
        </div>
      )}

      {/* Pending review */}
      {loading ? (
        <div className="text-[13px] text-slate-400 py-6 text-center">Ładowanie…</div>
      ) : pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
          <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-[13px] text-slate-400">Brak nowych faktur do przeglądu</p>
          <p className="text-[11px] text-slate-300 mt-1">Kliknij "Synchronizuj KSeF" aby pobrać najnowsze</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[12px] font-bold text-amber-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />{pending.length} {pending.length === 1 ? 'faktura' : 'faktury'} do przeglądu
          </p>
          {pending.map(inv => (
            <div key={inv.id} className="border border-amber-200 bg-amber-50/40 rounded-xl overflow-hidden">
              {/* Row header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {expanded === inv.id
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 truncate">{inv.supplier_name}</p>
                  <p className="text-[11px] text-slate-500">
                    {inv.invoice_number} · {inv.sale_date} · NIP: {inv.supplier_nip}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold text-slate-800">{fmt2(inv.total_gross)} {inv.currency}</p>
                  <p className="text-[10px] text-slate-400">netto: {fmt2(inv.total_net)}</p>
                </div>

                {/* Type selector */}
                <select
                  value={invoiceTypes[inv.id] || 'COS'}
                  onChange={e => setInvoiceTypes(p => ({ ...p, [inv.id]: e.target.value as 'COS' | 'SEMIS' }))}
                  className="h-8 rounded-lg border border-slate-300 bg-white text-[12px] px-2 font-semibold text-slate-700"
                >
                  <option value="COS">📦 COS</option>
                  <option value="SEMIS">💼 SEMIS</option>
                </select>

                <Button
                  size="sm"
                  onClick={() => handleImport(inv)}
                  disabled={importing === inv.id}
                  className="text-[12px] bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  {importing === inv.id ? 'Importuję…' : 'Importuj'}
                </Button>
                <button
                  onClick={() => handleIgnore(inv.id)}
                  className="text-[11px] text-slate-400 hover:text-red-500 shrink-0 transition-colors"
                >
                  Ignoruj
                </button>
              </div>

              {/* Expanded items */}
              {expanded === inv.id && (
                <div className="border-t border-amber-200 px-4 pb-3 pt-2 bg-white/70">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Pozycje ({inv.items_json?.length || 0})</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {(inv.items_json || []).map((it, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                        <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[9px] flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="flex-1 truncate">{it.name}</span>
                        <span className="text-slate-400">{it.quantity} {it.unit}</span>
                        <span className="font-semibold text-slate-700 tabular-nums">{fmt2(it.netValue)} zł</span>
                      </div>
                    ))}
                    {(!inv.items_json || inv.items_json.length === 0) && (
                      <p className="text-[11px] text-slate-400">Brak pozycji w XML</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Imported section */}
      {imported.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[12px] font-semibold text-slate-500 flex items-center gap-1.5 select-none">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            {imported.length} zaimportowanych faktur
            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-2 space-y-1.5">
            {imported.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-green-50 border border-green-100 text-[12px]">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-700">{inv.supplier_name}</span>
                  <span className="text-slate-400 ml-2">{inv.invoice_number} · {inv.sale_date}</span>
                </div>
                <span className="font-semibold text-green-700">{fmt2(inv.total_gross)} {inv.currency}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
