'use client'

import { useState } from 'react'
import { OneLinkLogo } from "@/components/onelink-logo";
import {
  LayoutDashboard, FileText, ClipboardList, LogOut, MapPin,
  Calendar, Users, Settings, CalendarDays, MoreHorizontal, X,
} from 'lucide-react'

type OpsSidebarProps = {
  locationName: string
  activeView: string
  onNavigate: (view: string) => void
  onLogout: () => void
  onSwitchLocation: () => void
}

const NAV_ITEMS = [
  { key: 'reporting',    label: 'Raport',      labelFull: 'Raport dzienny',  icon: LayoutDashboard },
  { key: 'invoices',     label: 'Faktury',     labelFull: 'Faktury',         icon: FileText },
  { key: 'inventory',   label: 'Inwent.',     labelFull: 'Inwentaryzacja',   icon: ClipboardList },
  { key: 'scheduling',  label: 'Harmonogram', labelFull: 'Harmonogram',      icon: Calendar },
  { key: 'my_schedule', label: 'Mój grafik',  labelFull: 'Mój grafik',       icon: CalendarDays },
  { key: 'employees',   label: 'Pracownicy',  labelFull: 'Pracownicy',       icon: Users },
  { key: 'account',     label: 'Konto',       labelFull: 'Konto',            icon: Settings },
]

// Bottom bar shows first 4 + "More"
const BOTTOM_MAIN = NAV_ITEMS.slice(0, 4)
const BOTTOM_MORE = NAV_ITEMS.slice(4)

export function OpsSidebar({
  locationName,
  activeView,
  onNavigate,
  onLogout,
  onSwitchLocation,
}: OpsSidebarProps) {
  const [moreOpen, setMoreOpen] = useState(false)

  const navigate = (key: string) => {
    onNavigate(key)
    setMoreOpen(false)
  }

  return (
    <>
      {/* ══════════════════════════════════════════════════
          DESKTOP sidebar (hidden on mobile)
      ══════════════════════════════════════════════════ */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-[#E5E7EB] flex-col z-30">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[#E5E7EB] shrink-0">
          <OneLinkLogo iconSize={22} textSize="text-[14px]" dark={false} />
        </div>

        {/* Location switcher */}
        <button
          onClick={onSwitchLocation}
          className="flex items-center gap-2 px-5 py-3 border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors text-left w-full shrink-0"
        >
          <MapPin className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Lokal</p>
            <p className="text-[13px] font-medium text-[#111827] truncate max-w-[140px]">{locationName}</p>
          </div>
        </button>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] px-3 pb-1.5">Menu</p>
          {NAV_ITEMS.map(({ key, labelFull, icon: Icon }) => {
            const isActive = activeView === key
            return (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className={[
                  'relative w-full flex items-center gap-2.5 px-3 h-8 rounded-md text-[13px] font-medium transition-colors duration-100 cursor-pointer',
                  isActive ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#374151] hover:bg-[#F9FAFB] hover:text-[#111827]',
                ].join(' ')}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#2563EB]" />}
                <Icon className="w-[15px] h-[15px] shrink-0" />
                <span>{labelFull}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-[#E5E7EB] shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 h-8 rounded-md text-[13px] font-medium text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors"
          >
            <LogOut className="w-[15px] h-[15px] shrink-0" />
            Wyloguj
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════
          MOBILE top header (shown only on mobile)
      ══════════════════════════════════════════════════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-[#E5E7EB] h-14 flex items-center justify-between px-4">
        <OneLinkLogo iconSize={18} textSize="text-[13px]" dark={false} />
        <button
          onClick={onSwitchLocation}
          className="flex items-center gap-1.5 text-[12px] text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2.5 py-1.5"
        >
          <MapPin className="w-3 h-3 text-[#6B7280]" />
          <span className="max-w-[120px] truncate font-medium">{locationName}</span>
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-[12px] text-red-500 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5"
        >
          <LogOut className="w-3 h-3" />
          Wyloguj
        </button>
      </header>

      {/* ══════════════════════════════════════════════════
          MOBILE bottom nav bar
      ══════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E5E7EB] flex items-stretch">
        {BOTTOM_MAIN.map(({ key, label, icon: Icon }) => {
          const isActive = activeView === key
          return (
            <button
              key={key}
              onClick={() => navigate(key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#2563EB]' : 'text-[#6B7280]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`} />
              {label}
            </button>
          )
        })}
        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
            BOTTOM_MORE.some(i => i.key === activeView) ? 'text-[#2563EB]' : 'text-[#6B7280]'
          }`}
        >
          <MoreHorizontal className={`w-5 h-5 ${BOTTOM_MORE.some(i => i.key === activeView) ? 'text-[#2563EB]' : 'text-[#9CA3AF]'}`} />
          Więcej
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════
          MOBILE "More" sheet
      ══════════════════════════════════════════════════ */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-white rounded-t-2xl p-4 pb-8 space-y-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#111827]">Więcej</p>
              <button onClick={() => setMoreOpen(false)} className="text-[#6B7280]"><X className="w-5 h-5" /></button>
            </div>
            {BOTTOM_MORE.map(({ key, labelFull, icon: Icon }) => {
              const isActive = activeView === key
              return (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  className={`w-full flex items-center gap-3 px-3 h-12 rounded-xl text-[14px] font-medium transition-colors ${
                    isActive ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#374151] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {labelFull}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
