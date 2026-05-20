'use client'

import { useEffect, useState, useCallback, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Loader2, ChefHat, Plus, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react'

/* ─── types ─────────────────────────────────────────────────────────────── */
interface Props {
  companyId: string
  supabase: SupabaseClient
}

interface RecipeIngredient {
  id?: string
  ingredient_name: string
  quantity: number
  unit: string
}

interface Recipe {
  id: string
  company_id: string
  name: string
  category: string
  portions: number
  selling_price: number | null
  notes: string | null
  created_at?: string
  recipe_ingredients: RecipeIngredient[]
}

type PriceMap = Record<string, number> // ingredient lowercase → price per unit

const CATEGORIES = ['Przystawki', 'Zupy', 'Dania główne', 'Desery', 'Napoje', 'Inne']
const UNITS = ['kg', 'g', 'l', 'ml', 'szt', 'łyżka', 'szczypta']

/* ─── helpers ────────────────────────────────────────────────────────────── */
const fmt = (v: number) =>
  new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)

function computeIngredientCost(
  ingredient: RecipeIngredient,
  priceMap: PriceMap,
): number | null {
  if (!ingredient.ingredient_name) return null
  const key = ingredient.ingredient_name.trim().toLowerCase()
  const pricePerUnit = priceMap[key]
  if (!pricePerUnit) return null
  return pricePerUnit * ingredient.quantity
}

function computeTotalCost(ingredients: RecipeIngredient[], priceMap: PriceMap): number {
  return ingredients.reduce((sum, ing) => {
    if (!ing.ingredient_name?.trim()) return sum
    const c = computeIngredientCost(ing, priceMap)
    return sum + (c ?? 0)
  }, 0)
}

function foodCostColor(pct: number): string {
  if (pct < 30) return 'text-green-600'
  if (pct <= 38) return 'text-amber-600'
  return 'text-red-600'
}

function portionCostColor(cost: number): string {
  if (cost === 0) return 'text-[#9CA3AF]'
  if (cost < 15) return 'text-green-600'
  if (cost < 30) return 'text-amber-600'
  return 'text-red-600'
}

/* ─── empty ingredient row ───────────────────────────────────────────────── */
function emptyIngredient(): RecipeIngredient {
  return { ingredient_name: '', quantity: 0, unit: 'kg' }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export function RecipeCostCalc({ companyId, supabase }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [priceMap, setPriceMap] = useState<PriceMap>({})
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

  /* ── fetch price map from invoice_items ─────────────────────────────── */
  const fetchPriceMap = useCallback(async () => {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('product_name, net_price, quantity, unit, invoices(service_date, company_id)')
      .eq('invoices.company_id', companyId)
      .order('invoices.service_date', { ascending: false })

    if (error || !data) return

    const map: PriceMap = {}
    for (const item of data) {
      if (!item.product_name || !item.net_price || !item.quantity) continue
      const key = String(item.product_name).trim().toLowerCase()
      // only store the first (most recent) occurrence
      if (!(key in map)) {
        map[key] = item.net_price / item.quantity
      }
    }
    setPriceMap(map)
  }, [companyId, supabase])

  /* ── fetch recipes ───────────────────────────────────────────────────── */
  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*, recipe_ingredients(*)')
      .eq('company_id', companyId)
      .order('name')

    if (error || !data) return
    setRecipes(data as Recipe[])
  }, [companyId, supabase])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPriceMap(), fetchRecipes()]).finally(() => setLoading(false))
  }, [fetchPriceMap, fetchRecipes])

  /* ── open editor ─────────────────────────────────────────────────────── */
  function openNew() {
    setEditingRecipe({
      id: '',
      company_id: companyId,
      name: '',
      category: 'Inne',
      portions: 1,
      selling_price: null,
      notes: null,
      recipe_ingredients: [emptyIngredient()],
    })
    setView('editor')
  }

  function openEdit(recipe: Recipe) {
    setEditingRecipe({
      ...recipe,
      recipe_ingredients:
        recipe.recipe_ingredients.length > 0
          ? recipe.recipe_ingredients
          : [emptyIngredient()],
    })
    setView('editor')
  }

  function closeEditor() {
    setEditingRecipe(null)
    setView('list')
  }

  /* ── save (upsert) ───────────────────────────────────────────────────── */
  async function handleSave(recipe: Recipe) {
    const isNew = !recipe.id

    if (isNew) {
      // insert recipe
      const { data: newRec, error: recErr } = await supabase
        .from('recipes')
        .insert({
          company_id: companyId,
          name: recipe.name.trim(),
          category: recipe.category,
          portions: recipe.portions,
          selling_price: recipe.selling_price ?? null,
          notes: recipe.notes?.trim() || null,
        })
        .select()
        .single()

      if (recErr || !newRec) return

      const ingredients = recipe.recipe_ingredients.filter(
        (i) => i.ingredient_name.trim() !== '',
      )
      if (ingredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          ingredients.map((i) => ({
            recipe_id: newRec.id,
            ingredient_name: i.ingredient_name.trim(),
            quantity: i.quantity,
            unit: i.unit,
          })),
        )
      }
    } else {
      // update recipe row
      await supabase
        .from('recipes')
        .update({
          name: recipe.name.trim(),
          category: recipe.category,
          portions: recipe.portions,
          selling_price: recipe.selling_price ?? null,
          notes: recipe.notes?.trim() || null,
        })
        .eq('id', recipe.id)

      // replace ingredients: delete all then re-insert
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe.id)

      const ingredients = recipe.recipe_ingredients.filter(
        (i) => i.ingredient_name.trim() !== '',
      )
      if (ingredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(
          ingredients.map((i) => ({
            recipe_id: recipe.id,
            ingredient_name: i.ingredient_name.trim(),
            quantity: i.quantity,
            unit: i.unit,
          })),
        )
      }
    }

    await fetchRecipes()
    closeEditor()
  }

  /* ── delete ──────────────────────────────────────────────────────────── */
  async function handleDelete(recipeId: string) {
    if (!window.confirm('Czy na pewno chcesz usunąć tę recepturę?')) return
    await supabase.from('recipes').delete().eq('id', recipeId)
    await fetchRecipes()
    closeEditor()
  }

  /* ── render ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (view === 'editor' && editingRecipe) {
    return (
      <EditorView
        recipe={editingRecipe}
        priceMap={priceMap}
        onBack={closeEditor}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    )
  }

  return (
    <ListView
      recipes={recipes}
      priceMap={priceMap}
      onNew={openNew}
      onEdit={openEdit}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIST VIEW
═══════════════════════════════════════════════════════════════════════════ */
interface ListViewProps {
  recipes: Recipe[]
  priceMap: PriceMap
  onNew: () => void
  onEdit: (r: Recipe) => void
}

function ListView({ recipes, priceMap, onNew, onEdit }: ListViewProps) {
  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold text-[#111827]">
          Kalkulacja kosztów receptur
        </h1>
        <button
          onClick={onNew}
          className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Nowa receptura
        </button>
      </div>

      {/* empty state */}
      {recipes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[#9CA3AF]">
          <ChefHat className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-[13px]">Brak receptur. Dodaj pierwszą.</p>
        </div>
      )}

      {/* grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recipes.map((recipe) => {
          const totalCost = computeTotalCost(recipe.recipe_ingredients, priceMap)
          const portions = recipe.portions > 0 ? recipe.portions : 1
          const costPerPortion = totalCost / portions
          const sp = recipe.selling_price
          const fcPct = sp && sp > 0 ? (costPerPortion / sp) * 100 : null
          const margin = sp != null ? sp - costPerPortion : null

          return (
            <button
              key={recipe.id}
              onClick={() => onEdit(recipe)}
              className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-[13px] font-semibold text-[#111827] leading-tight">
                  {recipe.name}
                </p>
                <span className="text-[11px] text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-2 py-0.5 ml-2 whitespace-nowrap">
                  {recipe.category}
                </span>
              </div>

              <p className={`text-[22px] font-bold leading-none mb-1 ${portionCostColor(costPerPortion)}`}>
                {costPerPortion > 0 ? `${fmt(costPerPortion)} zł` : '—'}
              </p>
              <p className="text-[11px] text-[#9CA3AF] mb-3">koszt / porcja</p>

              <div className="flex items-center gap-4 flex-wrap">
                {fcPct != null && (
                  <div>
                    <p className="text-[11px] text-[#9CA3AF]">Food cost</p>
                    <p className={`text-[13px] font-semibold ${foodCostColor(fcPct)}`}>
                      {fmt(fcPct)}%
                    </p>
                  </div>
                )}
                {sp != null && (
                  <div>
                    <p className="text-[11px] text-[#9CA3AF]">Cena sprzedaży</p>
                    <p className="text-[13px] font-medium text-[#374151]">{fmt(sp)} zł</p>
                  </div>
                )}
                {margin != null && (
                  <div>
                    <p className="text-[11px] text-[#9CA3AF]">Marża</p>
                    <p
                      className={`text-[13px] font-medium ${
                        margin >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {fmt(margin)} zł
                    </p>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EDITOR VIEW
═══════════════════════════════════════════════════════════════════════════ */
interface EditorViewProps {
  recipe: Recipe
  priceMap: PriceMap
  onBack: () => void
  onSave: (r: Recipe) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function EditorView({ recipe: initialRecipe, priceMap, onBack, onSave, onDelete }: EditorViewProps) {
  const [recipe, setRecipe] = useState<Recipe>(initialRecipe)
  const [saving, setSaving] = useState(false)

  const isNew = !recipe.id

  /* ── field helpers ──────────────────────────────────────────────────── */
  function setField<K extends keyof Recipe>(key: K, value: Recipe[K]) {
    setRecipe((prev) => ({ ...prev, [key]: value }))
  }

  function setIngredient(index: number, field: keyof RecipeIngredient, value: string | number) {
    setRecipe((prev) => {
      const ings = [...prev.recipe_ingredients]
      ings[index] = { ...ings[index], [field]: value }
      return { ...prev, recipe_ingredients: ings }
    })
  }

  function addIngredient() {
    setRecipe((prev) => ({
      ...prev,
      recipe_ingredients: [...prev.recipe_ingredients, emptyIngredient()],
    }))
  }

  function removeIngredient(index: number) {
    setRecipe((prev) => ({
      ...prev,
      recipe_ingredients: prev.recipe_ingredients.filter((_, i) => i !== index),
    }))
  }

  /* ── cost calculations ──────────────────────────────────────────────── */
  const totalCost = computeTotalCost(recipe.recipe_ingredients, priceMap)
  const portions = recipe.portions > 0 ? recipe.portions : 1
  const costPerPortion = totalCost / portions
  const sp = recipe.selling_price
  const fcPct = sp && sp > 0 ? (costPerPortion / sp) * 100 : null
  const margin = sp != null ? sp - costPerPortion : null
  const highFoodCost = fcPct != null && fcPct > 38

  /* ── submit ──────────────────────────────────────────────────────────── */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!recipe.name.trim()) return
    setSaving(true)
    try {
      await onSave(recipe)
    } finally {
      setSaving(false)
    }
  }

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Receptury
        </button>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={() => onDelete(recipe.id)}
              className="h-8 px-3 text-[12px] font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Usuń
            </button>
          )}
          <button
            type="submit"
            disabled={saving || !recipe.name.trim()}
            className="h-8 px-3 text-[12px] font-medium rounded-lg bg-[#111827] text-white hover:bg-[#1F2937] flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Zapisz
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── left / main form ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* basic info card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-4">
            <p className="text-[13px] font-semibold text-[#111827]">Informacje o daniu</p>

            {/* name */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#374151] uppercase tracking-wide">
                Nazwa dania *
              </label>
              <input
                type="text"
                required
                value={recipe.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="np. Żurek staropolski"
                className="w-full h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#111827] bg-white text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>

            {/* category + portions row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#374151] uppercase tracking-wide">
                  Kategoria
                </label>
                <select
                  value={recipe.category}
                  onChange={(e) => setField('category', e.target.value)}
                  className="w-full h-8 px-2 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#111827] bg-white text-[#111827]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#374151] uppercase tracking-wide">
                  Liczba porcji
                </label>
                <input
                  type="number"
                  min={1}
                  value={recipe.portions}
                  onChange={(e) => setField('portions', Math.max(1, Number(e.target.value)))}
                  className="w-full h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#111827] bg-white text-[#111827]"
                />
              </div>
            </div>

            {/* selling price */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#374151] uppercase tracking-wide">
                Cena sprzedaży (PLN)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={recipe.selling_price ?? ''}
                onChange={(e) =>
                  setField('selling_price', e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder="opcjonalnie"
                className="w-full h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#111827] bg-white text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>

            {/* notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#374151] uppercase tracking-wide">
                Notatki
              </label>
              <textarea
                rows={2}
                value={recipe.notes ?? ''}
                onChange={(e) => setField('notes', e.target.value || null)}
                placeholder="opcjonalnie"
                className="w-full px-3 py-2 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#111827] bg-white text-[#111827] placeholder:text-[#9CA3AF] resize-none"
              />
            </div>
          </div>

          {/* ingredients card */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[#111827]">Składniki</p>
              <button
                type="button"
                onClick={addIngredient}
                className="h-7 px-2.5 text-[11px] font-medium rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Dodaj składnik
              </button>
            </div>

            {recipe.recipe_ingredients.length === 0 && (
              <p className="text-[11px] text-[#9CA3AF] py-2 text-center">
                Brak składników.
              </p>
            )}

            <div className="space-y-2">
              {recipe.recipe_ingredients.map((ing, idx) => {
                const ingCost = computeIngredientCost(ing, priceMap)
                return (
                  <div key={idx} className="flex items-center gap-2">
                    {/* name */}
                    <input
                      type="text"
                      value={ing.ingredient_name}
                      onChange={(e) => setIngredient(idx, 'ingredient_name', e.target.value)}
                      placeholder="Nazwa składnika"
                      className="flex-1 h-8 px-3 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#111827] bg-white text-[#111827] placeholder:text-[#9CA3AF]"
                    />
                    {/* quantity */}
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={ing.quantity || ''}
                      onChange={(e) => setIngredient(idx, 'quantity', Number(e.target.value))}
                      placeholder="Ilość"
                      className="w-20 h-8 px-2 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#111827] bg-white text-[#111827] placeholder:text-[#9CA3AF]"
                    />
                    {/* unit */}
                    <select
                      value={ing.unit}
                      onChange={(e) => setIngredient(idx, 'unit', e.target.value)}
                      className="w-20 h-8 px-1 text-[13px] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#111827] bg-white text-[#111827]"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    {/* cost hint */}
                    <span
                      className={`text-[11px] w-20 text-right ${
                        ingCost != null ? 'text-green-600 font-medium' : 'text-[#9CA3AF]'
                      }`}
                    >
                      {ingCost != null ? `${fmt(ingCost)} zł` : '—'}
                    </span>
                    {/* remove */}
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── right / cost summary ──────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4 space-y-4 lg:sticky lg:top-4">
            <p className="text-[13px] font-semibold text-[#111827]">Podsumowanie kosztów</p>

            <div className="space-y-3">
              <CostRow
                label="Łączny koszt składników"
                value={totalCost > 0 ? `${fmt(totalCost)} zł` : '—'}
                valueClass="text-[#374151]"
              />
              <CostRow
                label={`Koszt / porcja (÷${portions})`}
                value={costPerPortion > 0 ? `${fmt(costPerPortion)} zł` : '—'}
                valueClass={portionCostColor(costPerPortion)}
                large
              />
              {fcPct != null && (
                <CostRow
                  label="Food cost %"
                  value={`${fmt(fcPct)}%`}
                  valueClass={foodCostColor(fcPct)}
                />
              )}
              {margin != null && (
                <CostRow
                  label="Marża brutto"
                  value={`${fmt(margin)} zł`}
                  valueClass={margin >= 0 ? 'text-green-600' : 'text-red-600'}
                />
              )}
            </div>

            {/* high food cost warning */}
            {highFoodCost && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700 leading-snug">
                  Wysoki food cost! Rozważ zmianę ceny.
                </p>
              </div>
            )}

            {/* legend */}
            <div className="border-t border-[#E5E7EB] pt-3 space-y-1">
              <p className="text-[11px] text-[#9CA3AF] font-medium">Skala food cost</p>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                <span className="text-[#6B7280]">&lt;30% — optymalny</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span className="text-[#6B7280]">30–38% — akceptowalny</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                <span className="text-[#6B7280]">&gt;38% — wysoki</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

/* ─── small helper component ─────────────────────────────────────────────── */
function CostRow({
  label,
  value,
  valueClass,
  large,
}: {
  label: string
  value: string
  valueClass: string
  large?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-[#6B7280]">{label}</span>
      <span className={`font-semibold ${large ? 'text-[18px]' : 'text-[13px]'} ${valueClass}`}>
        {value}
      </span>
    </div>
  )
}
