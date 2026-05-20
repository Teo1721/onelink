'use client'

import { useEffect, useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  locationId: string
  locationName: string
  companyId: string
  supabase: SupabaseClient
}

type OrderStatus = 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled'

type OrderItem = {
  id: string
  order_id: string
  ingredient_name: string
  quantity: number
  unit: string
  unit_price: number | null
  note: string | null
}

type PurchaseOrder = {
  id: string
  location_id: string
  company_id: string
  supplier_name: string
  order_date: string
  expected_delivery: string | null
  status: OrderStatus
  notes: string | null
  received_at: string | null
  created_by: string | null
  created_at: string
  purchase_order_items: OrderItem[]
}

type LineItemDraft = {
  ingredient_name: string
  quantity: string
  unit: 'kg' | 'szt' | 'l' | 'op'
  unit_price: string
  note: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UNITS = ['kg', 'szt', 'l', 'op'] as const

const EMPTY_LINE: LineItemDraft = {
  ingredient_name: '',
  quantity: '',
  unit: 'kg',
  unit_price: '',
  note: '',
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Szkic',
  sent: 'Wysłane',
  partially_received: 'Częściowe',
  received: 'Dostarczone',
  cancelled: 'Anulowane',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  partially_received: 'bg-amber-100 text-amber-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-50 text-red-500',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function orderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    if (item.unit_price == null) return sum
    return sum + Number(item.quantity) * Number(item.unit_price)
  }, 0)
}

function fmt(n: number): string {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ─── Sub-component: Order Card ────────────────────────────────────────────────

function OrderCard({
  order,
  onSend,
  onReceive,
  onCancel,
  actionLoading,
}: {
  order: PurchaseOrder
  onSend: (id: string) => void
  onReceive: (id: string) => void
  onCancel: (id: string) => void
  actionLoading: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const total = orderTotal(order.purchase_order_items)
  const isBusy = actionLoading === order.id

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#111827] truncate">{order.supplier_name}</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">{fmtDate(order.order_date)}</p>
        </div>
        <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 text-[11px] text-[#6B7280]">
        {order.expected_delivery && (
          <span>Dostawa: <span className="font-medium text-[#374151]">{fmtDate(order.expected_delivery)}</span></span>
        )}
        <span>Pozycje: <span className="font-medium text-[#374151]">{order.purchase_order_items.length}</span></span>
        {total > 0 && (
          <span>Wartość: <span className="font-medium text-[#374151]">{fmt(total)} zł</span></span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {order.status === 'draft' && (
          <button
            disabled={isBusy}
            onClick={() => onSend(order.id)}
            className="h-8 px-3 text-[12px] font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Wyślij
          </button>
        )}
        {(order.status === 'draft' || order.status === 'sent' || order.status === 'partially_received') && (
          <button
            disabled={isBusy}
            onClick={() => onReceive(order.id)}
            className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 disabled:opacity-50"
          >
            {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Oznacz jako dostarczone
          </button>
        )}
        <button
          disabled={isBusy}
          onClick={() => onCancel(order.id)}
          className="h-8 px-3 text-[12px] font-medium rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] flex items-center gap-1.5 disabled:opacity-50"
        >
          Anuluj
        </button>
        <button
          onClick={() => setExpanded(e => !e)}
          className="ml-auto h-8 px-2 text-[#6B7280] hover:text-[#374151] flex items-center gap-1 text-[11px]"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? 'Zwiń' : 'Rozwiń'}
        </button>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-[#E5E7EB] pt-3 space-y-1.5">
          {order.purchase_order_items.length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF]">Brak pozycji.</p>
          ) : (
            order.purchase_order_items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-[12px] text-[#374151] bg-[#F9FAFB] rounded-lg px-3 py-1.5">
                <span className="font-medium truncate">{item.ingredient_name}</span>
                <span className="shrink-0 text-[#6B7280]">
                  {item.quantity} {item.unit}
                  {item.unit_price != null && (
                    <span className="ml-2 text-[#374151]">× {fmt(item.unit_price)} zł</span>
                  )}
                </span>
                {item.note && <span className="shrink-0 text-[#9CA3AF] italic">{item.note}</span>}
              </div>
            ))
          )}
          {order.notes && (
            <p className="text-[11px] text-[#6B7280] pt-1 italic">Uwagi: {order.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-component: Done Order Card (simple) ──────────────────────────────────

function DoneOrderCard({ order }: { order: PurchaseOrder }) {
  const [expanded, setExpanded] = useState(false)
  const total = orderTotal(order.purchase_order_items)

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#111827] truncate">{order.supplier_name}</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">{fmtDate(order.order_date)}</p>
        </div>
        <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-[#6B7280]">
        <span>Pozycje: <span className="font-medium text-[#374151]">{order.purchase_order_items.length}</span></span>
        {total > 0 && (
          <span>Wartość: <span className="font-medium text-[#374151]">{fmt(total)} zł</span></span>
        )}
        {order.received_at && (
          <span>Odebrano: <span className="font-medium text-[#374151]">{fmtDate(order.received_at.split('T')[0])}</span></span>
        )}
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 text-[11px] text-[#6B7280] hover:text-[#374151]"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Ukryj pozycje' : 'Pokaż pozycje'}
      </button>

      {expanded && (
        <div className="border-t border-[#E5E7EB] pt-2 space-y-1">
          {order.purchase_order_items.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-[12px] text-[#374151] bg-[#F9FAFB] rounded-lg px-3 py-1.5">
              <span className="font-medium truncate">{item.ingredient_name}</span>
              <span className="shrink-0 text-[#6B7280]">
                {item.quantity} {item.unit}
                {item.unit_price != null && (
                  <span className="ml-2 text-[#374151]">× {fmt(item.unit_price)} zł</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PurchaseOrders({ locationId, locationName, companyId, supabase }: Props) {
  type Tab = 'orders' | 'new' | 'done'

  const [tab, setTab] = useState<Tab>('orders')
  const [activeOrders, setActiveOrders] = useState<PurchaseOrder[]>([])
  const [doneOrders, setDoneOrders] = useState<PurchaseOrder[]>([])
  const [loadingActive, setLoadingActive] = useState(false)
  const [loadingDone, setLoadingDone] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // ── New order form state ────────────────────────────────────────
  const [supplierName, setSupplierName] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([{ ...EMPTY_LINE }])

  // ── Fetch active orders ─────────────────────────────────────────
  const fetchActive = useCallback(async () => {
    setLoadingActive(true)
    const { data } = await supabase
      .from('purchase_orders')
      .select('*, purchase_order_items(*)')
      .eq('location_id', locationId)
      .in('status', ['draft', 'sent', 'partially_received'])
      .order('created_at', { ascending: false })
    setActiveOrders((data as PurchaseOrder[]) ?? [])
    setLoadingActive(false)
  }, [locationId, supabase])

  // ── Fetch done orders ───────────────────────────────────────────
  const fetchDone = useCallback(async () => {
    setLoadingDone(true)
    const { data } = await supabase
      .from('purchase_orders')
      .select('*, purchase_order_items(*)')
      .eq('location_id', locationId)
      .in('status', ['received', 'cancelled'])
      .order('created_at', { ascending: false })
    setDoneOrders((data as PurchaseOrder[]) ?? [])
    setLoadingDone(false)
  }, [locationId, supabase])

  useEffect(() => {
    if (tab === 'orders') fetchActive()
    else if (tab === 'done') fetchDone()
  }, [tab, fetchActive, fetchDone])

  // ── Status actions ──────────────────────────────────────────────
  const updateStatus = async (orderId: string, status: OrderStatus, extra?: Record<string, unknown>) => {
    setActionLoading(orderId)
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status, ...extra })
      .eq('id', orderId)
    if (error) alert(`Błąd: ${error.message}`)
    else await fetchActive()
    setActionLoading(null)
  }

  const handleSend = (id: string) => updateStatus(id, 'sent')
  const handleReceive = (id: string) => updateStatus(id, 'received', { received_at: new Date().toISOString() })
  const handleCancel = (id: string) => {
    if (!window.confirm('Anulować to zamówienie?')) return
    updateStatus(id, 'cancelled')
  }

  // ── Line item helpers ───────────────────────────────────────────
  const addLine = () => setLineItems(prev => [...prev, { ...EMPTY_LINE }])

  const removeLine = (idx: number) =>
    setLineItems(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx))

  const updateLine = <K extends keyof LineItemDraft>(idx: number, key: K, value: LineItemDraft[K]) =>
    setLineItems(prev => prev.map((row, i) => i === idx ? { ...row, [key]: value } : row))

  // ── Create order ────────────────────────────────────────────────
  const createOrder = async () => {
    setFormError('')
    if (!supplierName.trim()) { setFormError('Podaj nazwę dostawcy.'); return }
    const validItems = lineItems.filter(l => l.ingredient_name.trim())
    if (validItems.length === 0) { setFormError('Dodaj co najmniej jedną pozycję z nazwą.'); return }

    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    const { data: orderData, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        location_id: locationId,
        company_id: companyId,
        supplier_name: supplierName.trim(),
        order_date: today,
        expected_delivery: expectedDelivery || null,
        status: 'draft',
        notes: notes.trim() || null,
      })
      .select()
      .single()

    if (orderError || !orderData) {
      setFormError(`Błąd zapisu: ${orderError?.message ?? 'Nieznany błąd'}`)
      setSaving(false)
      return
    }

    const itemsPayload = validItems.map(item => ({
      order_id: orderData.id,
      ingredient_name: item.ingredient_name.trim(),
      quantity: Number(item.quantity) || 0,
      unit: item.unit,
      unit_price: item.unit_price ? Number(item.unit_price) : null,
      note: item.note.trim() || null,
    }))

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemsPayload)

    if (itemsError) {
      setFormError(`Zamówienie utworzone, ale błąd pozycji: ${itemsError.message}`)
      setSaving(false)
      return
    }

    // Reset form
    setSupplierName('')
    setExpectedDelivery('')
    setNotes('')
    setLineItems([{ ...EMPTY_LINE }])
    setSaving(false)
    setTab('orders')
  }

  // ── Tab bar labels ──────────────────────────────────────────────
  const tabLabels: Record<Tab, string> = {
    orders: 'Zamówienia',
    new: 'Nowe zamówienie',
    done: 'Dostarczone',
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827]">Zamówienia zakupu</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">{locationName}</p>
        </div>
        <button
          onClick={() => setTab('new')}
          className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Nowe zamówienie
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E5E7EB]">
        {(['orders', 'new', 'done'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-[#111827] text-[#111827]'
                : 'border-transparent text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB: ZAMÓWIENIA ═══════════════════════════ */}
      {tab === 'orders' && (
        <div className="space-y-3">
          {loadingActive ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-8 text-center">
              <p className="text-[13px] text-[#6B7280]">Brak aktywnych zamówień.</p>
              <button
                onClick={() => setTab('new')}
                className="mt-3 h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Utwórz zamówienie
              </button>
            </div>
          ) : (
            activeOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onSend={handleSend}
                onReceive={handleReceive}
                onCancel={handleCancel}
                actionLoading={actionLoading}
              />
            ))
          )}
        </div>
      )}

      {/* ═══════════════ TAB: NOWE ZAMÓWIENIE ══════════════════════ */}
      {tab === 'new' && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-5 space-y-5">
          <h2 className="text-[15px] font-semibold text-[#111827]">Nowe zamówienie</h2>

          {/* Supplier + delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#374151]">
                Dostawca <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={e => setSupplierName(e.target.value)}
                placeholder="Nazwa dostawcy"
                className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#374151]">Oczekiwana dostawa</label>
              <input
                type="date"
                value={expectedDelivery}
                onChange={e => setExpectedDelivery(e.target.value)}
                className="w-full h-9 px-3 text-[13px] rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#374151]">Uwagi (opcjonalne)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Dodatkowe informacje dla dostawcy…"
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20 resize-none"
            />
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[#111827]">Pozycje zamówienia</p>
              <button
                onClick={addLine}
                className="h-8 px-3 text-[12px] font-medium rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Dodaj pozycję
              </button>
            </div>

            {/* Header labels */}
            <div className="hidden sm:grid grid-cols-[1fr_90px_80px_90px_1fr_32px] gap-2 px-1">
              {['Nazwa', 'Ilość', 'Jedn.', 'Cena jedn.', 'Uwaga', ''].map((h, i) => (
                <span key={i} className="text-[11px] font-medium text-[#9CA3AF]">{h}</span>
              ))}
            </div>

            {lineItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_90px_80px_90px_1fr_32px] gap-2 items-center">
                {/* Ingredient name */}
                <input
                  type="text"
                  value={item.ingredient_name}
                  onChange={e => updateLine(idx, 'ingredient_name', e.target.value)}
                  placeholder="Składnik / produkt"
                  className="h-9 px-3 text-[13px] rounded-lg border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
                />
                {/* Quantity */}
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={item.quantity}
                  onChange={e => updateLine(idx, 'quantity', e.target.value)}
                  placeholder="0"
                  className="h-9 px-3 text-[13px] rounded-lg border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
                />
                {/* Unit */}
                <select
                  value={item.unit}
                  onChange={e => updateLine(idx, 'unit', e.target.value as LineItemDraft['unit'])}
                  className="h-9 px-2 text-[13px] rounded-lg border border-[#E5E7EB] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
                >
                  {UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                {/* Unit price */}
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={item.unit_price}
                  onChange={e => updateLine(idx, 'unit_price', e.target.value)}
                  placeholder="Cena"
                  className="h-9 px-3 text-[13px] rounded-lg border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
                />
                {/* Note */}
                <input
                  type="text"
                  value={item.note}
                  onChange={e => updateLine(idx, 'note', e.target.value)}
                  placeholder="Uwaga"
                  className="h-9 px-3 text-[13px] rounded-lg border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#111827]/20"
                />
                {/* Remove */}
                <button
                  onClick={() => removeLine(idx)}
                  disabled={lineItems.length === 1}
                  className="h-9 w-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Error */}
          {formError && (
            <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={createOrder}
              disabled={saving}
              className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Utwórz zamówienie
            </button>
            <button
              onClick={() => setTab('orders')}
              className="h-8 px-3 text-[12px] font-medium rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]"
            >
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: DOSTARCZONE ══════════════════════════ */}
      {tab === 'done' && (
        <div className="space-y-3">
          {loadingDone ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : doneOrders.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-8 text-center">
              <p className="text-[13px] text-[#6B7280]">Brak zrealizowanych ani anulowanych zamówień.</p>
            </div>
          ) : (
            doneOrders.map(order => (
              <DoneOrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      )}

    </div>
  )
}
