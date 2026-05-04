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
  ArrowLeftRight, Brain, TrendingUp, Sparkles, MoreHorizontal, X,
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

  const canSwitchToOps = ['superadmin', 'owner'].includes(userRole)

  const navGroups = [
    {
      label: pl ? 'Przegląd' : 'Overview',
      items: [
        { key: 'dashboard',       label: 'Dashboard',                       icon: LayoutDashboard },
        { key: 'pnl',             label: 'P&L',                             icon: BarChart3 },
        { key: 'cfo_director',    label: pl ? 'CFO Dyrektor AI'    : 'AI CFO Director',      icon: Brain },
        { key: 'sales_director',  label: pl ? 'Dyrektor Sprzedaży' : 'Sales Director',       icon: TrendingUp },
        { key: 'hr_ai_director',  label: pl ? 'Dyrektor HR AI'     : 'AI HR Director',       icon: Users },
        { key: 'investor_director',label: pl ? 'Dyrektor Inwestorski' : 'Investor Director', icon: BarChart3 },
        { key: 'what_if',         label: pl ? 'Co jeśli…'          : 'What if…',             icon: Sparkles },
        { key: 'revenue_forecast',label: pl ? 'Prognoza przychodów': 'Revenue Forecast',     icon: TrendingUp },
        { key: 'notifications',   label: pl ? 'Powiadomienia'       : 'Notifications',        icon: Bell, badge: unreadNotifications },
      ],
    },
    {
      label: 'Menu',
      items: [
        { key: 'ingredients',      label: pl ? 'Składniki'       : 'Ingredients',       icon: FileText },
        { key: 'dishes',           label: pl ? 'Receptury'       : 'Recipes',           icon: ClipboardList },
        { key: 'menu_calculator',  label: pl ? 'Kalkulator ceny' : 'Price Calculator',  icon: DollarSign },
        { key: 'menu_pricing',     label: pl ? 'Wycena menu'     : 'Menu Pricing',      icon: BarChart3 },
        { key: 'menu_engineering', label: pl ? 'Inżynieria menu' : 'Menu Engineering',  icon: BarChart3 },
      ],
    },
    {
      label: pl ? 'Magazyn' : 'Warehouse',
      items: [
        { key: 'products',             label: pl ? 'Produkty'     : 'Products',            icon: Package },
        { key: 'central_warehouse',    label: pl ? 'Stan magazynu': 'Stock Levels',         icon: Truck },
        { key: 'warehouse_deviations', label: pl ? 'Odchylenia'   : 'Deviations',           icon: AlertTriangle },
      ],
    },
    {
      label: pl ? 'Zatwierdzenia' : 'Approvals',
      items: [
        { key: 'daily_reports',      label: pl ? 'Raporty dzienne' : 'Daily Reports',   icon: FileText },
        { key: 'approvals',          label: pl ? 'Faktury'         : 'Invoices',         icon: Receipt,     badge: pendingInvoiceCount },
        { key: 'inv_approvals',      label: pl ? 'Inwentaryzacje'  : 'Inventories',      icon: CheckSquare, badge: pendingInventoryCount },
        { key: 'semis_verification', label: 'SEMIS',                                     icon: RefreshCw },
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
        { key: 'reports',    label: pl ? 'Raporty'      : 'Reports',       icon: BarChart3 },
        { key: 'history',    label: pl ? 'Historia'     : 'History',       icon: History },
        { key: 'imported',   label: pl ? 'Import Excel' : 'Excel Import',  icon: FileSpreadsheet },
        { key: 'csv_import', label: 'Import CSV',                          icon: FileSpreadsheet },
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
        { key: 'hr_dashboard',   label: pl ? 'Dashboard HR'   : 'HR Dashboard',    icon: LayoutGrid    },
        { key: 'hr_attendance',  label: pl ? 'Ewidencja'      : 'Attendance',       icon: Clock         },
        { key: 'hr_leave',       label: pl ? 'Urlopy'         : 'Leave',            icon: Umbrella      },
        { key: 'hr_swaps',       label: pl ? 'Zamiany zmian'  : 'Shift Swaps',      icon: GitCompare    },
        { key: 'hr_certs',       label: pl ? 'Certyfikaty'    : 'Certificates',     icon: GraduationCap },
        { key: 'hr_documents',   label: pl ? 'Dokumenty'      : 'Documents',        icon: FolderOpen    },
        { key: 'hr_tips',        label: pl ? 'Napiwki'        : 'Tips',             icon: Banknote      },
        { key: 'hr_onboarding',  label: 'Onboarding',                               icon: UserCheck     },
      ],
    },
    {
      label: 'Admin',
      items: [
        { key: 'employees',   label: pl ? 'Pracownicy'      : 'Employees',         icon: Users },
        { key: 'monthclose',  label: pl ? 'Zamknięcie m-ca' : 'Month Close',        icon: Lock },
        { key: 'admin_users', label: pl ? 'Użytkownicy'     : 'Users',              icon: BarChart3 },
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

  // Mobile bottom bar — 4 quick items + More
  const MOBILE_MAIN = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'pnl',       label: 'P&L',       icon: BarChart3 },
    { key: 'approvals', label: pl ? 'Faktury' : 'Invoices', icon: Receipt, badge: pendingInvoiceCount },
    { key: 'hr_attendance', label: 'HR', icon: Users },
  ]

  // All nav items flattened for the More sheet
  const allNavItems = navGroups.flatMap(g => g.items)

  const navigate = (key: string) => {
    onNavigate(key)
    setMoreOpen(false)
  }

  return (
    <>
      {/* ══════════════════════════════════════════════════
          DESKTOP sidebar (hidden on mobile)
      ══════════════════════════════════════════════════ */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[216px] bg-white border-r border-[#E5E7EB] flex-col overflow-y-auto z-30">

        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[#E5E7EB] shrink-0">
          <OneLinkLogo iconSize={22} textSize="text-[14px]" dark={false} />
          {subscriptionPlan && (
            <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#DBEAFE] text-[#2563EB] uppercase tracking-wide">
              {subscriptionPlan}
            </span>
          )}
        </div>

        {/* User row */}
        <div className="px-5 py-3 border-b border-[#E5E7EB] shrink-0">
          <p className="text-[13px] font-medium text-[#111827] truncate">{adminName}</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">{pl ? 'Administrator' : 'Administrator'}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={gi} className="mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] px-3 pt-3 pb-1.5">
                {group.label}
              </p>
              {group.items.map(({ key, label, icon: Icon, badge }) => {
                const locked   = isItemLocked(key)
                const isActive = activeView === key || activeView.startsWith(key + '_')
                return (
                  <button
                    key={key}
                    disabled={locked}
                    onClick={() => { if (!locked) onNavigate(key) }}
                    className={[
                      'relative w-full flex items-center gap-2.5 px-3 h-8 rounded-md text-[13px] font-medium transition-colors duration-100',
                      isActive
                        ? 'bg-[#EFF6FF] text-[#2563EB]'
                        : 'text-[#374151] hover:bg-[#F9FAFB] hover:text-[#111827]',
                      locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#2563EB]" />
                    )}
                    <Icon className="w-[15px] h-[15px] shrink-0" />
                    <span className="truncate">{label}</span>
                    {locked && <Lock className="w-2.5 h-2.5 ml-auto text-[#9CA3AF]" />}
                    {!locked && badge !== undefined && badge > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#DC2626] text-white text-[10px] font-bold px-1">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-[#E5E7EB] shrink-0 space-y-0.5">
          {/* Language switcher */}
          <div className="px-1 pb-1">
            <LanguageSwitcher variant="light" className="w-full" />
          </div>

          {/* Mode switcher — only for superadmin / owner */}
          {canSwitchToOps && (
            <>
              <div className="flex items-center gap-1 p-1 mb-1 rounded-lg bg-[#F3F4F6]">
                <span className="flex-1 flex items-center justify-center h-6 rounded-md bg-white shadow-sm text-[11px] font-bold text-[#2563EB] border border-[#E5E7EB]">
                  Admin
                </span>
                <button
                  onClick={() => router.push('/ops')}
                  className="flex-1 flex items-center justify-center h-6 rounded-md text-[11px] font-medium text-[#6B7280] hover:bg-white hover:text-[#374151] hover:shadow-sm transition-all"
                >
                  OPS
                </button>
              </div>
              <button
                onClick={() => router.push('/ops')}
                className="w-full flex items-center gap-2.5 px-3 h-8 rounded-md text-[13px] font-medium text-[#6B7280] hover:bg-[#F0FDF4] hover:text-[#16A34A] transition-colors"
              >
                <ArrowLeftRight className="w-[15px] h-[15px] shrink-0" />
                {pl ? 'Przełącz na OPS' : 'Switch to OPS'}
              </button>
            </>
          )}
          <button
            onClick={() => onNavigate('settings')}
            className={[
              'relative w-full flex items-center gap-2.5 px-3 h-8 rounded-md text-[13px] font-medium transition-colors duration-100 cursor-pointer',
              activeView === 'settings' || activeView === 'account'
                ? 'bg-[#EFF6FF] text-[#2563EB]'
                : 'text-[#374151] hover:bg-[#F9FAFB] hover:text-[#111827]',
            ].join(' ')}
          >
            {(activeView === 'settings' || activeView === 'account') && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#2563EB]" />
            )}
            <Settings className="w-[15px] h-[15px] shrink-0" />
            <span>{pl ? 'Ustawienia' : 'Settings'}</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 h-8 rounded-md text-[13px] font-medium text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors"
          >
            <LogOut className="w-[15px] h-[15px] shrink-0" />
            {pl ? 'Wyloguj' : 'Log out'}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════
          MOBILE top header (shown only on mobile)
      ══════════════════════════════════════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-[#E5E7EB] h-14 flex items-center justify-between px-4 shadow-sm">
        <OneLinkLogo iconSize={18} textSize="text-[13px]" dark={false} />

        <div className="flex items-center gap-2">
          {/* Notification badge */}
          {unreadNotifications > 0 && (
            <button
              onClick={() => navigate('notifications')}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"
            >
              <Bell className="w-4 h-4 text-[#374151]" />
              <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-[#DC2626] text-white text-[9px] font-bold">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            </button>
          )}
          {/* User initials */}
          <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center">
            <span className="text-[12px] font-bold text-[#2563EB]">
              {adminName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════
          MOBILE bottom nav bar
      ══════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E5E7EB] flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {MOBILE_MAIN.map(({ key, label, icon: Icon, badge }) => {
          const isActive = activeView === key || activeView.startsWith(key + '_')
          return (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#2563EB]' : 'text-[#6B7280]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`} />
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
        {/* More */}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
            !MOBILE_MAIN.some(i => activeView === i.key || activeView.startsWith(i.key + '_')) && activeView !== ''
              ? 'text-[#2563EB]' : 'text-[#6B7280]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 text-[#9CA3AF]" />
          {pl ? 'Więcej' : 'More'}
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════
          MOBILE "More" bottom sheet
      ══════════════════════════════════════════════════ */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
            {/* Handle */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#F3F4F6] sticky top-0 bg-white">
              <div>
                <p className="text-[13px] font-semibold text-[#111827]">{adminName}</p>
                <p className="text-[11px] text-[#6B7280]">Administrator{subscriptionPlan ? ` · ${subscriptionPlan}` : ''}</p>
              </div>
              <button onClick={() => setMoreOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F3F4F6] text-[#6B7280]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 py-2 space-y-0.5">
              {navGroups.map((group, gi) => (
                <div key={gi} className="mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] px-3 pt-3 pb-1.5">{group.label}</p>
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
                          isActive ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#374151] hover:bg-[#F9FAFB]',
                          locked ? 'opacity-40 cursor-not-allowed' : '',
                        ].join(' ')}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="flex-1 text-left">{label}</span>
                        {locked && <Lock className="w-4 h-4 text-[#9CA3AF]" />}
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

              {/* Settings + Switch + Logout */}
              <div className="pt-2 mt-1 border-t border-[#F3F4F6] space-y-0.5">
                <LanguageSwitcher variant="light" className="w-full px-3 h-12" />

                {canSwitchToOps && (
                  <button
                    onClick={() => { setMoreOpen(false); router.push('/ops') }}
                    className="w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[14px] font-medium text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] transition-colors"
                  >
                    <ArrowLeftRight className="w-5 h-5 shrink-0" />
                    {pl ? 'Przełącz na OPS' : 'Switch to OPS'}
                  </button>
                )}

                <button
                  onClick={() => navigate('settings')}
                  className={`w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[14px] font-medium transition-colors ${
                    activeView === 'settings' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#374151] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <Settings className="w-5 h-5 shrink-0" />
                  {pl ? 'Ustawienia' : 'Settings'}
                </button>

                <button
                  onClick={() => { setMoreOpen(false); onLogout() }}
                  className="w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[14px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
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
