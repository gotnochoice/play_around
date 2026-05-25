'use client'

import { useState, useEffect } from 'react'
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import type { ConversationState } from '@/types'

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  B2B_SAAS: 'B2B SaaS', CONSUMER_APP: 'Consumer App', MARKETPLACE: 'Marketplace',
  ECOMMERCE: 'E-commerce', PROFESSIONAL_SERVICES: 'Professional Services', FINTECH: 'Fintech',
  HARDWARE: 'Hardware', MEDIA: 'Media / Content', AGRITECH: 'AgriTech',
  EDTECH: 'EdTech', HEALTHTECH: 'HealthTech', LOGISTICS: 'Logistics',
}
const PURPOSE_LABELS: Record<string, string> = {
  projection: 'Forward-looking projection', snapshot: 'Snapshot (today)', scenario: 'Scenario analysis',
}
const HORIZON_LABELS: Record<string, string> = { '12mo': '12 months', '3yr': '3 years', '5yr': '5 years' }
const AUDIENCE_LABELS: Record<string, string> = {
  vc: 'VC / Investors', board: 'Board', acquirer: 'Acquirer', personal: 'Personal clarity',
}
const FX_TO_USD: Record<string, number> = {
  USD: 1, GBP: 1.27, EUR: 1.08, NGN: 1 / 1600, KES: 1 / 130, ZAR: 1 / 18,
  GHS: 1 / 15, INR: 1 / 84, CAD: 0.73, AUD: 0.65, SGD: 0.74, AED: 0.27,
}
const DISPLAY_CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR', 'KES', 'ZAR', 'GHS']

function convertAmount(amount: number, from: string, to: string): number {
  if (from === to) return amount
  return amount * ((FX_TO_USD[from] ?? 1) / (FX_TO_USD[to] ?? 1))
}

interface Row { label: string; value: string | null; status?: 'danger' | 'warning' | 'good'; indent?: boolean }
type TabId = 'actual' | 'assumptions' | 'pl' | 'bs' | 'cf' | 'ratios'
const TABS: { id: TabId; label: string }[] = [
  { id: 'actual', label: 'Actual' }, { id: 'assumptions', label: 'Assumptions' },
  { id: 'pl', label: 'P&L' }, { id: 'bs', label: 'Balance Sheet' },
  { id: 'cf', label: 'Cash Flow' }, { id: 'ratios', label: 'Ratios' },
]
const STAGE_TAB: Record<number, TabId> = {
  0: 'actual', 1: 'actual', 2: 'actual', 3: 'actual', 4: 'actual', 5: 'assumptions', 6: 'pl',
}

function Cell({ value, status, className }: { value: string | null; status?: Row['status']; className?: string }) {
  return (
    <div className={cn('flex-1 px-3 py-2 text-sm transition-all duration-500',
      value ? cn('font-medium', status === 'danger' && 'text-red-500', status === 'warning' && 'text-amber-500',
        status === 'good' && 'text-emerald-600', !status && 'text-slate-800') : 'text-slate-300', className)}>
      {value ?? '—'}
    </div>
  )
}
function SheetRow({ rowNum, label, value, status, even, indent }: {
  rowNum: number; label: string; value: string | null; status?: Row['status']; even: boolean; indent?: boolean
}) {
  return (
    <div className={cn('flex items-center border-b border-slate-100 transition-colors',
      even ? 'bg-white' : 'bg-slate-50/40', value && 'hover:bg-brand-light/30')}>
      <div className="w-8 shrink-0 border-r border-slate-100 py-2 text-center text-[10px] text-slate-300 select-none">{rowNum}</div>
      <div className={cn('w-44 shrink-0 border-r border-slate-100 px-3 py-2 text-xs text-slate-500 select-none', indent && 'pl-5')}>{label}</div>
      <Cell value={value} status={status} />
    </div>
  )
}
function SectionHeader({ rowNum, title }: { rowNum: number; title: string }) {
  return (
    <div className="flex items-center border-b border-slate-200 bg-brand-light/60">
      <div className="w-8 shrink-0 border-r border-slate-200 py-2 text-center text-[10px] text-slate-400 select-none">{rowNum}</div>
      <div className="w-44 shrink-0 border-r border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-brand-navy select-none">{title}</div>
      <div className="flex-1 bg-brand-light/30 px-3 py-2" />
    </div>
  )
}
function PadRow({ rowNum, even }: { rowNum: number; even: boolean }) {
  return (
    <div className={cn('flex items-center border-b border-slate-100', even ? 'bg-white' : 'bg-slate-50/40')}>
      <div className="w-8 shrink-0 border-r border-slate-100 py-2.5 text-center text-[10px] text-slate-200 select-none">{rowNum}</div>
      <div className="w-44 shrink-0 border-r border-slate-100 px-3 py-2.5" />
      <div className="flex-1 px-3 py-2.5" />
    </div>
  )
}

interface FullProjection {
  label: string; months: number
  revenue: number; cogs: number; grossProfit: number; grossMarginPct: number
  salaries: number; marketing: number; ga: number; totalOpex: number
  ebitda: number; depreciationAmt: number; ebit: number; interestExpense: number
  ebt: number; tax: number; netProfit: number
  grossFixedAssets: number; accumulatedDepreciation: number; netFixedAssets: number
  cashBalance: number; accountsReceivable: number; inventoryValue: number
  totalCurrentAssets: number; totalAssets: number
  paidInCapital: number; retainedEarnings: number; totalEquity: number
  loansBalance: number; accountsPayable: number; totalCurrentLiabilities: number
  totalLiabilities: number; totalEquityAndLiabilities: number; balanceCheck: number
  cfNetProfit: number; cfDepreciation: number; cfARChange: number; cfAPChange: number
  cfOperating: number; cfCapex: number; cfInvesting: number
  cfLoanChange: number; cfEquityChange: number; cfFinancing: number
  netCashMovement: number; openingCash: number; closingCash: number
  currentRatio: number | null; quickRatio: number | null
  ebitdaMarginPct: number; netMarginPct: number
  revenuePerEmployee: number | null; burnMultiple: number | null
  arDays: number | null; revenueGrowthPct: number | null
}

interface FullModelParams {
  monthlyRevenue: number | null; growthRate: number | null; monthlyBurn: number | null
  grossMargin: number | null; currentCash: number | null; horizon: string | null
  granularity: string | null; loans: number | null; paidInCapital: number | null
  daysReceivable: number | null; daysPayable: number | null; fixedAssets: number | null
  capexMonthly: number | null; taxRate: number | null; depreciation: number | null
  teamSize: number | null; inventoryValue: number | null
}

function buildFullModel(p: FullModelParams): FullProjection[] | null {
  if (!p.monthlyRevenue) return null
  const growth = (p.growthRate ?? 0) / 100
  const margin = (p.grossMargin ?? 60) / 100
  const burn = p.monthlyBurn ?? p.monthlyRevenue * 1.5
  const taxPct = (p.taxRate ?? 0) / 100
  const monthlyInterest = 0.15 / 12
  const capex = p.capexMonthly ?? 0
  const depMonthly = p.depreciation != null ? p.depreciation : p.fixedAssets ? p.fixedAssets / 60 : 0

  const periods: { label: string; months: number }[] = []
  if (p.granularity === 'annual') {
    const yrs = p.horizon === '5yr' ? 5 : p.horizon === '3yr' ? 3 : 1
    for (let y = 1; y <= yrs; y++) periods.push({ label: `Year ${y}`, months: 12 })
  } else if (p.granularity === 'quarterly') {
    const total = p.horizon === '5yr' ? 60 : p.horizon === '3yr' ? 36 : 12
    for (let q = 1; q <= total / 3; q++) periods.push({ label: `Q${q}`, months: 3 })
  } else {
    for (let m = 1; m <= 12; m++) periods.push({ label: `M${m}`, months: 1 })
  }

  const openingCash = p.currentCash ?? 0
  const openingFA = p.fixedAssets ?? 0
  const openingInv = p.inventoryValue ?? 0
  const openingLoans = p.loans ?? 0
  const openingPIC = p.paidInCapital ?? 0
  const openingRE = openingCash + openingFA + openingInv - openingLoans - openingPIC

  let cashBalance = openingCash, grossFA = openingFA, accumDep = 0
  let retainedEarnings = openingRE, cumulativeMonth = 0
  let prevAR = 0, prevAP = 0, prevRevenue: number | null = null

  return periods.map(({ label, months }) => {
    const periodOpeningCash = cashBalance
    let revenue = 0, lastMonthRev = 0
    for (let m = 0; m < months; m++) {
      const mRev = p.monthlyRevenue! * Math.pow(1 + growth, cumulativeMonth)
      revenue += mRev; cumulativeMonth++
      if (m === months - 1) lastMonthRev = mRev
    }
    const totalCost = burn * months
    const cogs = revenue * (1 - margin), grossProfit = revenue * margin
    const grossMarginPct = margin * 100
    const totalOpex = Math.max(0, totalCost - cogs)
    const salaries = totalOpex * 0.55, marketing = totalOpex * 0.25, ga = totalOpex * 0.20
    const ebitda = grossProfit - totalOpex
    const depAmt = depMonthly * months
    const ebit = ebitda - depAmt
    const interest = openingLoans * monthlyInterest * months
    const ebt = ebit - interest
    const taxAmt = Math.max(0, ebt * taxPct)
    const netProfit = ebt - taxAmt
    const arDays = p.daysReceivable ?? 0, apDays = p.daysPayable ?? 0
    const ar = lastMonthRev * (arDays / 30)
    const ap = lastMonthRev * (1 - margin) * (apDays / 30)
    const cfARChange = -(ar - prevAR), cfAPChange = ap - prevAP
    const cfOperating = netProfit + depAmt + cfARChange + cfAPChange
    const cfCapex = -(capex * months), cfInvesting = cfCapex, cfFinancing = 0
    const netCashMovement = cfOperating + cfInvesting + cfFinancing
    cashBalance = periodOpeningCash + netCashMovement
    const closingCash = cashBalance
    grossFA += capex * months; accumDep += depAmt
    const netFA = Math.max(0, grossFA - accumDep)
    retainedEarnings += netProfit
    const tca = closingCash + ar + openingInv, totalAssets = netFA + tca
    const totalEquity = openingPIC + retainedEarnings
    const tcl = ap, totalLiabilities = openingLoans + tcl
    const totalEL = totalEquity + totalLiabilities
    const balanceCheck = totalAssets - totalEL
    const currentRatio = tcl > 0 ? tca / tcl : null
    const quickRatio = tcl > 0 ? (tca - openingInv) / tcl : null
    const ebitdaMarginPct = revenue > 0 ? (ebitda / revenue) * 100 : 0
    const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0
    const revPerEmp = p.teamSize && p.teamSize > 0 ? revenue / (p.teamSize * months) : null
    const netBurn = Math.max(0, totalCost - revenue)
    const revGrowth = prevRevenue != null ? revenue - prevRevenue : null
    const burnMultiple = revGrowth != null && revGrowth > 0 ? netBurn / revGrowth : null
    const revenueGrowthPct = prevRevenue != null && prevRevenue > 0
      ? ((revenue - prevRevenue) / prevRevenue) * 100 : null
    prevAR = ar; prevAP = ap; prevRevenue = revenue
    return {
      label, months, revenue, cogs, grossProfit, grossMarginPct, salaries, marketing, ga, totalOpex,
      ebitda, depreciationAmt: depAmt, ebit, interestExpense: interest, ebt, tax: taxAmt, netProfit,
      grossFixedAssets: grossFA, accumulatedDepreciation: accumDep, netFixedAssets: netFA,
      cashBalance: closingCash, accountsReceivable: ar, inventoryValue: openingInv,
      totalCurrentAssets: tca, totalAssets, paidInCapital: openingPIC, retainedEarnings, totalEquity,
      loansBalance: openingLoans, accountsPayable: ap, totalCurrentLiabilities: tcl,
      totalLiabilities, totalEquityAndLiabilities: totalEL, balanceCheck,
      cfNetProfit: netProfit, cfDepreciation: depAmt, cfARChange, cfAPChange, cfOperating,
      cfCapex, cfInvesting, cfLoanChange: 0, cfEquityChange: 0, cfFinancing,
      netCashMovement, openingCash: periodOpeningCash, closingCash,
      currentRatio, quickRatio, ebitdaMarginPct, netMarginPct,
      revenuePerEmployee: revPerEmp, burnMultiple, arDays: arDays || null, revenueGrowthPct,
    }
  })
}
