'use client'

import { useState, useEffect } from 'react'
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import type { ConversationState, RevenueStream } from '@/types'

// ───── CONSTANTS ──────────────────────────────────────────────────────────────

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  B2B_SAAS: 'B2B SaaS',
  CONSUMER_APP: 'Consumer App',
  MARKETPLACE: 'Marketplace',
  ECOMMERCE: 'E-commerce',
  PROFESSIONAL_SERVICES: 'Professional Services',
  FINTECH: 'Fintech',
  HARDWARE: 'Hardware',
  MEDIA: 'Media / Content',
  AGRITECH: 'AgriTech',
  EDTECH: 'EdTech',
  HEALTHTECH: 'HealthTech',
  LOGISTICS: 'Logistics',
}

const PURPOSE_LABELS: Record<string, string> = {
  projection: 'Forward-looking projection',
  snapshot: 'Snapshot (today)',
  scenario: 'Scenario analysis',
}

const HORIZON_LABELS: Record<string, string> = {
  '12mo': '12 months',
  '3yr': '3 years',
  '5yr': '5 years',
}

const AUDIENCE_LABELS: Record<string, string> = {
  vc: 'VC / Investors',
  board: 'Board',
  acquirer: 'Acquirer',
  personal: 'Personal clarity',
}

const FX_TO_USD: Record<string, number> = {
  USD: 1, GBP: 1.27, EUR: 1.08,
  NGN: 1 / 1600, KES: 1 / 130, ZAR: 1 / 18,
  GHS: 1 / 15, INR: 1 / 84, CAD: 0.73,
  AUD: 0.65, SGD: 0.74, AED: 0.27,
}

const DISPLAY_CURRENCIES = ['USD', 'NGN', 'GBP', 'EUR', 'KES', 'ZAR', 'GHS']

function convertAmount(amount: number, from: string, to: string): number {
  if (from === to) return amount
  const usdRate = FX_TO_USD[from] ?? 1
  const toRate = FX_TO_USD[to] ?? 1
  return amount * (usdRate / toRate)
}

// ───── TYPES ──────────────────────────────────────────────────────────────────

interface Row {
  label: string
  value: string | null
  status?: 'danger' | 'warning' | 'good'
  indent?: boolean
}

type TabId = 'actual' | 'assumptions' | 'revenue' | 'pl' | 'bs' | 'cf' | 'ratios'

const TABS: { id: TabId; label: string }[] = [
  { id: 'actual', label: 'Actual' },
  { id: 'assumptions', label: 'Assumptions' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'pl', label: 'P&L' },
  { id: 'bs', label: 'Balance Sheet' },
  { id: 'cf', label: 'Cash Flow' },
  { id: 'ratios', label: 'Ratios' },
]

const STAGE_TAB: Record<number, TabId> = {
  0: 'actual', 1: 'actual', 2: 'revenue', 3: 'actual', 4: 'actual',
  5: 'assumptions', 6: 'pl',
}

// ───── SIMPLE LAYOUT COMPONENTS ───────────────────────────────────────────────

function Cell({ value, status, className }: { value: string | null; status?: Row['status']; className?: string }) {
  return (
    <div className={cn(
      'flex-1 px-3 py-2 text-sm transition-all duration-500',
      value
        ? cn('font-medium',
            status === 'danger' && 'text-red-500',
            status === 'warning' && 'text-amber-500',
            status === 'good' && 'text-emerald-600',
            !status && 'text-slate-800')
        : 'text-slate-300',
      className,
    )}>
      {value ?? '—'}
    </div>
  )
}

function SheetRow({ rowNum, label, value, status, even, indent }: {
  rowNum: number; label: string; value: string | null
  status?: Row['status']; even: boolean; indent?: boolean
}) {
  return (
    <div className={cn(
      'flex items-center border-b border-slate-100 transition-colors',
      even ? 'bg-white' : 'bg-slate-50/40',
      value && 'hover:bg-brand-light/30',
    )}>
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

// ───── 3-STATEMENT MODEL: TYPES ───────────────────────────────────────────────

interface FullProjection {
  label: string
  months: number
  // P&L / SOPL
  revenue: number
  cogs: number
  grossProfit: number
  grossMarginPct: number
  salaries: number
  marketing: number
  ga: number
  totalOpex: number
  ebitda: number
  depreciationAmt: number
  ebit: number
  interestExpense: number
  interestIncome: number
  ebt: number
  tax: number
  netProfit: number
  // Balance Sheet / SOFP
  grossFixedAssets: number
  accumulatedDepreciation: number
  netFixedAssets: number
  cashBalance: number
  accountsReceivable: number
  inventoryValue: number
  totalCurrentAssets: number
  totalAssets: number
  paidInCapital: number
  retainedEarnings: number
  totalEquity: number
  loansBalance: number
  accountsPayable: number
  totalCurrentLiabilities: number
  totalLiabilities: number
  totalEquityAndLiabilities: number
  balanceCheck: number
  // Cash Flow
  cfNetProfit: number
  cfDepreciation: number
  cfARChange: number
  cfAPChange: number
  cfOperating: number
  cfCapex: number
  cfInvesting: number
  cfLoanChange: number
  cfEquityChange: number
  cfFinancing: number
  netCashMovement: number
  openingCash: number
  closingCash: number
  // Per-stream breakdown (null when single-stream)
  streamRevenues: Array<{ name: string; revenue: number; cogs: number }> | null
  // Ratios
  currentRatio: number | null
  quickRatio: number | null
  ebitdaMarginPct: number
  netMarginPct: number
  revenuePerEmployee: number | null
  burnMultiple: number | null
  arDays: number | null
  revenueGrowthPct: number | null
  rule40: number | null
  opexToRevenuePct: number
  cashRunwayMonths: number | null
}

interface FullModelParams {
  monthlyRevenue: number | null
  monthlyCOGS: number | null
  growthRate: number | null
  monthlyBurn: number | null
  grossMargin: number | null
  currentCash: number | null
  horizon: string | null
  granularity: string | null
  loans: number | null
  paidInCapital: number | null
  daysReceivable: number | null
  daysPayable: number | null
  fixedAssets: number | null
  capexMonthly: number | null
  taxRate: number | null
  taxStartYear: number | null
  depreciation: number | null
  teamSize: number | null
  inventoryValue: number | null
  monthlyInterestIncome: number | null
  founderSalaryMonthly: number | null
  revenueCurrency: string | null
  priceGrowthAnnual: number | null
  salaryGrowthAnnual: number | null
  revenueStreams: Array<{ name: string; monthlyRevenue: number; cogsMargin: number; priceGrowthAnnual: number }> | null
}

function buildFullModel(p: FullModelParams): FullProjection[] | null {
  if (!p.monthlyRevenue) return null

  const growth = (p.growthRate ?? 0) / 100
  const grossMarginPctInput = p.grossMargin ?? 40
  const cogsMargin = p.monthlyCOGS != null && p.monthlyRevenue != null && p.monthlyRevenue > 0
    ? p.monthlyCOGS / p.monthlyRevenue
    : 1 - grossMarginPctInput / 100
  const initialBurn = p.monthlyBurn ?? p.monthlyRevenue * 0.8
  const initialCOGS = p.monthlyRevenue * cogsMargin
  const initialOpexMonthly = Math.max(0, initialBurn - initialCOGS)

  // Price growth: if the founder plans annual price increases, COGS margin compresses over time.
  // Revenue per unit rises but COGS per unit stays closer to the original cost → gross margin improves.
  const annualPriceGrowth = (p.priceGrowthAnnual ?? 0) / 100

  // Salary growth: founder-provided annual %. No auto-inflation applied to any cost line.
  const annualSalaryGrowth = (p.salaryGrowthAnnual ?? 0) / 100

  const founderSalaryMonthly = p.founderSalaryMonthly ?? 0
  const taxPct = (p.taxRate ?? 0) / 100
  const taxStartYear = p.taxStartYear ?? null
  const monthlyIntIncome = p.monthlyInterestIncome ?? 0
  const monthlyInterest = 0.15 / 12
  const capex = p.capexMonthly ?? 0
  const usefulLife = 60
  const depMonthly = p.depreciation != null
    ? p.depreciation
    : p.fixedAssets ? p.fixedAssets / usefulLife : 0

  const periods: { label: string; months: number }[] = []
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = new Date()
  const startYear = now.getFullYear()
  const startMonth = now.getMonth() // 0-indexed

  if (p.granularity === 'annual') {
    const yrs = p.horizon === '5yr' ? 5 : p.horizon === '3yr' ? 3 : 1
    for (let y = 0; y < yrs; y++) periods.push({ label: `${startYear + y}`, months: 12 })
  } else if (p.granularity === 'quarterly') {
    const total = p.horizon === '5yr' ? 60 : p.horizon === '3yr' ? 36 : 12
    let qMonth = startMonth
    let qYear = startYear
    for (let q = 0; q < total / 3; q++) {
      const calQ = Math.floor(qMonth / 3) + 1
      periods.push({ label: `Q${calQ} ${qYear}`, months: 3 })
      qMonth += 3
      if (qMonth >= 12) { qMonth -= 12; qYear++ }
    }
  } else {
    const totalMonths = p.horizon === '5yr' ? 60 : p.horizon === '3yr' ? 36 : 12
    let mMonth = startMonth
    let mYear = startYear
    for (let m = 0; m < totalMonths; m++) {
      periods.push({ label: `${MONTH_SHORT[mMonth]} ${mYear}`, months: 1 })
      mMonth++
      if (mMonth >= 12) { mMonth = 0; mYear++ }
    }
  }

  // Opening balance sheet — derive retained earnings to balance at open
  const openingCash = p.currentCash ?? 0
  const openingFA = p.fixedAssets ?? 0
  const openingInv = p.inventoryValue ?? 0
  const openingLoans = p.loans ?? 0
  const openingPIC = p.paidInCapital ?? 0
  const openingRE = openingCash + openingFA + openingInv - openingLoans - openingPIC

  let cashBalance = openingCash
  let grossFA = openingFA
  let accumDep = 0
  let retainedEarnings = openingRE
  let cumulativeMonth = 0
  let prevAR = 0
  let prevAP = 0
  let prevRevenue: number | null = null

  const hasStreams = p.revenueStreams != null && p.revenueStreams.length > 0

  return periods.map(({ label, months }) => {
    const periodOpeningCash = cashBalance
    const periodYear = Math.floor(cumulativeMonth / 12) + 1

    // P&L
    let revenue = 0
    let lastMonthRev = 0
    const streamRevBuffers: number[] = hasStreams ? p.revenueStreams!.map(() => 0) : []

    for (let m = 0; m < months; m++) {
      const monthIdx = cumulativeMonth
      if (hasStreams) {
        let totalMonthRev = 0
        p.revenueStreams!.forEach((s, si) => {
          const sPG = s.priceGrowthAnnual / 100
          const mRev = s.monthlyRevenue *
            Math.pow(1 + growth, monthIdx) *
            Math.pow(1 + sPG, monthIdx / 12)
          streamRevBuffers[si] += mRev
          totalMonthRev += mRev
        })
        revenue += totalMonthRev
        if (m === months - 1) lastMonthRev = totalMonthRev
      } else {
        const mRev = p.monthlyRevenue! * Math.pow(1 + growth, monthIdx)
        revenue += mRev
        if (m === months - 1) lastMonthRev = mRev
      }
      cumulativeMonth++
    }

    // COGS: per-stream with individual price-growth compression, or aggregate
    let cogs: number
    let streamRevenues: Array<{ name: string; revenue: number; cogs: number }> | null = null

    if (hasStreams) {
      streamRevenues = p.revenueStreams!.map((s, si) => {
        const streamRev = streamRevBuffers[si]
        const sPG = s.priceGrowthAnnual / 100
        const sCogsEff = sPG > 0
          ? Math.max(0.05, s.cogsMargin / Math.pow(1 + sPG, periodYear - 1))
          : s.cogsMargin
        return { name: s.name, revenue: streamRev, cogs: streamRev * sCogsEff }
      })
      cogs = streamRevenues.reduce((acc, s) => acc + s.cogs, 0)
    } else {
      // COGS margin compression: as prices rise year-on-year, the founder earns more per unit
      // but direct costs stay closer to original → gross margin improves over time.
      const cogsMarginEff = annualPriceGrowth > 0
        ? Math.max(0.05, cogsMargin / Math.pow(1 + annualPriceGrowth, periodYear - 1))
        : cogsMargin
      cogs = revenue * cogsMarginEff
    }

    const grossProfit = revenue - cogs
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0

    // OPEX: no auto-inflation on any line.
    // Salaries grow by salary_growth_annual (founder-provided) or stay flat.
    // Marketing and G&A stay flat; if volume growth requires more marketing spend,
    // the AI challenges this in Stage 5 and the founder updates burn accordingly.
    const salaryGrowthFactor = Math.pow(1 + annualSalaryGrowth, periodYear - 1)
    let salaries: number
    let marketing: number
    let ga: number
    if (founderSalaryMonthly > 0) {
      salaries = founderSalaryMonthly * months * salaryGrowthFactor
      const remainingFlat = Math.max(0, initialOpexMonthly - founderSalaryMonthly)
      marketing = remainingFlat * 0.556 * months
      ga = remainingFlat * 0.444 * months
    } else {
      salaries = initialOpexMonthly * 0.55 * months
      marketing = initialOpexMonthly * 0.25 * months
      ga = initialOpexMonthly * 0.20 * months
    }
    const totalOpex = salaries + marketing + ga
    const ebitda = grossProfit - totalOpex
    const depAmt = depMonthly * months
    const ebit = ebitda - depAmt
    const interest = openingLoans * monthlyInterest * months
    const interestIncome = monthlyIntIncome * months
    const ebt = ebit - interest + interestIncome
    const effectiveTaxPct = (taxStartYear != null && periodYear >= taxStartYear) ? taxPct : 0
    const taxAmt = Math.max(0, ebt * effectiveTaxPct)
    const netProfit = ebt - taxAmt

    // Working capital
    const arDays = p.daysReceivable ?? 0
    const apDays = p.daysPayable ?? 0
    const ar = lastMonthRev * (arDays / 30)
    const ap = lastMonthRev * cogsMargin * (apDays / 30)

    // Cash Flow
    const cfARChange = -(ar - prevAR)
    const cfAPChange = ap - prevAP
    const cfOperating = netProfit + depAmt + cfARChange + cfAPChange
    const cfCapex = -(capex * months)
    const cfInvesting = cfCapex
    const cfFinancing = 0
    const netCashMovement = cfOperating + cfInvesting + cfFinancing
    cashBalance = periodOpeningCash + netCashMovement
    const closingCash = cashBalance

    // Balance Sheet
    grossFA += capex * months
    accumDep += depAmt
    const netFA = Math.max(0, grossFA - accumDep)
    retainedEarnings += netProfit

    const tca = closingCash + ar + openingInv
    const totalAssets = netFA + tca
    const totalEquity = openingPIC + retainedEarnings
    const tcl = ap
    const totalLiabilities = openingLoans + tcl
    const totalEL = totalEquity + totalLiabilities
    const balanceCheck = totalAssets - totalEL

    // Ratios
    const currentRatio = tcl > 0 ? tca / tcl : null
    const quickRatio = tcl > 0 ? (tca - openingInv) / tcl : null
    const ebitdaMarginPct = revenue > 0 ? (ebitda / revenue) * 100 : 0
    const netMarginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0
    const opexToRevenuePct = revenue > 0 ? (totalOpex / revenue) * 100 : 0
    const revPerEmp = p.teamSize && p.teamSize > 0 ? revenue / (p.teamSize * months) : null
    const netBurn = Math.max(0, cogs + totalOpex - revenue)
    const monthlyBurnRate = (cogs + totalOpex) / months
    const cashRunwayMonths = monthlyBurnRate > 0 ? Math.floor(closingCash / monthlyBurnRate) : null
    const revGrowth = prevRevenue != null ? revenue - prevRevenue : null
    const burnMultiple = revGrowth != null && revGrowth > 0 ? netBurn / revGrowth : null
    const revenueGrowthPct = prevRevenue != null && prevRevenue > 0
      ? ((revenue - prevRevenue) / prevRevenue) * 100
      : null
    const rule40 = revenueGrowthPct != null ? revenueGrowthPct + ebitdaMarginPct : null

    prevAR = ar
    prevAP = ap
    prevRevenue = revenue

    return {
      label, months,
      revenue, cogs, grossProfit, grossMarginPct, salaries, marketing, ga, totalOpex,
      ebitda, depreciationAmt: depAmt, ebit, interestExpense: interest, interestIncome, ebt, tax: taxAmt, netProfit,
      grossFixedAssets: grossFA, accumulatedDepreciation: accumDep, netFixedAssets: netFA,
      cashBalance: closingCash, accountsReceivable: ar, inventoryValue: openingInv,
      totalCurrentAssets: tca, totalAssets,
      paidInCapital: openingPIC, retainedEarnings, totalEquity,
      loansBalance: openingLoans, accountsPayable: ap,
      totalCurrentLiabilities: tcl, totalLiabilities, totalEquityAndLiabilities: totalEL,
      balanceCheck,
      cfNetProfit: netProfit, cfDepreciation: depAmt, cfARChange, cfAPChange, cfOperating,
      cfCapex, cfInvesting, cfLoanChange: 0, cfEquityChange: 0, cfFinancing,
      netCashMovement, openingCash: periodOpeningCash, closingCash,
      currentRatio, quickRatio, ebitdaMarginPct, netMarginPct, opexToRevenuePct,
      revenuePerEmployee: revPerEmp, burnMultiple, arDays: arDays || null,
      revenueGrowthPct, rule40, cashRunwayMonths,
      streamRevenues,
    }
  })
}

// ───── ROW DEFINITIONS ────────────────────────────────────────────────────────

type CellFormat = 'currency' | 'percent' | 'ratio' | 'days' | 'number' | 'balanceCheck'
type CellColor = 'red' | 'green' | 'amber' | 'neutral'

interface StatementRowDef {
  key: keyof FullProjection | 'SECTION'
  label: string
  isSection?: boolean
  isTotal?: boolean
  indent?: boolean
  format?: CellFormat
  colorFn?: (v: number) => CellColor
}

const PL_ROWS: StatementRowDef[] = [
  { key: 'SECTION', label: 'INCOME STATEMENT', isSection: true },
  { key: 'revenue', label: 'Revenue', isTotal: true },
  { key: 'cogs', label: 'Cost of Goods Sold', indent: true },
  { key: 'grossProfit', label: 'Gross Profit', isTotal: true },
  { key: 'grossMarginPct', label: 'Gross Margin %', indent: true, format: 'percent' },
  { key: 'SECTION', label: 'OPERATING EXPENSES', isSection: true },
  { key: 'salaries', label: 'Salaries & Benefits', indent: true },
  { key: 'marketing', label: 'Marketing & Sales', indent: true },
  { key: 'ga', label: 'General & Admin', indent: true },
  { key: 'totalOpex', label: 'Total OPEX', isTotal: true },
  { key: 'SECTION', label: 'PROFITABILITY', isSection: true },
  { key: 'ebitda', label: 'EBITDA', isTotal: true, colorFn: (v) => v >= 0 ? 'green' : 'red' },
  { key: 'depreciationAmt', label: 'Depreciation & Amortisation', indent: true },
  { key: 'ebit', label: 'EBIT (Operating Profit)', isTotal: true, colorFn: (v) => v >= 0 ? 'green' : 'red' },
  { key: 'interestExpense', label: 'Interest Expense', indent: true },
  { key: 'interestIncome', label: 'Interest Income', indent: true, colorFn: (v) => v > 0 ? 'green' : 'neutral' },
  { key: 'ebt', label: 'Earnings Before Tax', isTotal: true },
  { key: 'tax', label: 'Income Tax', indent: true },
  { key: 'netProfit', label: 'Net Profit / PAT', isTotal: true, colorFn: (v) => v >= 0 ? 'green' : 'red' },
]

const BS_ROWS: StatementRowDef[] = [
  { key: 'SECTION', label: 'NON-CURRENT ASSETS', isSection: true },
  { key: 'grossFixedAssets', label: 'Fixed Assets (Gross)', indent: true },
  { key: 'accumulatedDepreciation', label: 'Less: Accumulated Depreciation', indent: true },
  { key: 'netFixedAssets', label: 'Net Fixed Assets', isTotal: true },
  { key: 'SECTION', label: 'CURRENT ASSETS', isSection: true },
  { key: 'cashBalance', label: 'Cash & Cash Equivalents', indent: true },
  { key: 'accountsReceivable', label: 'Accounts Receivable', indent: true },
  { key: 'inventoryValue', label: 'Inventory', indent: true },
  { key: 'totalCurrentAssets', label: 'Total Current Assets', isTotal: true },
  { key: 'totalAssets', label: 'TOTAL ASSETS', isTotal: true },
  { key: 'SECTION', label: 'EQUITY', isSection: true },
  { key: 'paidInCapital', label: 'Paid-in Capital', indent: true },
  { key: 'retainedEarnings', label: 'Retained Earnings / (Deficit)', indent: true, colorFn: (v) => v >= 0 ? 'neutral' : 'amber' },
  { key: 'totalEquity', label: 'Total Equity', isTotal: true },
  { key: 'SECTION', label: 'LIABILITIES', isSection: true },
  { key: 'loansBalance', label: 'Loans & Borrowings', indent: true },
  { key: 'accountsPayable', label: 'Accounts Payable', indent: true },
  { key: 'totalCurrentLiabilities', label: 'Total Current Liabilities', isTotal: true },
  { key: 'totalLiabilities', label: 'Total Liabilities', isTotal: true },
  { key: 'totalEquityAndLiabilities', label: 'Total Equity & Liabilities', isTotal: true },
  { key: 'balanceCheck', label: 'Balance Check', format: 'balanceCheck', colorFn: (v) => Math.abs(v) < 1 ? 'green' : 'red' },
]

const CF_ROWS: StatementRowDef[] = [
  { key: 'SECTION', label: 'OPERATING ACTIVITIES', isSection: true },
  { key: 'cfNetProfit', label: 'Net Profit', indent: true },
  { key: 'cfDepreciation', label: 'Add: Depreciation', indent: true },
  { key: 'cfARChange', label: 'Change in Receivables', indent: true, colorFn: (v) => v >= 0 ? 'green' : 'amber' },
  { key: 'cfAPChange', label: 'Change in Payables', indent: true, colorFn: (v) => v >= 0 ? 'green' : 'amber' },
  { key: 'cfOperating', label: 'Net Operating Cash Flow', isTotal: true, colorFn: (v) => v >= 0 ? 'green' : 'red' },
  { key: 'SECTION', label: 'INVESTING ACTIVITIES', isSection: true },
  { key: 'cfCapex', label: 'Capital Expenditure', indent: true },
  { key: 'cfInvesting', label: 'Net Investing Cash Flow', isTotal: true, colorFn: (v) => v >= 0 ? 'neutral' : 'amber' },
  { key: 'SECTION', label: 'FINANCING ACTIVITIES', isSection: true },
  { key: 'cfLoanChange', label: 'Loan Proceeds / (Repayments)', indent: true },
  { key: 'cfEquityChange', label: 'Equity Raised', indent: true },
  { key: 'cfFinancing', label: 'Net Financing Cash Flow', isTotal: true },
  { key: 'SECTION', label: 'CASH MOVEMENT', isSection: true },
  { key: 'netCashMovement', label: 'Net Change in Cash', isTotal: true, colorFn: (v) => v >= 0 ? 'green' : 'red' },
  { key: 'openingCash', label: 'Opening Cash Balance', indent: true },
  { key: 'closingCash', label: 'Closing Cash Balance', isTotal: true, colorFn: (v) => v >= 0 ? 'neutral' : 'red' },
]

const RATIO_ROWS: StatementRowDef[] = [
  { key: 'SECTION', label: 'STARTUP HEALTH', isSection: true },
  { key: 'rule40', label: 'Rule of 40 (growth % + EBITDA %)', format: 'number', colorFn: (v) => v >= 40 ? 'green' : v >= 20 ? 'amber' : 'red' },
  { key: 'cashRunwayMonths', label: 'Cash Runway (months)', format: 'number', colorFn: (v) => v >= 18 ? 'green' : v >= 6 ? 'amber' : 'red' },
  { key: 'burnMultiple', label: 'Burn Multiple', format: 'ratio', colorFn: (v) => v <= 1 ? 'green' : v <= 2 ? 'amber' : 'red' },
  { key: 'SECTION', label: 'PROFITABILITY', isSection: true },
  { key: 'grossMarginPct', label: 'Gross Margin %', format: 'percent', colorFn: (v) => v >= 50 ? 'green' : v >= 25 ? 'amber' : 'red' },
  { key: 'ebitdaMarginPct', label: 'EBITDA Margin %', format: 'percent', colorFn: (v) => v >= 20 ? 'green' : v >= 0 ? 'amber' : 'red' },
  { key: 'netMarginPct', label: 'Net Profit Margin %', format: 'percent', colorFn: (v) => v >= 10 ? 'green' : v >= 0 ? 'amber' : 'red' },
  { key: 'SECTION', label: 'OPERATING LEVERAGE', isSection: true },
  { key: 'opexToRevenuePct', label: 'OPEX / Revenue (↓ = leverage)', format: 'percent', colorFn: (v) => v <= 30 ? 'green' : v <= 60 ? 'amber' : 'red' },
  { key: 'revenuePerEmployee', label: 'Revenue / Employee (monthly)', colorFn: () => 'neutral' },
  { key: 'SECTION', label: 'GROWTH', isSection: true },
  { key: 'revenueGrowthPct', label: 'Revenue Growth (period)', format: 'percent', colorFn: (v) => v > 0 ? 'green' : v === 0 ? 'amber' : 'red' },
  { key: 'revenue', label: 'Revenue (Period)', isTotal: true },
  { key: 'netProfit', label: 'Net Profit (Period)', isTotal: true, colorFn: (v) => v >= 0 ? 'green' : 'red' },
  { key: 'SECTION', label: 'LIQUIDITY', isSection: true },
  { key: 'currentRatio', label: 'Current Ratio', format: 'ratio', colorFn: (v) => v >= 1.5 ? 'green' : v >= 1 ? 'amber' : 'red' },
  { key: 'arDays', label: 'AR Days (collect)', format: 'days' },
]

// ───── CELL FORMATTER ─────────────────────────────────────────────────────────

function formatCell(
  rawVal: number | null | undefined,
  row: StatementRowDef,
  nativeCurrency: string,
  displayCurrency: string,
): string {
  if (rawVal === null || rawVal === undefined) return '—'
  switch (row.format) {
    case 'percent': return `${rawVal.toFixed(1)}%`
    case 'ratio': return `${rawVal.toFixed(2)}x`
    case 'days': return `${Math.round(rawVal)}d`
    case 'number': return rawVal.toLocaleString()
    case 'balanceCheck':
      return Math.abs(rawVal) < 1
        ? '✓'
        : `Δ ${formatCurrencyCompact(convertAmount(rawVal, nativeCurrency, displayCurrency), displayCurrency)}`
    default: {
      const dispVal = convertAmount(rawVal, nativeCurrency, displayCurrency)
      return formatCurrencyCompact(dispVal, displayCurrency)
    }
  }
}

// ───── TRANSPOSED TABLE ───────────────────────────────────────────────────────

function ModelTable({
  projections, rowDefs, nativeCurrency, displayCurrency, isFX, disclaimer,
}: {
  projections: FullProjection[]
  rowDefs: StatementRowDef[]
  nativeCurrency: string
  displayCurrency: string
  isFX: boolean
  disclaimer?: string
}) {
  return (
    <div className="overflow-x-auto h-full">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200">
            <th className="sticky left-0 z-10 bg-slate-100 w-52 min-w-[208px] px-3 py-2 text-left text-[11px] font-semibold text-slate-500 border-r border-slate-200">
              Line Item
            </th>
            {projections.map((proj) => (
              <th key={proj.label} className="min-w-[90px] px-2 py-2 text-right text-[11px] font-semibold text-slate-500 border-r border-slate-200 last:border-r-0 whitespace-nowrap">
                {proj.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowDefs.map((row, ri) => {
            if (row.isSection) {
              return (
                <tr key={`sec-${ri}`} className="bg-brand-light/60 border-b border-slate-200">
                  <td colSpan={projections.length + 1} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-navy">
                    {row.label}
                  </td>
                </tr>
              )
            }
            const even = ri % 2 === 0
            return (
              <tr key={`${String(row.key)}-${ri}`} className={cn(
                'border-b border-slate-100 hover:bg-brand-light/20',
                even ? 'bg-white' : 'bg-slate-50/40',
              )}>
                <td className={cn(
                  'sticky left-0 z-10 px-3 py-2 border-r border-slate-200 select-none',
                  even ? 'bg-white' : 'bg-slate-50/40',
                  row.indent ? 'pl-6 text-slate-500' : 'text-slate-600',
                  row.isTotal && 'font-semibold text-slate-700',
                )}>
                  {row.label}
                </td>
                {projections.map((proj) => {
                  const rawVal = proj[row.key as keyof FullProjection] as number | null
                  const color = rawVal !== null && rawVal !== undefined && row.colorFn
                    ? row.colorFn(rawVal as number)
                    : null
                  return (
                    <td key={proj.label} className={cn(
                      'px-2 py-2 text-right border-r border-slate-100 last:border-r-0 tabular-nums',
                      row.isTotal && 'font-semibold',
                      color === 'red' ? 'text-red-500' :
                      color === 'green' ? 'text-emerald-600' :
                      color === 'amber' ? 'text-amber-500' :
                      'text-slate-700',
                    )}>
                      {formatCell(rawVal, row, nativeCurrency, displayCurrency)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {(disclaimer || isFX) && (
        <div className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
          {disclaimer}
          {isFX && (
            <span className={disclaimer ? 'ml-2 text-amber-500' : 'text-amber-500'}>
              Figures in {displayCurrency} at indicative FX rates.
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function RevenueStreamTable({ projections, nativeCurrency, displayCurrency, isFX }: {
  projections: FullProjection[]
  nativeCurrency: string
  displayCurrency: string
  isFX: boolean
}) {
  const firstStreams = projections[0]?.streamRevenues
  const streamNames = firstStreams && firstStreams.length > 0 ? firstStreams.map(s => s.name) : null

  const fmtRev = (v: number) =>
    formatCurrencyCompact(convertAmount(v, nativeCurrency, displayCurrency), displayCurrency)

  return (
    <div className="overflow-x-auto h-full">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-200">
            <th className="sticky left-0 z-10 bg-slate-100 w-52 min-w-[208px] px-3 py-2 text-left text-[11px] font-semibold text-slate-500 border-r border-slate-200">
              Revenue Stream
            </th>
            {projections.map((p) => (
              <th key={p.label} className="min-w-[90px] px-2 py-2 text-right text-[11px] font-semibold text-slate-500 border-r border-slate-200 last:border-r-0 whitespace-nowrap">
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-brand-light/60 border-b border-slate-200">
            <td colSpan={projections.length + 1} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-navy">
              Revenue by Stream
            </td>
          </tr>
          {streamNames ? streamNames.map((name, si) => (
            <tr key={`rev-${name}`} className={cn('border-b border-slate-100 hover:bg-brand-light/20', si % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
              <td className={cn('sticky left-0 z-10 pl-6 pr-3 py-2 border-r border-slate-200 text-slate-500', si % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
                {name}
              </td>
              {projections.map((p) => {
                const rev = p.streamRevenues?.[si]?.revenue ?? null
                return (
                  <td key={p.label} className="px-2 py-2 text-right border-r border-slate-100 last:border-r-0 tabular-nums text-slate-700">
                    {rev !== null ? fmtRev(rev) : '—'}
                  </td>
                )
              })}
            </tr>
          )) : (
            <tr className="border-b border-slate-100 bg-white">
              <td className="sticky left-0 z-10 px-3 py-2 border-r border-slate-200 text-slate-500 bg-white">Total Revenue</td>
              {projections.map((p) => (
                <td key={p.label} className="px-2 py-2 text-right border-r border-slate-100 last:border-r-0 tabular-nums text-slate-700">
                  {fmtRev(p.revenue)}
                </td>
              ))}
            </tr>
          )}
          <tr className="border-b border-slate-200 bg-brand-light/20">
            <td className="sticky left-0 z-10 px-3 py-2 border-r border-slate-200 font-semibold text-slate-700 bg-brand-light/20">
              Total Revenue
            </td>
            {projections.map((p) => (
              <td key={p.label} className="px-2 py-2 text-right border-r border-slate-100 last:border-r-0 tabular-nums font-semibold text-slate-700">
                {fmtRev(p.revenue)}
              </td>
            ))}
          </tr>

          <tr className="bg-brand-light/60 border-b border-slate-200">
            <td colSpan={projections.length + 1} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-navy">
              Gross Profit by Stream
            </td>
          </tr>
          {streamNames ? streamNames.map((name, si) => (
            <tr key={`gp-${name}`} className={cn('border-b border-slate-100 hover:bg-brand-light/20', si % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
              <td className={cn('sticky left-0 z-10 pl-6 pr-3 py-2 border-r border-slate-200 text-slate-500', si % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
                {name}
              </td>
              {projections.map((p) => {
                const s = p.streamRevenues?.[si]
                const gp = s ? s.revenue - s.cogs : null
                return (
                  <td key={p.label} className={cn('px-2 py-2 text-right border-r border-slate-100 last:border-r-0 tabular-nums', gp !== null && gp >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {gp !== null ? fmtRev(gp) : '—'}
                  </td>
                )
              })}
            </tr>
          )) : (
            <tr className="border-b border-slate-100 bg-white">
              <td className="sticky left-0 z-10 px-3 py-2 border-r border-slate-200 text-slate-500 bg-white">Gross Profit</td>
              {projections.map((p) => (
                <td key={p.label} className={cn('px-2 py-2 text-right border-r border-slate-100 last:border-r-0 tabular-nums', p.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                  {fmtRev(p.grossProfit)}
                </td>
              ))}
            </tr>
          )}
          <tr className="border-b border-slate-100 bg-brand-light/20">
            <td className="sticky left-0 z-10 px-3 py-2 border-r border-slate-200 font-semibold text-slate-700 bg-brand-light/20">
              Total Gross Profit
            </td>
            {projections.map((p) => (
              <td key={p.label} className={cn('px-2 py-2 text-right border-r border-slate-100 last:border-r-0 tabular-nums font-semibold', p.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {fmtRev(p.grossProfit)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-slate-100 bg-slate-50/40">
            <td className="sticky left-0 z-10 pl-6 pr-3 py-2 border-r border-slate-200 text-slate-500 bg-slate-50/40">
              Gross Margin %
            </td>
            {projections.map((p) => (
              <td key={p.label} className={cn('px-2 py-2 text-right border-r border-slate-100 last:border-r-0 tabular-nums', p.grossMarginPct >= 50 ? 'text-emerald-600' : p.grossMarginPct >= 25 ? 'text-amber-500' : 'text-red-500')}>
                {p.grossMarginPct.toFixed(1)}%
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      {isFX && (
        <div className="px-4 py-2 text-[10px] text-amber-500 border-t border-slate-100">
          Figures in {displayCurrency} at indicative FX rates.
        </div>
      )}
    </div>
  )
}

function EmptyModel({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <p className="text-sm font-medium text-slate-400">{message}</p>
      <p className="mt-1 text-xs text-slate-300">Complete the conversation to unlock this view.</p>
    </div>
  )
}

// ───── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function ModelSpreadsheet({ state }: { state: ConversationState }) {
  const { assumptions, businessType, modelPurpose } = state
  const nativeCurrency = assumptions.revenue_currency ?? 'USD'

  const [activeTab, setActiveTab] = useState<TabId>('actual')
  const [displayCurrency, setDisplayCurrency] = useState<string>(nativeCurrency)

  useEffect(() => {
    setActiveTab(STAGE_TAB[state.currentStage] ?? 'actual')
  }, [state.currentStage])

  useEffect(() => {
    if (!assumptions.revenue_currency) return
    setDisplayCurrency((prev) => (prev === nativeCurrency ? assumptions.revenue_currency! : prev))
  }, [assumptions.revenue_currency, nativeCurrency])

  const isFX = displayCurrency !== nativeCurrency
  const isModelTab = (['revenue', 'pl', 'bs', 'cf', 'ratios'] as TabId[]).includes(activeTab)

  const fmt = (v: number | null | undefined) =>
    v != null ? formatCurrency(convertAmount(v, nativeCurrency, displayCurrency), displayCurrency) : null

  const runwayMonths =
    assumptions.current_cash != null && assumptions.monthly_burn != null && assumptions.monthly_burn > 0
      ? Math.floor(assumptions.current_cash / assumptions.monthly_burn)
      : null

  const cogs =
    assumptions.monthly_revenue != null && assumptions.gross_margin != null
      ? assumptions.monthly_revenue * (1 - assumptions.gross_margin / 100)
      : null

  const grossProfit =
    assumptions.monthly_revenue != null && assumptions.gross_margin != null
      ? assumptions.monthly_revenue * (assumptions.gross_margin / 100)
      : null

  const opex =
    assumptions.monthly_burn != null && cogs != null
      ? Math.max(0, assumptions.monthly_burn - cogs)
      : assumptions.monthly_burn ?? null

  const operatingProfit = grossProfit != null && opex != null ? grossProfit - opex : null

  const revenuePerEmployee =
    assumptions.monthly_revenue != null && assumptions.team_size != null && assumptions.team_size > 0
      ? Math.round(assumptions.monthly_revenue / assumptions.team_size)
      : null

  // Build revenue streams array for multi-stream projection
  const revenueStreams: FullModelParams['revenueStreams'] = (() => {
    const raw = assumptions.revenue_streams
    if (!raw || raw.length === 0) return null
    const mapped = raw
      .filter((s): s is RevenueStream & { monthly_revenue: number } => s.monthly_revenue != null)
      .map(s => ({
        name: s.name,
        monthlyRevenue: s.monthly_revenue!,
        cogsMargin: s.cogs_margin ?? (1 - (assumptions.gross_margin ?? 40) / 100),
        priceGrowthAnnual: s.price_growth_annual ?? 0,
      }))
    return mapped.length > 0 ? mapped : null
  })()

  // Build full 3-statement model
  const projections = buildFullModel({
    monthlyRevenue: assumptions.monthly_revenue ?? null,
    monthlyCOGS: assumptions.monthly_cogs ?? null,
    growthRate: assumptions.growth_rate_monthly ?? null,
    monthlyBurn: assumptions.monthly_burn ?? null,
    grossMargin: assumptions.gross_margin ?? null,
    currentCash: assumptions.current_cash ?? null,
    horizon: modelPurpose?.horizon ?? null,
    granularity: modelPurpose?.granularity ?? null,
    loans: assumptions.loans ?? null,
    paidInCapital: assumptions.paid_in_capital ?? null,
    daysReceivable: assumptions.days_receivable ?? null,
    daysPayable: assumptions.days_payable ?? null,
    fixedAssets: assumptions.fixed_assets ?? null,
    capexMonthly: assumptions.capex_monthly ?? null,
    taxRate: assumptions.tax_rate ?? null,
    taxStartYear: assumptions.tax_start_year ?? null,
    depreciation: assumptions.depreciation_monthly ?? null,
    teamSize: assumptions.team_size ?? null,
    inventoryValue: assumptions.inventory_value ?? null,
    monthlyInterestIncome: assumptions.monthly_interest_income ?? null,
    founderSalaryMonthly: assumptions.founder_salary_monthly ?? null,
    revenueCurrency: assumptions.revenue_currency ?? null,
    priceGrowthAnnual: assumptions.price_growth_annual ?? null,
    salaryGrowthAnnual: assumptions.salary_growth_annual ?? null,
    revenueStreams,
  })

  // Revenue streams section for Actual tab
  const streamRows: Row[] = assumptions.revenue_streams && assumptions.revenue_streams.length > 1
    ? assumptions.revenue_streams.map(s => ({
        label: s.name,
        value: s.monthly_revenue != null ? fmt(s.monthly_revenue) : null,
        indent: true,
      }))
    : []

  // Actual tab
  const actualSections: { title: string; rows: Row[] }[] = [
    {
      title: 'Income Statement',
      rows: [
        {
          label: assumptions.is_pre_revenue ? 'Revenue (Pre-revenue)' : 'Monthly Revenue',
          value: assumptions.is_pre_revenue ? 'Pre-revenue' : fmt(assumptions.monthly_revenue),
        },
        ...streamRows,
        { label: 'Cost of Goods (COGS)', value: fmt(cogs), indent: true },
        { label: 'Gross Profit', value: fmt(grossProfit) },
        { label: 'Gross Margin', value: assumptions.gross_margin != null ? `${assumptions.gross_margin}%` : null },
        { label: 'Operating Costs', value: fmt(opex), indent: true },
        {
          label: 'Operating Profit',
          value: fmt(operatingProfit),
          status: operatingProfit != null ? (operatingProfit < 0 ? 'danger' : 'good') : undefined,
        },
      ],
    },
    {
      title: 'Cash Position',
      rows: [
        { label: 'Cash in Bank', value: fmt(assumptions.current_cash) },
        { label: 'Monthly Burn', value: fmt(assumptions.monthly_burn) },
        {
          label: 'Runway',
          value: runwayMonths != null ? `~${runwayMonths} months` : null,
          status: runwayMonths != null
            ? runwayMonths < 6 ? 'danger' : runwayMonths < 12 ? 'warning' : 'good'
            : undefined,
        },
      ],
    },
    {
      title: 'Business Metrics',
      rows: [
        { label: 'Customers', value: assumptions.customer_count != null ? assumptions.customer_count.toLocaleString() : null },
        { label: 'Team Size', value: assumptions.team_size != null ? `${assumptions.team_size} people` : null },
        { label: 'Revenue / Head', value: fmt(revenuePerEmployee) },
        { label: 'Pricing Model', value: assumptions.pricing_model ?? null },
        { label: 'Business Type', value: businessType ? (BUSINESS_TYPE_LABELS[businessType] ?? businessType) : null },
      ],
    },
  ]

  // Assumptions tab
  const assumptionsSections: { title: string; rows: Row[] }[] = [
    {
      title: 'Model Setup',
      rows: [
        { label: 'Purpose', value: modelPurpose?.type ? (PURPOSE_LABELS[modelPurpose.type] ?? null) : null },
        { label: 'Time Horizon', value: modelPurpose?.horizon ? (HORIZON_LABELS[modelPurpose.horizon] ?? null) : null },
        { label: 'Granularity', value: modelPurpose?.granularity ? modelPurpose.granularity.charAt(0).toUpperCase() + modelPurpose.granularity.slice(1) : null },
        { label: 'Audience', value: modelPurpose?.audience ? (AUDIENCE_LABELS[modelPurpose.audience] ?? null) : null },
      ],
    },
    {
      title: 'Revenue Drivers',
      rows: [
        { label: 'Revenue Currency', value: assumptions.revenue_currency ?? null },
        { label: 'Cost Currency', value: assumptions.cost_currency ?? null },
        { label: 'Multi-currency', value: assumptions.is_multi_currency != null ? (assumptions.is_multi_currency ? 'Yes' : 'No') : null },
        { label: 'Monthly Growth Rate', value: assumptions.growth_rate_monthly != null ? `${assumptions.growth_rate_monthly}% / month` : null },
        { label: 'Price Growth (annual)', value: assumptions.price_growth_annual != null ? `${assumptions.price_growth_annual}% / yr` : null },
        { label: 'Gross Margin Target', value: assumptions.gross_margin != null ? `${assumptions.gross_margin}%` : null },
        { label: 'Pricing Model', value: assumptions.pricing_model ?? null },
        { label: 'Customer Count', value: assumptions.customer_count != null ? assumptions.customer_count.toLocaleString() : null },
        ...(assumptions.revenue_streams && assumptions.revenue_streams.length > 0
          ? assumptions.revenue_streams.map(s => ({
              label: `→ ${s.name}`,
              value: [
                s.monthly_revenue != null ? fmt(s.monthly_revenue) : null,
                s.cogs_margin != null ? `${Math.round(s.cogs_margin * 100)}% COGS` : null,
                s.price_growth_annual != null ? `+${s.price_growth_annual}%/yr` : null,
              ].filter(Boolean).join(' · ') || null,
              indent: true,
            }))
          : []),
      ],
    },
    {
      title: 'Cost Assumptions',
      rows: [
        { label: 'Monthly Burn', value: fmt(assumptions.monthly_burn) },
        { label: 'Team Size', value: assumptions.team_size != null ? `${assumptions.team_size} people` : null },
        { label: 'Salary Growth (annual)', value: assumptions.salary_growth_annual != null ? `${assumptions.salary_growth_annual}% / yr` : null },
        { label: 'COGS (monthly)', value: fmt(cogs) },
      ],
    },
    {
      title: 'Balance Sheet Inputs',
      rows: [
        { label: 'Outstanding Loans', value: fmt(assumptions.loans) },
        { label: 'Equity Raised', value: fmt(assumptions.paid_in_capital) },
        { label: 'Fixed Assets', value: fmt(assumptions.fixed_assets) },
        { label: 'Monthly Capex', value: fmt(assumptions.capex_monthly) },
        { label: 'Inventory Value', value: fmt(assumptions.inventory_value) },
      ],
    },
    {
      title: 'Working Capital & Tax',
      rows: [
        { label: 'AR Days (collect)', value: assumptions.days_receivable != null ? `${assumptions.days_receivable} days` : null },
        { label: 'AP Days (pay)', value: assumptions.days_payable != null ? `${assumptions.days_payable} days` : null },
        { label: 'Corporate Tax Rate', value: assumptions.tax_rate != null ? `${assumptions.tax_rate}%` : null },
        { label: 'Depreciation (monthly)', value: fmt(assumptions.depreciation_monthly) },
      ],
    },
  ]

  const businessDesc = [
    businessType ? BUSINESS_TYPE_LABELS[businessType] : null,
    assumptions.business_name,
  ].filter(Boolean).join(' · ')

  let r = 1
  function renderSections(sections: { title: string; rows: Row[] }[]) {
    r = 1
    const elements: React.ReactNode[] = []
    for (const section of sections) {
      elements.push(<SectionHeader key={section.title} rowNum={r++} title={section.title} />)
      section.rows.forEach((row, i) => {
        elements.push(
          <SheetRow key={row.label} rowNum={r++} label={row.label} value={row.value} status={row.status} even={i % 2 === 0} indent={row.indent} />
        )
      })
    }
    const padCount = Math.max(0, 14 - r)
    for (let i = 0; i < padCount; i++) {
      elements.push(<PadRow key={`pad-${i}`} rowNum={r++} even={i % 2 === 0} />)
    }
    return elements
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Title bar */}
      <div className="shrink-0 border-b border-slate-200 bg-brand-navy px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Financial Model</p>
            <h2 className="mt-0.5 text-sm font-semibold text-white">
              {assumptions.business_name ?? 'Your Business'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {isFX && <span className="text-[10px] text-amber-300">indicative FX</span>}
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value)}
                className="rounded bg-white/10 px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
              >
                {DISPLAY_CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-brand-navy text-white">{c}</option>
                ))}
              </select>
            </div>
            {businessType && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                {BUSINESS_TYPE_LABELS[businessType] ?? businessType}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Formula bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5">
        <span className="min-w-[36px] rounded border border-slate-200 bg-white px-1.5 py-0.5 text-center font-mono text-[11px] text-slate-500">A1</span>
        <span className="text-xs italic text-slate-400">fx</span>
        <span className="flex-1 truncate text-xs text-slate-500">{businessDesc || 'Waiting for data…'}</span>
        <span className="shrink-0 rounded bg-brand-light px-2 py-0.5 text-[10px] font-medium text-brand-navy">
          Stage {state.currentStage} / 6
        </span>
      </div>

      {/* Column headers — Actual and Assumptions only */}
      {!isModelTab && (
        <div className="flex shrink-0 border-b border-slate-200 bg-slate-100 text-[11px] font-medium text-slate-400 select-none">
          <div className="w-8 shrink-0 border-r border-slate-200 py-1 text-center">#</div>
          <div className="w-44 shrink-0 border-r border-slate-200 px-3 py-1">A</div>
          <div className="flex-1 px-3 py-1">B</div>
        </div>
      )}

      {/* Data area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'actual' && renderSections(actualSections)}
        {activeTab === 'assumptions' && renderSections(assumptionsSections)}
        {activeTab === 'revenue' && (
          projections
            ? <RevenueStreamTable projections={projections} nativeCurrency={nativeCurrency} displayCurrency={displayCurrency} isFX={isFX} />
            : <EmptyModel message="Revenue breakdown needs at least one revenue figure." />
        )}
        {activeTab === 'pl' && (
          projections
            ? <ModelTable projections={projections} rowDefs={PL_ROWS} nativeCurrency={nativeCurrency} displayCurrency={displayCurrency} isFX={isFX} disclaimer="Salaries grow by salary_growth_annual if provided, else flat. COGS margin compresses if price_growth_annual is set. Marketing and G&A are flat unless burn is revised." />
            : <EmptyModel message="P&L needs revenue data to project." />
        )}
        {activeTab === 'bs' && (
          projections
            ? <ModelTable projections={projections} rowDefs={BS_ROWS} nativeCurrency={nativeCurrency} displayCurrency={displayCurrency} isFX={isFX} disclaimer="Opening retained earnings derived to balance. Loans assumed constant over projection period." />
            : <EmptyModel message="Balance sheet needs revenue, cash, and financing data." />
        )}
        {activeTab === 'cf' && (
          projections
            ? <ModelTable projections={projections} rowDefs={CF_ROWS} nativeCurrency={nativeCurrency} displayCurrency={displayCurrency} isFX={isFX} disclaimer="Financing CF assumes no new debt or equity raised during the projection." />
            : <EmptyModel message="Cash flow statement needs revenue and cost data." />
        )}
        {activeTab === 'ratios' && (
          projections
            ? <ModelTable projections={projections} rowDefs={RATIO_ROWS} nativeCurrency={nativeCurrency} displayCurrency={displayCurrency} isFX={isFX} />
            : <EmptyModel message="Ratios need complete financial data." />
        )}
      </div>

      {/* Tab bar — Excel style */}
      <div className="shrink-0 flex items-end gap-0.5 border-t border-slate-200 bg-slate-100 px-3 pt-1.5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-t-md border-l border-r border-t px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-slate-300 bg-white text-brand-navy'
                : 'border-transparent bg-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-700',
            )}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1 border-b border-slate-200 min-w-0" />
      </div>
    </div>
  )
}
