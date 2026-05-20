'use client'

import { useEffect, useState, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Loader2, Search, TrendingUp, TrendingDown, Minus, Package } from 'lucide-react'

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const PLN = (v: number) =>
  new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v || 0)

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/* ─── types ───────────────────────────────────────────────────────────────── */
interface PriceEntry {
  date: string
  supplier: string
  price_per_unit: number
}

interface InvoiceItem {
  product_name: string
  quantity: number
  unit: string
  net_price: number
  cos_category: string | null
}

interface Invoice {
  id: string
  supplier_name: string
  service_date: string
  invoice_items: InvoiceItem[]
}

interface Props {
  locationId: string
  supabase: SupabaseClient
}

/* ─── main component ──────────────────────────────────────────────────────── */
export function SupplierPriceChart({ locationId, supabase }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productMap, setProductMap] = useState<Map<string, PriceEntry[]>>(new Map())
  const [recentProducts, setRecentProducts] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
  }, [locationId])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: dbErr } = await supabase
        .from('invoices')
        .select('id, supplier_name, service_date, invoice_items(product_name, quantity, unit, net_price, cos_category)')
        .eq('location_id', locationId)
        .eq('status', 'approved')
        .order('service_date', { ascending: false })
        .limit(200)

      if (dbErr) throw dbErr

      const invoices = (data ?? []) as Invoice[]
      const map = new Map<string, PriceEntry[]>()
      // Track order of first appearance (most recent first, since we ordered desc)
      const firstSeen: string[] = []

      for (const inv of invoices) {
        const items = Array.isArray(inv.invoice_items) ? inv.invoice_items : []
        for (const item of items) {
          if (!item.product_name) continue
          const pricePerUnit =
            item.quantity && item.quantity !== 0
              ? item.net_price / item.quantity
              : item.net_price

          if (!map.has(item.product_name)) {
            map.set(item.product_name, [])
            firstSeen.push(item.product_name)
          }
          map.get(item.product_name)!.push({
            date: inv.service_date,
            supplier: inv.supplier_name ?? '—',
            price_per_unit: pricePerUnit,
          })
        }
      }

      // Sort each product's entries by date ascending
      for (const [, entries] of map) {
        entries.sort((a, b) => a.date.localeCompare(b.date))
      }

      setProductMap(map)
      // 6 most recently seen products (first seen in desc-ordered invoices)
      setRecentProducts(firstSeen.slice(0, 6))
    } catch (e: any) {
      setError(e?.message ?? 'Błąd pobierania danych')
    } finally {
      setLoading(false)
    }
  }

  /* ─── filtered suggestions ─────────────────────────────────────────────── */
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return Array.from(productMap.keys())
      .filter(name => name.toLowerCase().includes(q))
      .slice(0, 12)
  }, [searchQuery, productMap])

  /* ─── selected product data ─────────────────────────────────────────────── */
  const selectedEntries = selectedProduct ? (productMap.get(selectedProduct) ?? []) : []

  const latestEntry =
    selectedEntries.length > 0 ? selectedEntries[selectedEntries.length - 1] : null

  function getPriceDiff(entries: PriceEntry[], idx: number) {
    if (idx === 0) return null
    const diff = entries[idx].price_per_unit - entries[idx - 1].price_per_unit
    return diff
  }

  /* ─── render ────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">
          Historia cen dostawców
        </h1>
        <p className="text-[13px] text-[#6B7280] mt-0.5">
          Śledź zmiany cen składników i produktów na przestrzeni czasu
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Search */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  if (!e.target.value.trim()) {
                    // Don't clear selected product when emptying search
                  }
                }}
                placeholder="Szukaj produktu lub składnika…"
                className="w-full pl-9 pr-4 py-2 text-[13px] text-[#111827] border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-[#9CA3AF]"
              />
            </div>

            {/* Search suggestions as chips */}
            {filteredSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filteredSuggestions.map(name => (
                  <button
                    key={name}
                    onClick={() => {
                      setSelectedProduct(name)
                      setSearchQuery('')
                    }}
                    className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                      selectedProduct === name
                        ? 'bg-[#111827] text-white border-[#111827]'
                        : 'bg-white text-[#374151] border-[#E5E7EB] hover:border-[#9CA3AF] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected product view */}
          {selectedProduct && selectedEntries.length > 0 ? (
            <div className="space-y-4">
              {/* Latest price summary card */}
              {latestEntry && (
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1">
                      Ostatnia cena
                    </p>
                    <p className="text-[24px] font-black text-[#111827]">
                      {PLN(latestEntry.price_per_unit)}
                    </p>
                    <p className="text-[12px] text-[#6B7280] mt-0.5">
                      {latestEntry.supplier} · {formatDate(latestEntry.date)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors mt-1"
                  >
                    ✕ wyczyść
                  </button>
                </div>
              )}

              {/* Product heading */}
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#6B7280]" />
                <h2 className="text-[16px] font-bold text-[#111827]">{selectedProduct}</h2>
                <span className="text-[12px] text-[#9CA3AF]">
                  ({selectedEntries.length} {selectedEntries.length === 1 ? 'rekord' : selectedEntries.length < 5 ? 'rekordy' : 'rekordów'})
                </span>
              </div>

              {/* Price history table */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
                        Data
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
                        Dostawca
                      </th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
                        Cena netto/szt
                      </th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
                        Zmiana
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Show newest first in table */}
                    {[...selectedEntries].reverse().map((entry, revIdx) => {
                      const origIdx = selectedEntries.length - 1 - revIdx
                      const diff = getPriceDiff(selectedEntries, origIdx)
                      const isLatest = origIdx === selectedEntries.length - 1

                      return (
                        <tr
                          key={`${entry.date}-${entry.supplier}-${origIdx}`}
                          className={`border-b border-[#E5E7EB] last:border-0 ${
                            isLatest ? 'bg-blue-50' : 'hover:bg-[#F9FAFB]'
                          } transition-colors`}
                        >
                          <td className="px-4 py-3 text-[#374151]">
                            {formatDate(entry.date)}
                            {isLatest && (
                              <span className="ml-2 text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                                ostatnia
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[#374151]">{entry.supplier}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#111827]">
                            {PLN(entry.price_per_unit)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {diff === null ? (
                              <span className="text-[#9CA3AF]">—</span>
                            ) : diff > 0 ? (
                              <span className="flex items-center justify-end gap-1 text-red-600 font-semibold">
                                <TrendingUp className="w-3.5 h-3.5" />
                                +{PLN(diff)}
                              </span>
                            ) : diff < 0 ? (
                              <span className="flex items-center justify-end gap-1 text-emerald-600 font-semibold">
                                <TrendingDown className="w-3.5 h-3.5" />
                                {PLN(diff)}
                              </span>
                            ) : (
                              <span className="flex items-center justify-end gap-1 text-[#9CA3AF]">
                                <Minus className="w-3.5 h-3.5" />
                                bez zmiany
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* CSS price bar chart */}
              {selectedEntries.length >= 2 && (
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
                  <p className="text-[13px] font-semibold text-[#111827] mb-4">
                    Wykres cen w czasie
                  </p>
                  <div className="space-y-2">
                    {(() => {
                      const maxPrice = Math.max(...selectedEntries.map(e => e.price_per_unit))
                      return selectedEntries.map((entry, idx) => {
                        const widthPct = maxPrice > 0 ? (entry.price_per_unit / maxPrice) * 100 : 0
                        const diff = getPriceDiff(selectedEntries, idx)
                        const barColor =
                          diff === null
                            ? 'bg-blue-400'
                            : diff > 0
                            ? 'bg-red-400'
                            : diff < 0
                            ? 'bg-emerald-400'
                            : 'bg-blue-400'
                        return (
                          <div key={`bar-${idx}`} className="flex items-center gap-3">
                            <span className="text-[11px] text-[#9CA3AF] w-20 shrink-0 text-right">
                              {formatDate(entry.date)}
                            </span>
                            <div className="flex-1 h-6 bg-[#F3F4F6] rounded-md overflow-hidden">
                              <div
                                className={`h-full ${barColor} rounded-md transition-all duration-500`}
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                            <span className="text-[12px] font-semibold text-[#374151] w-20 shrink-0">
                              {PLN(entry.price_per_unit)}
                            </span>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : selectedProduct && selectedEntries.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-8 text-center">
              <p className="text-[13px] text-[#9CA3AF]">
                Brak historii cen dla produktu „{selectedProduct}"
              </p>
            </div>
          ) : (
            /* No product selected — show 6 most recent products grid */
            <div>
              <p className="text-[13px] font-semibold text-[#6B7280] mb-3">
                Ostatnio widziane produkty
              </p>
              {recentProducts.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-8 text-center">
                  <Package className="w-8 h-8 text-[#D1D5DB] mx-auto mb-3" />
                  <p className="text-[13px] text-[#9CA3AF]">
                    Brak zatwierdzonych faktur z pozycjami
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {recentProducts.map(name => {
                    const entries = productMap.get(name) ?? []
                    const latest = entries[entries.length - 1]
                    const prev = entries.length > 1 ? entries[entries.length - 2] : null
                    const diff = prev && latest ? latest.price_per_unit - prev.price_per_unit : null

                    return (
                      <button
                        key={name}
                        onClick={() => setSelectedProduct(name)}
                        className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 text-left hover:border-blue-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Package className="w-4 h-4 text-[#9CA3AF] group-hover:text-blue-500 transition-colors" />
                          {diff !== null && (
                            <span
                              className={`text-[11px] font-semibold ${
                                diff > 0
                                  ? 'text-red-500'
                                  : diff < 0
                                  ? 'text-emerald-600'
                                  : 'text-[#9CA3AF]'
                              }`}
                            >
                              {diff > 0 ? '↑' : diff < 0 ? '↓' : '—'}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] font-semibold text-[#111827] leading-snug mb-1 line-clamp-2">
                          {name}
                        </p>
                        {latest && (
                          <>
                            <p className="text-[16px] font-black text-[#111827]">
                              {PLN(latest.price_per_unit)}
                            </p>
                            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                              {latest.supplier} · {formatDate(latest.date)}
                            </p>
                          </>
                        )}
                        <p className="text-[11px] text-[#6B7280] mt-1">
                          {entries.length} {entries.length === 1 ? 'wpis' : entries.length < 5 ? 'wpisy' : 'wpisów'}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
