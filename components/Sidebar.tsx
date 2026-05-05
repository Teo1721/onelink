'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OneLinkLogo } from "@/components/onelink-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/lib/i18n";
import {
  LayoutDashboard, FileText, Receipt, ClipboardList, Package,
  Calendar, RefreshCw, Lock, BarChart3, History, FileSpreadsheet,
  LogOut, Bell, CheckSquare, DollarSign, AlertTriangle, Truck, Users, Settings,
  Clock, Umbrella, GitCompare, GraduationCap, FolderOpen, LayoutGrid, Banknote, UserCheck,
  ArrowLeftRight, Brain, TrendingUp, Sparkles, MoreHorizontal, X, ChevronDown, ChevronRight,
} from 'lucide-react'

type SidebarProps = {
  adminName: string
  activeView: string
  onNavigate: (view: string) => void
  onLogout: () => void
  pendingInvoiceCount?: number
  pendingInventoryCount?: number
  unreadNotifications?: number
  subscriptionPlan?: string | null
  userRole?: string
}

export function Sidebar({
  adminName,
  activeView,
  onNavigate,
  onLogout,
  pendingInvoiceCount = 0,
  pendingInventoryCount = 0,
  unreadNotifications = 0,
  subscriptionPlan,
  userRole = '',
}: SidebarProps) {
  const router = useRouter()
  const { lang } = useLanguage()
  const pl = lang === 'pl'
  const [moreOpen, setMoreOpen] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const canSwitchToOps = ['superadmin', 'owner'].includes(userRole)

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const navGroups = [
    {
      label: pl ? 'Przegląd' : 'Overview',
      items: [
        { key: 'dashboard',       label: 'Dashboard',                       icon: LayoutDashboard },
        { key: 'pnl',             label: 'P&L',                             icon: BarChart3 },
        { key: 'notifications',   label: pl ? 'Powiadomienia' : 'Notifications', icon: Bell, badge: unreadNotifications },
      ],
    },
    {
      label: pl ? 'AI Dyrektorzy' : 'AI Directors',
      items: [
        { key: 'cfo_director',    label: pl ? 'CFO Dyrektor AI'    : 'AI CFO Director',   icon: Brain },
        { key: 'sales_director',  label: pl ? 'Sprzedaż AI'        : 'Sales Director',    icon: TrendingUp },
        { key: 'hr_ai_director',  label: pl ? 'HR AI'              : 'AI HR Director',    icon: Users },
        { key: 'investor_director',label: pl ? 'Inwestorski AI'    : 'Investor Director', icon: BarChart3 },
        { key: 'what_if',         label: pl ? 'Co jeśli…'          : 'What if…',          icon: Sparkles },
        { key: 'revenue_forecast',label: pl ? 'Prognoza'           : 'Forecast',          icon: TrendingUp },
      ],
    },
    {
      label: 'Menu',
      items: [
        { key: 'ingredients',      label: pl ? 'Składniki'       : 'Ingredients',      icon: FileText },
        { key: 'dishes',           label: pl ? 'Receptury'       : 'Recipes',          icon: ClipboardList },
        { key: 'menu_calculator',  label: pl ? 'Kalkulator ceny' : 'Price Calculator', icon: DollarSign },
        { key: 'menu_pricing',     label: pl ? 'Wycena menu'     : 'Menu Pricing',     icon: BarChart3 },
        { key: 'menu_engineering', label: pl ? 'Inżynieria menu' : 'Menu Engineering', icon: BarChart3 },
      ],
    },
    {
      label: pl ? 'Magazyn' : 'Warehouse',
      items: [
        { key: 'products',             label: pl ? 'Produkty'     : 'Products',      icon: Package },
        { key: 'central_warehouse',    label: pl ? 'Stan magazynu': 'Stock Levels',  icon: Truck },
        { key: 'warehouse_deviations', label: pl ? 'Odchylenia'   : 'Deviations',    icon: AlertTriangle },
      ],
    },
    {
      label: pl ? 'Zatwierdzenia' : 'Approvals',
      items: [
        { key: 'daily_reports',      label: pl ? 'Raporty dzienne' : 'Daily Reports',  icon: FileText },
        { key: 'approvals',          label: pl ? 'Faktury'         : 'Invoices',        icon: Receipt,     badge: pendingInvoiceCount },
        { key: 'inv_approvals',      label: pl ? 'Inwentaryzacje'  : 'Inventories',     icon: CheckSquare, badge: pendingInventoryCount },
        { key: 'semis_verification', label: 'SEMIS',                                    icon: RefreshCw },
      ],
    },
    {
      label: pl ? 'Inwentaryzacja' : 'Inventory',
      items: [
        { key: 'monthly', label: pl ? 'Miesięczna' : 'Monthly', icon: Calendar },
        { key: 'weekly',  label: pl ? 'Tygodniowa' : 'Weekly',  icon: ClipboardList },
      ],
    },
    {
      label: pl ? 'Raporty' : 'Reports',
      items: [
        { key: 'reports',    label: pl ? 'Raporty'      : 'Reports',      icon: BarChart3 },
        { key: 'history',    label: pl ? 'Historia'     : 'History',      icon: History },
        { key: 'imported',   label: pl ? 'Import Excel' : 'Excel Import', icon: FileSpreadsheet },
        { key: 'csv_import', label: 'Import CSV',                         icon: FileSpreadsheet },
      ],
    },
    {
      label: pl ? 'Harmonogram' : 'Schedule',
      items: [
        { key: 'schedule', label: pl ? 'Grafik pracy' : 'Work Schedule', icon: Calendar },
      ],
    },
    {
      label: 'HR',
      items: [
        { key: 'hr_dashboard',   label: pl ? 'Dashboard HR'  : 'HR Dashboard',  icon: LayoutGrid    },
        { key: 'hr_attendance',  label: pl ? 'Ewidencja'     : 'Attendance',    icon: Clock         },
        { key: 'hr_leave',       label: pl ? 'Urlopy'        : 'Leave',         icon: Umbrella      },
        { key: 'hr_swaps',       label: pl ? 'Zamiany zmian' : 'Shift Swaps',   icon: GitCompare    },
        { key: 'hr_certs',       label: pl ? 'Certyfikaty'   : 'Certificates',  icon: GraduationCap },
        { key: 'hr_documents',   label: pl ? 'Dokumenty'     : 'Documents',     icon: FolderOpen    },
        { key: 'hr_tips',        label: pl ? 'Napiwki'       : 'Tips',          icon: Banknote      },
        { key: 'hr_onboarding',  label: 'Onboarding',                           icon: UserCheck     },
      ],
    },
    {
      label: pl ? 'Checklista' : 'Checklist',
      items: [
        { key: 'checklist', label: pl ? 'Checklista OPS' : 'OPS Checklist', icon: CheckSquare },
      ],
    },
    {
      label: 'Admin',
      items: [
        { key: 'employees',   label: pl ? 'Pracownicy'      : 'Employees',  icon: Users },
        { key: 'monthclose',  label: pl ? 'Zamknięcie m-ca' : 'Month Close', icon: Lock },
        { key: 'admin_users', label: pl ? 'Użytkownicy'     : 'Users',       icon: BarChart3 },
      ],
    },
  ]

  const plan = subscriptionPlan
  const allowedKeysByPlan: Record<string, string[]> = {
    plan1: ['dashboard', 'pnl', 'daily_reports', 'reports', 'admin_users', 'employees'],
    plan2: [
      'dashboard', 'pnl', 'notifications', 'products', 'daily_reports',
      'approvals', 'inv_approvals', 'semis_verification', 'monthly', 'weekly',
      'reports', 'history', 'imported', 'admin_users', 'employees', 'schedule',
    ],
  }
  const isLimitedPlan = plan === 'plan1' || plan === 'plan2'
  const allowedForPlan = isLimitedPlan && plan ? new Set(allowedKeysByPlan[plan] ?? []) : null
  const isItemLocked = (key: string) =>
    isLimitedPlan && allowedForPlan ? !allowedForPlan.has(key) : false

  // Mobile bottom bar
  const MOBILE_MAIN = [
    { key: 'dashboard',    label: 'Dashboard',                       icon: LayoutDashboard },
    { key: 'pnl',          label: 'P&L',                             icon: BarChart3 },
    { key: 'approvals',    label: pl ? 'Faktury' : 'Invoices',        icon: Receipt, badge: pendingInvoiceCount },
    { key: 'hr_attendance',label: 'HR',                              icon: Users },
  ]

  const allNavItems = navGroups.flatMap(g => g.items)

  const navigate = (key: string) => {
    onNavigate(key)
    setMoreOpen(false)
  }

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          DESKTOP sidebar — dark navy
      ══════════════════════════════════════════════════════════════ */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[216px] bg-[#0F172A] flex-col overflow-y-auto z-30 border-r border-[#1E293B]">

        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[#1E293B] shrink-0">
          <OneLinkLogo iconSize={22} textSize="text-[14px]" dark={true} />
          {subscriptionPlan && (
            <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#1E3A5F] text-[#60A5FA] uppercase tracking-wide">
              {subscriptionPlan}
            </span>
          )}
        </div>

        {/* User row */}
        <div className="px-5 py-3 border-b border-[#1E293B] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-white">{adminName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#F1F5F9] truncate">{adminName}</p>
              <p className="text-[10px] text-[#475569] mt-0.5">{pl ? 'Administrator' : 'Administrator'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {navGroups.map((group, gi) => {
            const isCollapsed = collapsedGroups[group.label]
            return (
              <div key={gi} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 pt-3 pb-1.5 group"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] group-hover:text-[#64748B] transition-colors">
                    {group.label}
                  </p>
                  {isCollapsed
                    ? <ChevronRight className="w-3 h-3 text-[#334155]" />
                    : <ChevronDown  className="w-3 h-3 text-[#334155]" />
                  }
                </button>
                {!isCollapsed && group.items.map(({ key, label, icon: Icon, badge }) => {
                  const locked   = isItemLocked(key)
                  const isActive = activeView === key || activeView.startsWith(key + '_')
                  return (
                    <button
                      key={key}
                      disabled={locked}
                      onClick={() => { if (!locked) onNavigate(key) }}
                      className={[
                        'relative w-full flex items-center gap-2.5 px-3 h-8 rounded-lg text-[13px] font-medium transition-all duration-100',
                        isActive
                          ? 'bg-[#1E3A5F] text-[#60A5FA]'
                          : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#E2E8F0]',
                        locked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
                      ].join(' ')}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#3B82F6]" />
                      )}
                      <Icon className="w-[14px] h-[14px] shrink-0" />
                      <span className="truncate">{label}</span>
                      {locked && <Lock className="w-2.5 h-2.5 ml-auto text-[#334155]" />}
                      {!locked && badge !== undefined && badge > 0 && (
                        <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#DC2626] text-white text-[10px] font-bold px-1">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-[#1E293B] shrink-0 space-y-0.5">
          <div className="px-1 pb-1">
            <LanguageSwitcher variant="dark" className="w-full" />
          </div>

          {canSwitchToOps && (
            <button
              onClick={() => router.push('/ops')}
              className="w-full flex items-center gap-2.5 px-3 h-8 rounded-lg text-[13px] font-medium text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#34D399] transition-colors"
            >
              <ArrowLeftRight className="w-[14px] h-[14px] shrink-0" />
              {pl ? 'Przełącz na OPS' : 'Switch to OPS'}
            </button>
          )}

          <button
            onClick={() => onNavigate('settings')}
            className={[
              'relative w-full flex items-center gap-2.5 px-3 h-8 rounded-lg text-[13px] font-medium transition-all cursor-pointer',
              activeView === 'settings' || activeView === 'account'
                ? 'bg-[#1E3A5F] text-[#60A5FA]'
                : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#E2E8F0]',
            ].join(' ')}
          >
            {(activeView === 'settings' || activeView === 'account') && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#3B82F6]" />
            )}
            <Settings className="w-[14px] h-[14px] shrink-0" />
            <span>{pl ? 'Ustawienia' : 'Settings'}</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 h-8 rounded-lg text-[13px] font-medium text-[#94A3B8] hover:bg-[#2D1B1B] hover:text-[#F87171] transition-colors"
          >
            <LogOut className="w-[14px] h-[14px] shrink-0" />
            {pl ? 'Wyloguj' : 'Log out'}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE top header
      ══════════════════════════════════════════════════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#0F172A] border-b border-[#1E293B] h-14 flex items-center justify-between px-4 shadow-lg">
        <OneLinkLogo iconSize={18} textSize="text-[13px]" dark={true} />
        <div className="flex items-center gap-2">
          {unreadNotifications > 0 && (
            <button
              onClick={() => navigate('notifications')}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[#1E293B] border border-[#334155]"
            >
              <Bell className="w-4 h-4 text-[#94A3B8]" />
              <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-[#DC2626] text-white text-[9px] font-bold">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center">
            <span className="text-[12px] font-bold text-white">{adminName.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE bottom nav bar
      ══════════════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0F172A] border-t border-[#1E293B] flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {MOBILE_MAIN.map(({ key, label, icon: Icon, badge }) => {
          const isActive = activeView === key || activeView.startsWith(key + '_')
          return (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#60A5FA]' : 'text-[#475569]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#60A5FA]' : 'text-[#475569]'}`} />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[#DC2626] text-white text-[8px] font-bold px-0.5">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              {label}
            </button>
          )
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
            !MOBILE_MAIN.some(i => activeView === i.key || activeView.startsWith(i.key + '_')) && activeView !== ''
              ? 'text-[#60A5FA]' : 'text-[#475569]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          {pl ? 'Więcej' : 'More'}
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE "More" sheet
      ══════════════════════════════════════════════════════════════ */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-[#0F172A] rounded-t-2xl max-h-[85vh] overflow-y-auto border-t border-[#1E293B]" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#1E293B] sticky top-0 bg-[#0F172A]">
              <div>
                <p className="text-[13px] font-semibold text-[#F1F5F9]">{adminName}</p>
                <p className="text-[11px] text-[#475569]">Administrator{subscriptionPlan ? ` · ${subscriptionPlan}` : ''}</p>
              </div>
              <button onClick={() => setMoreOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1E293B] text-[#94A3B8]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-2 space-y-0.5">
              {navGroups.map((group, gi) => (
                <div key={gi} className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] px-3 pt-3 pb-1.5">{group.label}</p>
                  {group.items.map(({ key, label, icon: Icon, badge }) => {
                    const locked = isItemLocked(key)
                    const isActive = activeView === key || activeView.startsWith(key + '_')
                    return (
                      <button
                        key={key}
                        disabled={locked}
                        onClick={() => { if (!locked) navigate(key) }}
                        className={[
                          'w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[14px] font-medium transition-colors',
                          isActive ? 'bg-[#1E3A5F] text-[#60A5FA]' : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#E2E8F0]',
                          locked ? 'opacity-30 cursor-not-allowed' : '',
                        ].join(' ')}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="flex-1 text-left">{label}</span>
                        {locked && <Lock className="w-4 h-4 text-[#334155]" />}
                        {!locked && badge !== undefined && badge > 0 && (
                          <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[#DC2626] text-white text-[10px] font-bold px-1">
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}

              <div className="pt-2 mt-1 border-t border-[#1E293B] space-y-0.5">
                <LanguageSwitcher variant="dark" className="w-full px-3 h-12" />
                {canSwitchToOps && (
                  <button
                    onClick={() => { setMoreOpen(false); router.push('/ops') }}
                    className="w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[14px] font-medium text-[#34D399] bg-[#064E3B]/30 hover:bg-[#064E3B]/50 transition-colors"
                  >
                    <ArrowLeftRight className="w-5 h-5 shrink-0" />
                    {pl ? 'Przełącz na OPS' : 'Switch to OPS'}
                  </button>
                )}
                <button
                  onClick={() => navigate('settings')}
                  className={`w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[14px] font-medium transition-colors ${
                    activeView === 'settings' ? 'bg-[#1E3A5F] text-[#60A5FA]' : 'text-[#94A3B8] hover:bg-[#1E293B]'
                  }`}
                >
                  <Settings className="w-5 h-5 shrink-0" />
                  {pl ? 'Ustawienia' : 'Settings'}
                </button>
                <button
                  onClick={() => { setMoreOpen(false); onLogout() }}
                  className="w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[14px] font-medium text-[#F87171] hover:bg-[#2D1B1B] transition-colors"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  {pl ? 'Wyloguj' : 'Log out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
