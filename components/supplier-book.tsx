'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Plus, Trash2, Edit2, X, Loader2, BookOpen } from 'lucide-react'

type Supplier = {
  id: string
  company_id: string
  name: string
  phone: string | null
  email: string | null
  account_number: string | null
  notes: string | null
  created_at: string
}

type SupplierForm = {
  name: string
  phone: string
  email: string
  account_number: string
  notes: string
}

const EMPTY_FORM: SupplierForm = {
  name: '',
  phone: '',
  email: '',
  account_number: '',
  notes: '',
}

export function SupplierBook({
  companyId,
  supabase,
}: {
  companyId: string
  supabase: SupabaseClient
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('supplier_contacts')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
    setSuppliers((data ?? []) as Supplier[])
    setLoading(false)
  }, [companyId, supabase])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(supplier: Supplier) {
    setEditingId(supplier.id)
    setForm({
      name: supplier.name,
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      account_number: supplier.account_number ?? '',
      notes: supplier.notes ?? '',
    })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Nazwa dostawcy jest wymagana.')
      return
    }
    setSaving(true)
    setFormError('')

    const payload = {
      company_id: companyId,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      account_number: form.account_number.trim() || null,
      notes: form.notes.trim() || null,
    }

    if (editingId) {
      const { error } = await supabase
        .from('supplier_contacts')
        .update(payload)
        .eq('id', editingId)
      if (error) { setFormError('Błąd zapisu. Spróbuj ponownie.'); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('supplier_contacts')
        .insert(payload)
      if (error) { setFormError('Błąd zapisu. Spróbuj ponownie.'); setSaving(false); return }
    }

    await fetchSuppliers()
    closeForm()
    setSaving(false)
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(`Czy na pewno chcesz usunąć dostawcę „${name}"?`)
    if (!confirmed) return
    setDeleting(id)
    await supabase.from('supplier_contacts').delete().eq('id', id)
    setSuppliers(prev => prev.filter(s => s.id !== id))
    setDeleting(null)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold text-[#111827]">Książka adresowa dostawców</h2>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Zarządzaj kontaktami do swoich dostawców w jednym miejscu.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openAdd}
            className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Dodaj dostawcę
          </button>
        )}
      </div>

      {/* Inline add / edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[#111827]">
              {editingId ? 'Edytuj dostawcę' : 'Nowy dostawca'}
            </p>
            <button
              onClick={closeForm}
              className="p-1 rounded text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[11px] font-medium text-[#374151] mb-1">
              Nazwa <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="np. Piekarnia Kowalski"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#374151] mb-1">Telefon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+48 000 000 000"
                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#374151] mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="kontakt@dostawca.pl"
                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Account number */}
          <div>
            <label className="block text-[11px] font-medium text-[#374151] mb-1">Numer konta</label>
            <input
              type="text"
              value={form.account_number}
              onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
              placeholder="00 0000 0000 0000 0000 0000 0000"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-[#374151] mb-1">Notatki</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Dodatkowe informacje o dostawcy..."
              rows={2}
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111827] placeholder-[#9CA3AF] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {formError && (
            <p className="text-[12px] text-red-600">{formError}</p>
          )}

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={closeForm}
              className="h-8 px-3 text-[12px] font-medium rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] flex items-center gap-1.5"
            >
              Anuluj
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Zapisz
            </button>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj dostawcy po nazwie..."
          className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111827] placeholder-[#9CA3AF] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Supplier list */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="w-8 h-8 text-[#9CA3AF] mb-2" />
          <p className="text-[13px] text-[#9CA3AF]">
            {suppliers.length === 0
              ? 'Brak dostawców. Dodaj pierwszego.'
              : 'Brak wyników dla podanej frazy.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(supplier => (
            <div key={supplier.id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                {/* Main info */}
                <div className="space-y-1.5 min-w-0">
                  <p className="text-[13px] font-semibold text-[#111827] truncate">{supplier.name}</p>

                  {/* Detail chips */}
                  {(supplier.phone || supplier.email || supplier.account_number) && (
                    <div className="flex flex-wrap gap-2">
                      {supplier.phone && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2 py-0.5">
                          📞 {supplier.phone}
                        </span>
                      )}
                      {supplier.email && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2 py-0.5">
                          ✉ {supplier.email}
                        </span>
                      )}
                      {supplier.account_number && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2 py-0.5">
                          🏦 {supplier.account_number}
                        </span>
                      )}
                    </div>
                  )}

                  {supplier.notes && (
                    <p className="text-[11px] text-[#9CA3AF] leading-relaxed">{supplier.notes}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(supplier)}
                    className="p-1.5 rounded text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] transition-colors"
                    title="Edytuj"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id, supplier.name)}
                    disabled={deleting === supplier.id}
                    className="p-1.5 rounded text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Usuń"
                  >
                    {deleting === supplier.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
