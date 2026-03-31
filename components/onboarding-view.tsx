'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'

type Employee = { id: string; full_name: string; position?: string | null }

type ChecklistItem = {
  id: string
  employee_id: string
  task: string
  due_date: string | null
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  note: string | null
  created_at: string
}

const DEFAULT_TASKS = [
  'Podpisanie umowy o pracę',
  'Wydanie legitymacji/karty pracownika',
  'Szkolenie BHP',
  'Szkolenie SANEPID / badania',
  'Zapoznanie z regulaminem pracy',
  'Szkolenie stanowiskowe',
  'Dostęp do systemów (konto, aplikacja)',
  'Przydzielenie uniformu / odzieży roboczej',
  'Przedstawienie zespołowi',
  'Omówienie zakresu obowiązków',
]

export function OnboardingView({
  locationId,
  locationName,
  supabase,
}: {
  locationId: string
  locationName: string
  supabase: any
}) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [addEmpId, setAddEmpId] = useState('')
  const [saving, setSaving] = useState(false)
  const [customTasks, setCustomTasks] = useState<string[]>(DEFAULT_TASKS.map(t => t))
  const [newTaskText, setNewTaskText] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: emps }, { data: items }] = await Promise.all([
      supabase.from('employees').select('id, full_name, position')
        .eq('location_id', locationId).in('status', ['active', 'confirmed']).order('full_name'),
      supabase.from('employee_onboarding').select('*')
        .in('employee_id',
          (await supabase.from('employees').select('id').eq('location_id', locationId)).data?.map((e: any) => e.id) ?? []
        ).order('created_at'),
    ])
    setEmployees(emps ?? [])
    const grouped: Record<string, ChecklistItem[]> = {}
    for (const item of (items ?? []) as ChecklistItem[]) {
      if (!grouped[item.employee_id]) grouped[item.employee_id] = []
      grouped[item.employee_id].push(item)
    }
    setChecklists(grouped)
    setLoading(false)
  }, [locationId, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function createChecklist() {
    if (!addEmpId) return
    setSaving(true)
    const rows = customTasks
      .filter(t => t.trim())
      .map(task => ({ employee_id: addEmpId, task, completed: false, due_date: null, note: null }))
    await supabase.from('employee_onboarding').insert(rows)
    setShowAdd(false)
    setAddEmpId('')
    setCustomTasks(DEFAULT_TASKS.map(t => t))
    setSaving(false)
    fetchData()
    setExpanded(prev => new Set([...prev, addEmpId]))
  }

  async function toggleTask(item: ChecklistItem) {
    const now = new Date().toISOString()
    await supabase.from('employee_onboarding').update({
      completed: !item.completed,
      completed_at: !item.completed ? now : null,
    }).eq('id', item.id)
    setChecklists(prev => ({
      ...prev,
      [item.employee_id]: prev[item.employee_id].map(i =>
        i.id === item.id ? { ...i, completed: !i.completed, completed_at: !i.completed ? now : null } : i
      ),
    }))
  }

  async function deleteTask(item: ChecklistItem) {
    await supabase.from('employee_onboarding').delete().eq('id', item.id)
    setChecklists(prev => ({
      ...prev,
      [item.employee_id]: prev[item.employee_id].filter(i => i.id !== item.id),
    }))
  }

  async function addTask(empId: string, task: string) {
    if (!task.trim()) return
    const { data } = await supabase.from('employee_onboarding').insert({
      employee_id: empId, task: task.trim(), completed: false, due_date: null, note: null,
    }).select().single()
    if (data) {
      setChecklists(prev => ({ ...prev, [empId]: [...(prev[empId] ?? []), data] }))
    }
  }

  const empWithChecklists = employees.filter(e => checklists[e.id]?.length > 0)
  const empWithout = employees.filter(e => !checklists[e.id]?.length)

  return (
    <div className="max-w-3xl mx-auto py-6 px-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[22px] font-bold text-[#111827]">Onboarding — {locationName}</h2>
          <p className="text-[13px] text-[#9CA3AF]">Listy zadań wdrożeniowych dla nowych pracowników</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-lg bg-[#1D4ED8] text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Nowy onboarding
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : empWithChecklists.length === 0 ? (
        <div className="text-center py-10 text-[#9CA3AF]">
          <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-[14px]">Brak aktywnych list onboardingowych</p>
          <p className="text-[12px] mt-1">Kliknij „Nowy onboarding", aby dodać pracownika</p>
        </div>
      ) : (
        <div className="space-y-3">
          {empWithChecklists.map(emp => {
            const items = checklists[emp.id] ?? []
            const done = items.filter(i => i.completed).length
            const pct = items.length ? Math.round((done / items.length) * 100) : 0
            const isOpen = expanded.has(emp.id)
            return (
              <div key={emp.id} className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpanded(prev => {
                    const s = new Set(prev)
                    s.has(emp.id) ? s.delete(emp.id) : s.add(emp.id)
                    return s
                  })}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F9FAFB] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[13px] font-bold">
                      {emp.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-[14px] font-semibold text-[#111827]">{emp.full_name}</p>
                      {emp.position && <p className="text-[11px] text-[#9CA3AF] capitalize">{emp.position}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-[13px] font-bold ${pct === 100 ? 'text-emerald-600' : 'text-[#374151]'}`}>
                        {done}/{items.length}
                      </p>
                      <div className="w-20 h-1.5 bg-[#F3F4F6] rounded-full mt-1">
                        <div
                          className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#9CA3AF]" /> : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />}
                  </div>
                </button>

                {/* Tasks */}
                {isOpen && (
                  <div className="border-t border-[#F3F4F6]">
                    <div className="divide-y divide-[#F9FAFB]">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                          <button onClick={() => toggleTask(item)} className="shrink-0">
                            {item.completed
                              ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              : <Circle className="w-5 h-5 text-[#D1D5DB]" />}
                          </button>
                          <span className={`flex-1 text-[13px] ${item.completed ? 'line-through text-[#9CA3AF]' : 'text-[#374151]'}`}>
                            {item.task}
                          </span>
                          {item.completed_at && (
                            <span className="text-[11px] text-[#9CA3AF] shrink-0">
                              {new Date(item.completed_at).toLocaleDateString('pl-PL')}
                            </span>
                          )}
                          <button
                            onClick={() => deleteTask(item)}
                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-[#D1D5DB] hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Add task inline */}
                    <AddTaskRow empId={emp.id} onAdd={(task) => addTask(emp.id, task)} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* New onboarding modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-[16px] text-[#111827] mb-4">Nowy onboarding</h3>

            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-[#374151] mb-1">Pracownik *</label>
              <select
                value={addEmpId}
                onChange={e => setAddEmpId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Wybierz pracownika...</option>
                {empWithout.map(e => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
                {empWithout.length === 0 && (
                  <option disabled>Wszyscy pracownicy mają już listę</option>
                )}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-[#374151] mb-2">Zadania do wykonania</label>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {customTasks.map((task, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={task}
                      onChange={e => setCustomTasks(prev => prev.map((t, i) => i === idx ? e.target.value : t))}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <button
                      onClick={() => setCustomTasks(prev => prev.filter((_, i) => i !== idx))}
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-[#9CA3AF] hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTaskText.trim()) {
                      setCustomTasks(prev => [...prev, newTaskText.trim()])
                      setNewTaskText('')
                    }
                  }}
                  placeholder="Dodaj własne zadanie..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={() => { if (newTaskText.trim()) { setCustomTasks(prev => [...prev, newTaskText.trim()]); setNewTaskText('') } }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#EFF6FF] text-blue-600 hover:bg-blue-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowAdd(false); setAddEmpId(''); setCustomTasks(DEFAULT_TASKS.map(t => t)) }}
                className="flex-1 py-2.5 rounded-lg border border-[#E5E7EB] text-[14px] font-semibold text-[#6B7280] hover:bg-[#F9FAFB]">
                Anuluj
              </button>
              <button onClick={createChecklist} disabled={saving || !addEmpId || customTasks.filter(t => t.trim()).length === 0}
                className="flex-[2] py-2.5 rounded-xl bg-[#1D4ED8] text-white font-bold text-[14px] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Utwórz listę'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddTaskRow({ empId, onAdd }: { empId: string; onAdd: (task: string) => void }) {
  const [text, setText] = useState('')
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-[#F3F4F6]">
      <Plus className="w-4 h-4 text-[#9CA3AF] shrink-0" />
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && text.trim()) { onAdd(text.trim()); setText('') }
        }}
        placeholder="Dodaj zadanie..."
        className="flex-1 text-[13px] text-[#374151] placeholder:text-[#D1D5DB] bg-transparent focus:outline-none"
      />
      {text.trim() && (
        <button
          onClick={() => { onAdd(text.trim()); setText('') }}
          className="text-[11px] text-blue-600 font-medium hover:underline shrink-0"
        >
          Dodaj
        </button>
      )}
    </div>
  )
}
