"use client";

import { useState } from "react";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { useLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  BarChart3, TrendingUp, TrendingDown, Users, Package,
  Bell, ArrowRight, CheckCircle, AlertTriangle, DollarSign,
  Calendar, Clock, ChevronUp, ChevronDown, Zap, Brain,
  FileText, ShoppingCart, Home, Settings,
} from "lucide-react";

/* ── fake data ─────────────────────────────────────── */

const LOCATIONS = ["Centrum", "Mokotów", "Wilanów"];

const DAILY_DATA = [
  { day: "Pon", revenue: 4200, costs: 2940, target: 4000 },
  { day: "Wt",  revenue: 3800, costs: 2660, target: 4000 },
  { day: "Śr",  revenue: 5100, costs: 3315, target: 4000 },
  { day: "Czw", revenue: 4600, costs: 3220, target: 4000 },
  { day: "Pt",  revenue: 6200, costs: 3906, target: 4000 },
  { day: "Sob", revenue: 7400, costs: 4440, target: 4000 },
  { day: "Nd",  revenue: 5900, costs: 3835, target: 4000 },
];

const EMPLOYEES = [
  { name: "Katarzyna W.", role: "Kelnerka", status: "in", since: "08:02", hours: "7h 14m" },
  { name: "Paweł M.",     role: "Kucharz",  status: "in", since: "07:45", hours: "7h 31m" },
  { name: "Marta S.",     role: "Barmanka", status: "out", since: "16:00", hours: "8h 00m" },
  { name: "Tomasz R.",    role: "Manager",  status: "in", since: "09:00", hours: "6h 16m" },
  { name: "Anna K.",      role: "Kelnerka", status: "break", since: "14:30", hours: "5h 46m" },
];

const ALERTS = [
  { type: "warning", title: "Food cost przekroczył próg", desc: "Food cost dziś: 32.4% (próg: 30%). Sprawdź receptury lub zamówienia.", time: "przed 2h" },
  { type: "info",    title: "Grafik na przyszły tydzień", desc: "Brakuje obsady w poniedziałek rano (07:00–10:00). Zatwierdź grafik.", time: "przed 4h" },
  { type: "success", title: "Cel tygodniowy osiągnięty", desc: "Przychody tygodniowe: 37 200 zł — 107% celu. Świetny wynik!", time: "dziś" },
];

const PRODUCTS = [
  { name: "Mąka pszenna T500", unit: "kg", stock: 12, min: 20, cost: 2.40 },
  { name: "Masło extra 82%",  unit: "kg", stock: 4,  min: 8,  cost: 18.90 },
  { name: "Jajka L",         unit: "szt", stock: 180, min: 100, cost: 0.62 },
  { name: "Mleko 3.2%",      unit: "l",  stock: 8,  min: 15, cost: 3.20 },
  { name: "Cukier biały",    unit: "kg", stock: 35, min: 10, cost: 3.10 },
];

/* ── chart ─────────────────────────────────────────── */
function BarChart({ data }: { data: typeof DAILY_DATA }) {
  const max = Math.max(...data.map(d => d.revenue));
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: 96 }}>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-[#1D4ED8] to-[#06B6D4] transition-all duration-500"
              style={{ height: `${(d.revenue / max) * 96}px` }}
            />
          </div>
          <span className="text-[9px] text-[#9CA3AF]">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

/* ── panels ─────────────────────────────────────────── */

function OverviewPanel({ loc }: { loc: string }) {
  const revenue = loc === "Centrum" ? 37200 : loc === "Mokotów" ? 29800 : 22400;
  const margin = loc === "Centrum" ? 36.2 : loc === "Mokotów" ? 34.8 : 31.1;
  const foodCost = loc === "Centrum" ? 32.4 : loc === "Mokotów" ? 29.8 : 33.2;
  const laborCost = loc === "Centrum" ? 18.4 : loc === "Mokotów" ? 20.1 : 22.3;
  const todayRev = loc === "Centrum" ? 5900 : loc === "Mokotów" ? 4200 : 3100;
  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Przychód tygodnia", value: `${revenue.toLocaleString('pl-PL')} zł`, delta: "+7%", up: true, icon: TrendingUp, color: "#10B981" },
          { label: "Marża operacyjna", value: `${margin}%`, delta: "+1.2pp", up: true, icon: BarChart3, color: "#1D4ED8" },
          { label: "Food cost",        value: `${foodCost}%`, delta: foodCost > 31 ? "+2.4pp" : "-0.8pp", up: foodCost > 31, icon: ShoppingCart, color: foodCost > 31 ? "#EF4444" : "#10B981" },
          { label: "Przychód dziś",    value: `${todayRev.toLocaleString('pl-PL')} zł`, delta: "+12%", up: true, icon: DollarSign, color: "#F59E0B" },
        ].map(({ label, value, delta, up, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-[#F3F4F6] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#9CA3AF] font-medium">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <div className="text-[20px] font-black text-[#111827]">{value}</div>
            <div className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${up ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {delta} <span className="text-[#9CA3AF] font-normal">vs ostatni tydzień</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-5 border border-[#F3F4F6] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-bold text-[#111827]">Przychody — ostatnie 7 dni</p>
            <p className="text-[11px] text-[#9CA3AF]">Cel dzienny: 4 000 zł</p>
          </div>
          <span className="text-[11px] font-semibold text-[#10B981] bg-green-50 px-2.5 py-1 rounded-full">+7% vs zeszły tydzień</span>
        </div>
        <BarChart data={DAILY_DATA} />
      </div>

      {/* P&L summary */}
      <div className="bg-white rounded-xl p-5 border border-[#F3F4F6] shadow-sm">
        <p className="text-[13px] font-bold text-[#111827] mb-4">P&L tygodnia</p>
        <div className="space-y-2.5">
          {[
            { label: "Przychody", value: revenue, pct: null, color: "#10B981" },
            { label: "Food cost",  value: -Math.round(revenue * foodCost / 100), pct: foodCost, color: "#EF4444" },
            { label: "Koszty pracy", value: -Math.round(revenue * laborCost / 100), pct: laborCost, color: "#F59E0B" },
            { label: "Koszty stałe", value: -Math.round(revenue * 0.14), pct: 14, color: "#6B7280" },
          ].map(({ label, value, pct, color }) => (
            <div key={label} className="flex items-center justify-between text-[13px]">
              <span className="text-[#374151]">{label}</span>
              <div className="flex items-center gap-3">
                {pct && <span className="text-[11px] text-[#9CA3AF]">{pct}%</span>}
                <span className="font-semibold" style={{ color }}>{value > 0 ? '+' : ''}{value.toLocaleString('pl-PL')} zł</span>
              </div>
            </div>
          ))}
          <div className="border-t border-[#F3F4F6] pt-2.5 flex items-center justify-between text-[13px] font-bold">
            <span className="text-[#111827]">Marża operacyjna</span>
            <span className="text-[#1D4ED8]">+{Math.round(revenue * margin / 100).toLocaleString('pl-PL')} zł ({margin}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeesPanel() {
  return (
    <div className="bg-white rounded-xl border border-[#F3F4F6] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#111827]">Pracownicy na zmianie dziś</p>
        <span className="text-[11px] font-semibold text-white bg-[#10B981] px-2.5 py-1 rounded-full">
          {EMPLOYEES.filter(e => e.status === 'in').length} / {EMPLOYEES.length} obecnych
        </span>
      </div>
      <div className="divide-y divide-[#F9FAFB]">
        {EMPLOYEES.map((e) => (
          <div key={e.name} className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] flex items-center justify-center text-white text-[12px] font-bold">
                {e.name.charAt(0)}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#111827]">{e.name}</div>
                <div className="text-[11px] text-[#9CA3AF]">{e.role}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-[11px] text-[#9CA3AF]">od {e.since}</div>
                <div className="text-[12px] font-semibold text-[#374151]">{e.hours}</div>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                e.status === 'in' ? 'bg-green-100 text-green-700' :
                e.status === 'break' ? 'bg-amber-100 text-amber-700' :
                'bg-[#F3F4F6] text-[#9CA3AF]'
              }`}>
                {e.status === 'in' ? 'Na zmianie' : e.status === 'break' ? 'Przerwa' : 'Po zmianie'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InventoryPanel() {
  return (
    <div className="bg-white rounded-xl border border-[#F3F4F6] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#111827]">Stany magazynowe</p>
        <span className="text-[11px] font-semibold text-[#EF4444] bg-red-50 px-2.5 py-1 rounded-full">
          2 produkty poniżej minimum
        </span>
      </div>
      <div className="divide-y divide-[#F9FAFB]">
        {PRODUCTS.map((p) => {
          const low = p.stock < p.min;
          const pct = Math.min(100, Math.round((p.stock / p.min) * 100));
          return (
            <div key={p.name} className="px-5 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[13px] font-semibold text-[#111827]">{p.name}</div>
                  <div className="text-[11px] text-[#9CA3AF]">min. {p.min} {p.unit} · {p.cost} zł / {p.unit}</div>
                </div>
                <div className="text-right">
                  <span className={`text-[14px] font-black ${low ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
                    {p.stock} {p.unit}
                  </span>
                  {low && <div className="text-[10px] text-[#EF4444] font-semibold">ZAMÓW</div>}
                </div>
              </div>
              <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${low ? 'bg-[#EF4444]' : 'bg-[#10B981]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlertsPanel() {
  return (
    <div className="space-y-3">
      {ALERTS.map((a, i) => (
        <div key={i} className={`rounded-xl p-4 border flex gap-3 ${
          a.type === 'warning' ? 'bg-amber-50 border-amber-200' :
          a.type === 'success' ? 'bg-green-50 border-green-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          {a.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" /> :
           a.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" /> :
           <Bell className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-[#111827]">{a.title}</p>
              <span className="text-[11px] text-[#9CA3AF]">{a.time}</span>
            </div>
            <p className="text-[12px] text-[#6B7280] mt-0.5">{a.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── main page ──────────────────────────────────────── */

const TABS_PL = [
  { id: "overview",   icon: Home,      label: "Przegląd" },
  { id: "employees",  icon: Users,     label: "Pracownicy" },
  { id: "inventory",  icon: Package,   label: "Magazyn" },
  { id: "alerts",     icon: Bell,      label: "Alerty AI" },
];
const TABS_EN = [
  { id: "overview",   icon: Home,      label: "Overview" },
  { id: "employees",  icon: Users,     label: "Employees" },
  { id: "inventory",  icon: Package,   label: "Inventory" },
  { id: "alerts",     icon: Bell,      label: "AI Alerts" },
];

export default function DemoPage() {
  const { lang } = useLanguage();
  const pl = lang === 'pl';
  const [activeTab, setActiveTab] = useState("overview");
  const [activeLoc, setActiveLoc] = useState("Centrum");
  const TABS = pl ? TABS_PL : TABS_EN;

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[#F3F4F6]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo className="h-7" /></Link>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              {pl ? 'DEMO — dane przykładowe' : 'DEMO — sample data'}
            </span>
            <LanguageSwitcher variant="light" />
            <Link href="/auth/sign-up" className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all flex items-center gap-1.5">
              {pl ? 'Zacznij za darmo' : 'Start free'} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Demo header banner */}
      <div className="bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-white px-6 py-3 text-center text-[13px]">
        <Brain className="w-4 h-4 inline mr-1.5 mb-0.5" />
        {pl
          ? 'Przeglądasz demo OneLink — wszystkie dane są przykładowe. '
          : 'You\'re viewing the OneLink demo — all data is sample data. '}
        <Link href="/auth/sign-up" className="underline font-semibold hover:opacity-80">
          {pl ? 'Zacznij darmowy trial →' : 'Start free trial →'}
        </Link>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6">
        {/* Location picker + tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            {LOCATIONS.map(loc => (
              <button
                key={loc}
                onClick={() => setActiveLoc(loc)}
                className={`h-8 px-4 rounded-lg text-[13px] font-semibold transition-all ${
                  activeLoc === loc
                    ? 'bg-[#111827] text-white'
                    : 'bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#D1D5DB]'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-xl p-1">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-all ${
                  activeTab === id
                    ? 'bg-[#F0F7FF] text-[#1D4ED8]'
                    : 'text-[#6B7280] hover:text-[#374151]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Panel content */}
        <div>
          {activeTab === "overview"  && <OverviewPanel loc={activeLoc} />}
          {activeTab === "employees" && <EmployeesPanel />}
          {activeTab === "inventory" && <InventoryPanel />}
          {activeTab === "alerts"    && <AlertsPanel />}
        </div>

        {/* CTA footer */}
        <div className="mt-10 rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#06B6D4] p-8 text-center text-white">
          <Zap className="w-8 h-8 mx-auto mb-3 text-white/70" />
          <h3 className="text-[22px] font-black mb-2">{pl ? 'Gotowy żeby zobaczyć swoje dane?' : 'Ready to see your own data?'}</h3>
          <p className="text-[14px] text-blue-100 mb-5">{pl ? 'Zacznij 7-dniowy trial. Bez karty. Konfiguracja w 3 minuty.' : 'Start a 7-day trial. No card. Setup in 3 minutes.'}</p>
          <Link href="/auth/sign-up" className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-white text-[13px] font-bold text-[#1D4ED8] hover:bg-blue-50 transition-all shadow-xl">
            {pl ? 'Zacznij za darmo' : 'Start for free'} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
