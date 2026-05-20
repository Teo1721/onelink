'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OneLinkLogo } from "@/components/onelink-logo";
import {
  LayoutDashboard, FileText, ClipboardList, LogOut, MapPin,
  Calendar, Users, Settings, CalendarDays, MoreHorizontal, X, QrCode, Clock,
  Umbrella, LayoutGrid, GitCompare, GraduationCap, FolderOpen, Banknote, UserCheck,
  ArrowLeftRight, CheckSquare, NotebookPen, BookUser, Trash2, Thermometer,
  TrendingUp, LineChart, ShoppingCart, PiggyBank,
  ChefHat, ShieldCheck, Landmark,
} from 'lucide-react'

type OpsSidebarProps = {
  locationName: string
  activeView: string
  onNavigate: (view: string) => void
  onLogout: () => void
  onSwitchLocation: () => void
  canSwitchToAdmin?: boolean
  extraPermissions?: string[]
  userRole?: string
}

const NAV_ITEMS = [
  { key: 'dashboard',   label: 'Dashboard',   labelFull: 'Dashboard',        icon: LayoutGrid },
  { key: 'reporting',   label: 'Raport',      labelFull: 'Raport dzienny',   icon: LayoutDashboard },
  { key: 'invoices',    label: 'Faktury',     labelFull: 'Faktury',          icon: FileText },
  { key: 'inventory',   label: 'Inwent.',     labelFull: 'Inwentaryzacja',   icon: ClipboardList },
  { key: 'scheduling',  label: 'Harmonogram', labelFull: 'Harmonogram',      icon: Calendar },
  { key: 'my_schedule', label: 'Mój grafik',  labelFull: 'Mój grafik',       icon: CalendarDays },
  { key: 'employees',   label: 'Pracownicy',  labelFull: 'Pracownicy',       icon: Users },
  { key: 'attendance',  label: 'Ewidencja',   labelFull: 'Ewidencja czasu',  icon: Clock },
  { key: 'leave',       label: 'Urlopy',      labelFull: 'Urlopy',           icon: Umbrella },
  { key: 'swaps',       label: 'Zamiany',     labelFull: 'Zamiany zmian',    icon: GitCompare },
  { key: 'certs',       label: 'Certyfik.',   labelFull: 'Certyfikaty',      icon: GraduationCap },
  { key: 'documents',   label: 'Dokumenty',   labelFull: 'Dokumenty',        icon: FolderOpen },
  { key: 'tips',        label: 'Napiwki',     labelFull: 'Napiwki',          icon: Banknote  },
  { key: 'onboarding',  label: 'Onboarding',  labelFull: 'Onboarding',       icon: UserCheck },
  { key: 'checklist',     label: 'Checklista',  labelFull: 'Checklista',          icon: CheckSquare },
  { key: 'handover',      label: 'Przekazanie', labelFull: 'Notatki zmiany',      icon: NotebookPen },
  { key: 'suppliers',     label: 'Dostawcy',    labelFull: 'Książka dostawców',   icon: BookUser },
  { key: 'waste',         label: 'Odpady',      labelFull: 'Ewidencja odpadów',   icon: Trash2 },
  { key: 'haccp',         label: 'HACCP',       labelFull: 'Kontrola HACCP',      icon: Thermometer },
  { key: 'forecast',        label: 'Prognoza',    labelFull: 'Prognoza przychodów', icon: TrendingUp },
  { key: 'price_tracking',  label: 'Ceny',        labelFull: 'Historia cen',        icon: LineChart },
  { key: 'purchase_orders', label: 'Zamówienia',  labelFull: 'Zamówienia do dostawców', icon: ShoppingCart },
  { key: 'budget',          label: 'Budżet',      labelFull: 'Budżet miesięczny',   icon: PiggyBank },
  { key: 'recipes',         label: 'Receptury',   labelFull: 'Kalkulacja receptur', icon: ChefHat },
  { key: 'allergens',       label: 'Alergeny',    labelFull: 'Rejestr alergenów',   icon: ShieldCheck },
  { key: 'cash_audit',      label: 'Kasa',        labelFull: 'Kontrola kasy',       icon: Landmark },
  { key: 'kiosk',           label: 'Kiosk',       labelFull: 'Kiosk QR',            icon: QrCode },
  { key: 'account',       label: 'Konto',       labelFull: 'Konto',               icon: Settings },
]

// Keys always visible to employees (regardless of extra permissions)
const EMPLOYEE_BASE_KEYS = new Set(['my_schedule', 'leave', 'swaps', 'certs', 'attendance', 'account'])

function useVisibleItems(userRole?: string, extraPermissions?: string[]) {
  if (!userRole || userRole !== 'employee') return NAV_ITEMS
  return NAV_ITEMS.filter(({ key }) =>
    EMPLOYEE_BASE_KEYS.has(key) || (extraPermissions ?? []).includes(key)
  )
}

export function OpsSidebar({
  locationName,
  activeView,
  onNavigate,
  onLogout,
  onSwitchLocation,
  canSwitchToAdmin = false,
  extraPermissions,
  userRole,
}: OpsSidebarProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const router = useRouter()

  const visibleItems = useVisibleItems(userRole, extraPermissions)
  const bottomMain = visibleItems.slice(0, 4)
  const bottomMore = visibleItems.slice(4)

  const navigate = (key: string) => {
    onNavigate(key)
    setMoreOpen(false)
  }

  return (
    <>
      {/* ══════════════════════════════════════════════════
          DESKTOP sidebar (hidden on mobile)
      ══════════════════════════════════════════════════ */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-[#0F172A] border-r border-[#1E293B] flex-col z-30">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[#1E293B] shrink-0">
          <OneLinkLogo iconSize={22} textSize="text-[14px]" dark={true} />
        </div>

        {/* Location switcher */}
        <button
          onClick={onSwitchLocation}
          className="flex items-center gap-2 px-5 py-3 border-b border-[#1E293B] hover:bg-[#1E293B] transition-colors text-left w-full shrink-0"
        >
          <MapPin className="w-3.5 h-3.5 text-[#475569] shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569]">Lokal</p>
            <p className="text-[13px] font-semibold text-[#E2E8F0] truncate max-w-[140px]">{locationName}</p>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] px-3 pb-1.5">Menu</p>
          {visibleItems.map(({ key, labelFull, icon: Icon }) => {
            const isActive = activeView === key
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={[
                  'relative w-full flex items-center gap-2.5 px-3 h-8 rounded-lg text-[13px] font-medium transition-all duration-100 cursor-pointer',
                  isActive
                    ? 'bg-[#1E3A5F] text-[#60A5FA]'
                    : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#E2E8F0]',
                ].join(' ')}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#3B82F6]" />}
                <Icon className="w-[14px] h-[14px] shrink-0" />
                <span>{labelFull}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-[#1E293B] shrink-0 space-y-0.5">
          {canSwitchToAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="w-full flex items-center gap-2.5 px-3 h-8 rounded-lg text-[13px] font-medium text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#60A5FA] transition-colors"
            >
              <ArrowLeftRight className="w-[14px] h-[14px] shrink-0" />
              Przełącz na Admin
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 h-8 rounded-lg text-[13px] font-medium text-[#94A3B8] hover:bg-[#2D1B1B] hover:text-[#F87171] transition-colors"
          >
            <LogOut className="w-[14px] h-[14px] shrink-0" />
            Wyloguj
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════
          MOBILE top header (shown only on mobile)
      ══════════════════════════════════════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#0F172A] border-b border-[#1E293B] h-14 flex items-center justify-between px-4 shadow-lg">
        <OneLinkLogo iconSize={18} textSize="text-[13px]" dark={true} />
        <button
          onClick={onSwitchLocation}
          className="flex items-center gap-1.5 text-[12px] text-[#94A3B8] bg-[#1E293B] border border-[#334155] rounded-lg px-2.5 py-1.5"
        >
          <MapPin className="w-3 h-3 text-[#475569]" />
          <span className="max-w-[120px] truncate font-medium">{locationName}</span>
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-[12px] text-[#F87171] bg-[#2D1B1B] border border-[#7F1D1D]/40 rounded-lg px-2.5 py-1.5"
        >
          <LogOut className="w-3 h-3" />
          Wyloguj
        </button>
      </header>

      {/* ══════════════════════════════════════════════════
          MOBILE bottom nav bar
      ══════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0F172A] border-t border-[#1E293B] flex items-stretch">
        {bottomMain.map(({ key, label, icon: Icon }) => {
          const isActive = activeView === key
          return (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#60A5FA]' : 'text-[#475569]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#60A5FA]' : 'text-[#475569]'}`} />
              {label}
            </button>
          )
        })}
        {bottomMore.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              bottomMore.some(i => i.key === activeView) ? 'text-[#60A5FA]' : 'text-[#475569]'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            Więcej
          </button>
        )}
      </nav>

      {/* ══════════════════════════════════════════════════
          MOBILE "More" sheet
      ══════════════════════════════════════════════════ */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-[#0F172A] rounded-t-2xl p-4 pb-8 space-y-1 border-t border-[#1E293B]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#F1F5F9]">Więcej</p>
              <button onClick={() => setMoreOpen(false)} className="text-[#475569]"><X className="w-5 h-5" /></button>
            </div>
            {bottomMore.map(({ key, labelFull, icon: Icon }) => {
              const isActive = activeView === key
              return (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  className={`w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[14px] font-medium transition-colors ${
                    isActive ? 'bg-[#1E3A5F] text-[#60A5FA]' : 'text-[#94A3B8] hover:bg-[#1E293B]'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {labelFull}
                </button>
              )
            })}
            {canSwitchToAdmin && (
              <div className="pt-2 mt-1 border-t border-[#1E293B]">
                <button
                  onClick={() => router.push('/admin')}
                  className="w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[14px] font-medium text-[#60A5FA] bg-[#1E3A5F] hover:bg-[#1E3A5F]/80 transition-colors"
                >
                  <ArrowLeftRight className="w-5 h-5 shrink-0" />
                  Przełącz na panel Admin
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
