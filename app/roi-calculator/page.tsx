"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { OneLinkLogo } from "@/components/onelink-logo";
import { ArrowRight, TrendingUp, Clock, DollarSign, Users, CheckCircle, Brain } from "lucide-react";

/* ── slider helper ── */
function Slider({ label, value, onChange, min, max, step = 1, format }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; format: (v: number) => string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[13px] text-[#374151] font-medium">{label}</label>
        <span className="text-[14px] font-bold text-[#111827]">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#1D4ED8]"
        style={{ background: `linear-gradient(to right, #1D4ED8 ${((value - min) / (max - min)) * 100}%, #E5E7EB ${((value - min) / (max - min)) * 100}%)` }}
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-[#D1D5DB]">{format(min)}</span>
        <span className="text-[10px] text-[#D1D5DB]">{format(max)}</span>
      </div>
    </div>
  );
}

const fmt0 = (n: number) => n.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 });
const fmtH = (n: number) => `${n} godz/mies.`;
const fmtPct = (n: number) => `${n}%`;
const fmtPln = (n: number) => `${n.toLocaleString('pl-PL')} zł`;

export default function RoiCalculatorPage() {
  // Inputs
  const [monthlyRevenue, setMonthlyRevenue]   = useState(80000);
  const [locations, setLocations]             = useState(2);
  const [foodCostCurrent, setFoodCostCurrent] = useState(38);
  const [laborCostCurrent, setLaborCostCurrent] = useState(30);
  const [adminHoursPerMonth, setAdminHoursPerMonth] = useState(40);
  const [adminHourlyRate, setAdminHourlyRate] = useState(50);

  // Assumptions (based on customer data)
  const FOOD_COST_REDUCTION   = 0.025; // CFO catches 2.5pp food cost waste on avg
  const LABOR_SAVINGS_PCT     = 0.015; // scheduling optimization saves ~1.5% labor
  const TIME_SAVING_PCT       = 0.70;  // saves 70% of admin time
  const ONELINK_PLAN_PRICE    = 299;   // enterprise plan per month
  const CFO_MARKET_RATE       = 12000; // junior CFO/controller monthly cost PL

  const results = useMemo(() => {
    // 1. Food cost savings
    const currentFoodCostAmount = monthlyRevenue * (foodCostCurrent / 100);
    const savedFoodCostAmount   = monthlyRevenue * FOOD_COST_REDUCTION;

    // 2. Labor savings
    const currentLaborCostAmount = monthlyRevenue * (laborCostCurrent / 100);
    const savedLaborAmount       = currentLaborCostAmount * LABOR_SAVINGS_PCT;

    // 3. Time savings
    const savedAdminHours  = adminHoursPerMonth * TIME_SAVING_PCT;
    const savedAdminCost   = savedAdminHours * adminHourlyRate;

    // 4. Total
    const totalMonthlySaving = savedFoodCostAmount + savedLaborAmount + savedAdminCost;
    const totalAnnualSaving  = totalMonthlySaving * 12;
    const onelinkCostAnnual  = ONELINK_PLAN_PRICE * 12 * locations;
    const netAnnualROI       = totalAnnualSaving - onelinkCostAnnual;
    const roiMultiple        = totalAnnualSaving / onelinkCostAnnual;
    const paybackDays        = Math.round((ONELINK_PLAN_PRICE * locations) / (totalMonthlySaving / 30));

    return {
      savedFoodCostAmount,
      savedLaborAmount,
      savedAdminCost,
      savedAdminHours,
      totalMonthlySaving,
      totalAnnualSaving,
      onelinkCostAnnual,
      netAnnualROI,
      roiMultiple,
      paybackDays,
      cfoSavings: CFO_MARKET_RATE * locations * 12,
    };
  }, [monthlyRevenue, locations, foodCostCurrent, laborCostCurrent, adminHoursPerMonth, adminHourlyRate]);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[#E5E7EB]/70">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link href="/"><OneLinkLogo iconSize={26} textSize="text-[15px]" /></Link>
          <Link href="/auth/sign-up"
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[13px] font-bold text-white hover:opacity-90 transition-all shadow-sm flex items-center gap-1">
            Zacznij za darmo
          </Link>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-28 pb-24">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-[11px] font-semibold text-blue-700 mb-5">
            <TrendingUp className="w-3 h-3" />
            Kalkulator ROI — OneLink
          </span>
          <h1 className="text-[38px] md:text-[52px] font-black leading-tight tracking-tight mb-4">
            Ile zaoszczędzi<br />
            <span className="bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] bg-clip-text text-transparent">
              Twój biznes z OneLink?
            </span>
          </h1>
          <p className="text-[16px] text-[#6B7280] max-w-xl mx-auto">
            Przesuń suwaki do wartości odpowiadających Twojemu biznesowi.
            Kalkulator pokaże konkretny zwrot z inwestycji.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left — inputs */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-5">Twój biznes</p>

            <Slider label="Miesięczny przychód netto" value={monthlyRevenue} onChange={setMonthlyRevenue}
              min={20000} max={500000} step={5000} format={fmtPln} />
            <Slider label="Liczba lokalizacji" value={locations} onChange={setLocations}
              min={1} max={10} format={v => `${v} ${v === 1 ? 'lokal' : v < 5 ? 'lokale' : 'lokali'}`} />
            <Slider label="Obecny food cost" value={foodCostCurrent} onChange={setFoodCostCurrent}
              min={20} max={60} format={fmtPct} />
            <Slider label="Obecny koszt pracy" value={laborCostCurrent} onChange={setLaborCostCurrent}
              min={10} max={50} format={fmtPct} />
            <Slider label="Czas admina / właściciela miesięcznie" value={adminHoursPerMonth} onChange={setAdminHoursPerMonth}
              min={5} max={160} step={5} format={fmtH} />
            <Slider label="Twoja stawka godzinowa" value={adminHourlyRate} onChange={setAdminHourlyRate}
              min={30} max={300} step={10} format={fmtPln} />

            <div className="mt-5 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[11px] text-[#6B7280] leading-relaxed">
              <strong className="text-[#374151]">Założenia kalkulatora:</strong> oparte na danych od 50+ restauracji używających OneLink.
              Food cost redukcja ~2,5pp, oszczędność czasu ~70%, optimalizacja pracy ~1,5%.
            </div>
          </div>

          {/* Right — results */}
          <div className="space-y-4">
            {/* Payback hero */}
            <div className="rounded-2xl p-6 text-center shadow-lg" style={{ background: 'linear-gradient(135deg, #0D1628 0%, #1E3A8A 100%)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300 mb-2">Zwrot z inwestycji</p>
              <p className="text-[52px] font-black text-white leading-none mb-1">
                {results.roiMultiple.toFixed(1)}×
              </p>
              <p className="text-white/60 text-[14px] mb-4">zwrot w pierwszym roku</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/8 rounded-xl p-3">
                  <p className="text-[22px] font-black text-white">{results.paybackDays}d</p>
                  <p className="text-[10px] text-white/50">czas zwrotu</p>
                </div>
                <div className="bg-white/8 rounded-xl p-3">
                  <p className="text-[22px] font-black text-[#10B981]">{fmt0(results.netAnnualROI)}</p>
                  <p className="text-[10px] text-white/50">zysk netto / rok</p>
                </div>
              </div>
            </div>

            {/* Savings breakdown */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-4">Skąd bierze się oszczędność</p>
              <div className="space-y-3">
                {[
                  { icon: DollarSign, color: '#3B82F6', label: 'Redukcja food cost (~2,5pp)', amount: results.savedFoodCostAmount, note: `z ${foodCostCurrent}% → ${(foodCostCurrent - 2.5).toFixed(1)}%` },
                  { icon: Users, color: '#10B981', label: 'Optymalizacja kosztu pracy', amount: results.savedLaborAmount, note: '~1,5% przychodów' },
                  { icon: Clock, color: '#8B5CF6', label: 'Odzyskany czas właściciela', amount: results.savedAdminCost, note: `~${results.savedAdminHours.toFixed(0)} godz/mies.` },
                ].map(({ icon: Icon, color, label, amount, note }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#F3F4F6]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-[#111827]">{label}</p>
                      <p className="text-[11px] text-[#9CA3AF]">{note}</p>
                    </div>
                    <p className="text-[14px] font-bold text-[#111827] shrink-0">{fmt0(amount)}/mies.</p>
                  </div>
                ))}

                <div className="border-t border-[#F3F4F6] pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-bold text-[#111827]">Łączna oszczędność</p>
                    <p className="text-[11px] text-[#9CA3AF]">koszt OneLink: {fmt0(results.onelinkCostAnnual / 12 * locations)}/mies.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-black text-[#10B981]">{fmt0(results.totalMonthlySaving)}/mies.</p>
                    <p className="text-[11px] text-[#9CA3AF]">{fmt0(results.totalAnnualSaving)}/rok</p>
                  </div>
                </div>
              </div>
            </div>

            {/* vs hiring CFO */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-3">Alternatywny koszt: zatrudnienie kontrolera</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-[#374151]">Junior kontroler finansowy (PL)</p>
                  <p className="text-[11px] text-[#9CA3AF]">~12 000 zł brutto/mies. × {locations} lokale</p>
                </div>
                <div className="text-right">
                  <p className="text-[16px] font-black text-red-600">{fmt0(results.cfoSavings)}/rok</p>
                  <p className="text-[10px] text-[#9CA3AF]">zamiast OneLink</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                <Brain className="w-4 h-4 text-[#10B981] shrink-0" />
                <p className="text-[11px] text-[#15803D]">
                  CFO AI w OneLink kosztuje <strong>{fmt0(299 * locations)}/mies.</strong> i pracuje 24/7 —
                  zamiast {fmt0(12000 * locations)}/mies. za jednego kontrolera.
                </p>
              </div>
            </div>

            {/* CTA */}
            <Link href="/auth/sign-up"
              className="flex items-center justify-center gap-2 w-full h-14 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#06B6D4] text-[15px] font-bold text-white hover:opacity-90 transition-all shadow-xl shadow-blue-500/30">
              Zacznij oszczędzać — 7 dni gratis <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-[11px] text-[#9CA3AF] text-center">Anuluj kiedy chcesz.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-8 px-5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <Link href="/"><OneLinkLogo iconSize={24} textSize="text-[14px]" /></Link>
          <p className="text-[11px] text-[#D1D5DB]">© {new Date().getFullYear()} OneLink</p>
        </div>
      </footer>
    </div>
  );
}
