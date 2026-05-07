'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Check, Sparkles, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'

export type AiInvoiceItem = {
  name: string
  quantity: string
  unit: string
  unitPrice: string
  vatRate: string
  category: string
}

export type AiInvoiceResult = {
  supplier: string
  invoiceNumber: string
  saleDate: string
  receiptDate: string
  invoiceType: 'COS' | 'SEMIS'
  items: AiInvoiceItem[]
}

const VAT_RATES = ['0', '0.05', '0.08', '0.23']
const UNITS = ['kg', 'szt', 'l', 'opak', 'but', 'kart', 'g', 'ml', 'porcja']

const COS_CATEGORIES = [
  { value: 'mieso', label: 'Mięso' },
  { value: 'ryby', label: 'Ryby' },
  { value: 'nabiał', label: 'Nabiał' },
  { value: 'warzywa_owoce', label: 'Warzywa/Owoce' },
  { value: 'suche', label: 'Produkty suche' },
  { value: 'napoje', label: 'Napoje' },
  { value: 'kawa', label: 'Kawa/Herbata' },
  { value: 'opakowania', label: 'Opakowania' },
  { value: 'chemia', label: 'Chemia' },
  { value: 'inne_cos', label: 'Inne (COS)' },
]
const SEMIS_CATEGORIES = [
  { value: 'czynsz', label: 'Czynsz' },
  { value: 'media', label: 'Media' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'serwis_naprawy', label: 'Serwis/Naprawy' },
  { value: 'ubezpieczenia', label: 'Ubezpieczenia' },
  { value: 'it_software', label: 'IT/Software' },
  { value: 'transport', label: 'Transport' },
  { value: 'czystosc_higiena', label: 'Czystość/Higiena' },
  { value: 'administracja', label: 'Administracja' },
  { value: 'inne_semis', label: 'Inne (SEMIS)' },
]

type Props = {
  data: AiInvoiceResult
  onApply: (data: AiInvoiceResult) => void
  onClose: () => void
}

export function InvoiceAiPreview({ data, onApply, onClose }: Props) {
  const [form, setForm] = useState<AiInvoiceResult>(JSON.parse(JSON.stringify(data)))

  const setHeader = (k: keyof Omit<AiInvoiceResult, 'items'>, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const setItem = (i: number, k: keyof AiInvoiceItem, v: string) =>
    setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items } })

  const removeItem = (i: number) =>
    setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const addItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { name: '', quantity: '1', unit: 'szt', unitPrice: '', vatRate: form.invoiceType === 'COS' ? '0.08' : '0.23', category: '' }] }))

  const cats = form.invoiceType === 'COS' ? COS_CATEGORIES : SEMIS_CATEGORIES

  const totalNet = form.items.reduce((s, it) => s + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0)
  const totalGross = form.items.reduce((s, it) => {
    const net = (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)
    return s + net * (1 + (Number(it.vatRate) || 0))
  }, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-blue-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-bold text-slate-800">Podgląd odczytu AI</p>
                <span className="px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold tracking-wide uppercase">Beta</span>
              </div>
              <p className="text-[11px] text-slate-500">Sprawdź dane, popraw jeśli trzeba, a potem kliknij Wstaw</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/70 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI accuracy warning */}
        <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-amber-800 leading-snug">
            <span className="font-bold">Odczyt AI może nie być w 100% dokładny.</span> Sprawdź wszystkie pozycje, ilości i ceny przed wstawieniem do formularza. W razie błędu popraw ręcznie.
          </p>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Invoice type toggle */}
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-slate-600">Typ faktury:</span>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-[12px] font-semibold">
              <button
                onClick={() => setHeader('invoiceType', 'COS')}
                className={`px-4 py-1.5 transition-colors ${form.invoiceType === 'COS' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                📦 COS (magazynowa)
              </button>
              <button
                onClick={() => setHeader('invoiceType', 'SEMIS')}
                className={`px-4 py-1.5 transition-colors ${form.invoiceType === 'SEMIS' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                💼 SEMIS (kosztowa)
              </button>
            </div>
          </div>

          {/* Header fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">Dostawca</label>
              <Input value={form.supplier} onChange={e => setHeader('supplier', e.target.value)} className="h-9 text-sm" placeholder="Nazwa dostawcy…" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">Numer faktury</label>
              <Input value={form.invoiceNumber} onChange={e => setHeader('invoiceNumber', e.target.value)} className="h-9 text-sm" placeholder="FV/2025/001" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">Data sprzedaży</label>
              <Input type="date" value={form.saleDate} onChange={e => setHeader('saleDate', e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">Data wpływu</label>
              <Input type="date" value={form.receiptDate} onChange={e => setHeader('receiptDate', e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-bold text-slate-700">{form.items.length} pozycji odczytano</p>
              <button onClick={addItem}
                className="flex items-center gap-1 text-[12px] text-blue-600 font-semibold hover:underline">
                <Plus className="w-3.5 h-3.5" />Dodaj wiersz
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                <div className="col-span-3">Nazwa</div>
                <div className="col-span-1 text-right">Ilość</div>
                <div className="col-span-1">Jedn.</div>
                <div className="col-span-2 text-right">Cena netto</div>
                <div className="col-span-1">VAT</div>
                <div className="col-span-3">Kategoria</div>
                <div className="col-span-1" />
              </div>

              {/* Table rows */}
              <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
                {form.items.length === 0 && (
                  <div className="flex items-center gap-2 px-4 py-6 text-slate-400 text-[13px]">
                    <AlertCircle className="w-4 h-4" />Brak pozycji — dodaj ręcznie
                  </div>
                )}
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-slate-50/60">
                    <div className="col-span-3">
                      <Input value={item.name} onChange={e => setItem(i, 'name', e.target.value)}
                        className="h-8 text-[12px]" placeholder="Nazwa…" />
                    </div>
                    <div className="col-span-1">
                      <Input type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)}
                        className="h-8 text-[12px] text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div className="col-span-1">
                      <select value={item.unit} onChange={e => setItem(i, 'unit', e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-background px-1 text-[11px]">
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)}
                        className="h-8 text-[12px] text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00" />
                    </div>
                    <div className="col-span-1">
                      <select value={item.vatRate} onChange={e => setItem(i, 'vatRate', e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-background px-1 text-[11px]">
                        {VAT_RATES.map(v => <option key={v} value={v}>{Math.round(Number(v) * 100)}%</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <select value={item.category} onChange={e => setItem(i, 'category', e.target.value)}
                        className={`h-8 w-full rounded-md border bg-background px-1 text-[11px] ${item.name && !item.category ? 'border-red-300' : 'border-input'}`}>
                        <option value="">– wybierz –</option>
                        {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => removeItem(i)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals footer */}
              {form.items.length > 0 && (
                <div className="flex items-center justify-end gap-6 px-4 py-2.5 bg-slate-50 border-t border-slate-200">
                  <span className="text-[12px] text-slate-500">Netto: <b className="text-slate-700">{totalNet.toFixed(2)} zł</b></span>
                  <span className="text-[12px] text-slate-500">Brutto: <b className="text-slate-800 text-[13px]">{totalGross.toFixed(2)} zł</b></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <button onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-white transition-colors">
            Anuluj
          </button>
          <button
            onClick={() => onApply(form)}
            disabled={form.items.length === 0}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-200">
            <Check className="w-4 h-4" />
            Wstaw {form.items.length} pozycji do formularza
          </button>
        </div>
      </div>
    </div>
  )
}
