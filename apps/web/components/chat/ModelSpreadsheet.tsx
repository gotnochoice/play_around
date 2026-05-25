'use client'

import { useState, useEffect } from 'react'
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import type { ConversationState, StageId } from '@/types'

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

interface Row {
  label: string
  value: string | null
  status?: 'danger' | 'warning' | 'good'
  indent?: boolean
}

type TabId = 'actual' | 'assumptions' | 'model'

const TABS: { id: TabId; label: string }[] = [
  { id: 'actual', label: 'Actual' },
  { id: 'assumptions', label: 'Assumptions' },
  { id: 'model', label: 'Financial Model' },
]

const STAGE_TAB: Record<number, TabId> = {
  0: 'actual', 1: 'actual', 2: 'actual', 3: 'actual', 4: 'actual',
  5: 'assumptions', 6: 'model',
}

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

function ModelRow({ rowNum, period, revenue, grossProfit, netPL, cash, even, isHeader }: {
  rowNum: number | string; period: string
  revenue: string | null; grossProfit: string | null; netPL: string | null; cash: string | null
  even: boolean; isHeader?: boolean
}) {
  const isLoss = typeof netPL === 'string' && netPL.startsWith('-')
  const isCashNeg = typeof cash === 'string' && cash.startsWith('-')

  return (
    <div className={cn(
      'flex items-center border-b border-slate-100 text-xs',
      isHeader ? 'bg-slate-100 font-semibold text-slate-500' : even ? 'bg-white' : 'bg-slate-50/40',
    )}>
      <div className="w-8 shrink-0 border-r border-slate-100 py-2 text-center text-[10px] text-slate-300 select-none">{rowNum}</div>
      <div className={cn('w-20 shrink-0 border-r border-slate-100 px-2 py-2 select-none', isHeader ? 'text-slate-500' : 'font-medium text-slate-600')}>{period}</div>
      <div className="flex-1 border-r border-slate-100 px-2 py-2 text-right font-medium text-slate-800">{revenue ?? '—'}</div>
      <div className="flex-1 border-r border-slate-100 px-2 py-2 text-right font-medium text-slate-800">{grossProfit ?? '—'}</div>
      <div className={cn('flex-1 border-r border-slate-100 px-2 py-2 text-right font-medium', isHeader ? '' : isLoss ? 'text-red-500' : 'text-emerald-600')}>{netPL ?? '—'}</div>
      <div className={cn('flex-1 px-2 py-2 text-right font-medium', isHeader ? '' : isCashNeg ? 'text-red-500' : 'text-slate-800')}>{cash ?? '—'}</div>
    </div>
  )
}

interface ProjectionPeriod {
  label: string
  revenue: string
  grossProfit: string
  netPL: string
  cash: string
}

function buildProjections(
  monthlyRevenue: number | null,
  growthRate: number | null,
  monthlyBurn: number | null,
  grossMargin: number | null,
  currentCash: number | null,
  horizon: string | null,
  granularity: string | null,
  revCurrency: string,
  displayCurrency: string,
): ProjectionPeriod[] | null {
  if (!monthlyRevenue) return null

  const growth = (growthRate ?? 0) / 100
  const margin = (grossMargin ?? 60) / 100
  const burn = monthlyBurn ?? monthlyRevenue * 1.5

  let periods: { label: string; months: number }[] = []

  if (granularity === 'annual') {
    const years = horizon === '5yr' ? 5 : horizon === '3yr' ? 3 : 1
    for (let y = 1; y <= years; y++) periods.push({ label: `Year ${y}`, months: 12 })
  } else if (granularity === 'quarterly') {
    const totalMonths = horizon === '5yr' ? 60 : horizon === '3yr' ? 36 : 12
    for (let q = 1; q <= totalMonths / 3; q++) periods.push({ label: `Q${q}`, months: 3 })
  } else {
    for (let m = 1; m <= 12; m++) periods.push({ label: `M${m}`, months: 1 })
  }

  let cumulativeMonth = 0
  let cashBalance = currentCash ?? 0

  const fmt = (n: number) =>
    formatCurrencyCompact(convertAmount(n, revCurrency, displayCurrency), displayCurrency)

  return periods.map(({ label, months }) => {
    let periodRevenue = 0
    let periodCost = 0

    for (let m = 0; m < months; m++) {
      periodRevenue += monthlyRevenue * Math.pow(1 + growth, cumulativeMonth)
      periodCost += burn
      cumulativeMonth++
    }

    const grossProfit = periodRevenue * margin
    const netPL = periodRevenue - periodCost
    cashBalance += netPL

    return {
      label,
      revenue: fmt(periodRevenue),
      grossProfit: fmt(grossProfit),
      netPL: netPL < 0 ? `-${fmt(Math.abs(netPL))}` : fmt(netPL),
      cash: cashBalance < 0 ? `-${fmt(Math.abs(cashBalance))}` : fmt(cashBalance),
    }
  })
}

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

  const fmt = (v: number | null | undefined) =>
    v != null ? formatCurrency(convertAmount(v, nativeCurrency, displayCurrency), displayCurrency) : null

  const runwayMonths =
    assumptions.current_cash != null && assumptions.monthly_burn != null && assumptions.monthly_burn > 0
      ? Math.floor(assumptions.current_cash / assumptions.monthly_burn)
      : null

  const revenuePerEmployee =
    assumptions.monthly_revenue != null && assumptions.team_size != null && assumptions.team_size > 0
      ? Math.round(assumptions.monthly_revenue / assumptions.team_size)
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

  const operatingProfit =
    grossProfit != null && opex != null ? grossProfit - opex : null

  const actualSections: { title: string; rows: Row[] }[] = [
    {
      title: 'Income Statement',
      rows: [
        {
          label: assumptions.is_pre_revenue ? 'Revenue (Pre-revenue)' : 'Monthly Revenue',
          value: assumptions.is_pre_revenue ? 'Pre-revenue' : fmt(assumptions.monthly_revenue),
        },
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
        { label: 'Gross Margin Target', value: assumptions.gross_margin != null ? `${assumptions.gross_margin}%` : null },
        { label: 'Pricing Model', value: assumptions.pricing_model ?? null },
        { label: 'Customer Count', value: assumptions.customer_count != null ? assumptions.customer_count.toLocaleString() : null },
      ],
    },
    {
      title: 'Cost Assumptions',
      rows: [
        { label: 'Monthly Burn', value: fmt(assumptions.monthly_burn) },
        { label: 'Team Size', value: assumptions.team_size != null ? `${assumptions.team_size} people` : null },
        { label: 'COGS (monthly)', value: fmt(cogs) },
      ],
    },
  ]

  const projections = buildProjections(
    assumptions.monthly_revenue ?? null,
    assumptions.growth_rate_monthly ?? null,
    assumptions.monthly_burn ?? null,
    assumptions.gross_margin ?? null,
    assumptions.current_cash ?? null,
    modelPurpose?.horizon ?? null,
    modelPurpose?.granularity ?? null,
    nativeCurrency,
    displayCurrency,
  )

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
      <div className="shrink-0 border-b border-slate-200 bg-brand-navy px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Financial Model</p>
            <h2 className="mt-0.5 text-sm font-semibold text-white">{assumptions.business_name ?? 'Your Business'}</h2>
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

      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5">
        <span className="min-w-[36px] rounded border border-slate-200 bg-white px-1.5 py-0.5 text-center font-mono text-[11px] text-slate-500">A1</span>
        <span className="text-xs italic text-slate-400">fx</span>
        <span className="flex-1 truncate text-xs text-slate-500">{businessDesc || 'Waiting for data…'}</span>
        <span className="shrink-0 rounded bg-brand-light px-2 py-0.5 text-[10px] font-medium text-brand-navy">
          Stage {state.currentStage} / 6
        </span>
      </div>

      {activeTab === 'model' ? (
        <ModelRow rowNum="#" period="Period" revenue="Revenue" grossProfit="Gross Profit" netPL="Net P&L" cash="Cash Balance" even={false} isHeader />
      ) : (
        <div className="flex shrink-0 border-b border-slate-200 bg-slate-100 text-[11px] font-medium text-slate-400 select-none">
          <div className="w-8 shrink-0 border-r border-slate-200 py-1 text-center">#</div>
          <div className="w-44 shrink-0 border-r border-slate-200 px-3 py-1">A</div>
          <div className="flex-1 px-3 py-1">B</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'actual' && renderSections(actualSections)}
        {activeTab === 'assumptions' && renderSections(assumptionsSections)}
        {activeTab === 'model' && (
          projections ? (
            <>
              {projections.map((p, i) => (
                <ModelRow key={p.label} rowNum={i + 1} period={p.label} revenue={p.revenue} grossProfit={p.grossProfit} netPL={p.netPL} cash={p.cash} even={i % 2 === 0} />
              ))}
              {isFX && (
                <div className="px-4 py-2 text-[10px] text-amber-600 bg-amber-50 border-t border-amber-100">
                  Figures converted from {nativeCurrency} to {displayCurrency} using indicative FX rates. Confirm live rates before finalising.
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
              <p className="text-sm font-medium text-slate-400">Complete the conversation to unlock projections</p>
              <p className="mt-1 text-xs text-slate-300">Revenue, growth rate and burn are needed to build this model.</p>
            </div>
          )
        )}
      </div>

      <div className="shrink-0 flex items-end gap-0.5 border-t border-slate-200 bg-slate-100 px-3 pt-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-t-md border-l border-r border-t px-4 py-1.5 text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'border-slate-300 bg-white text-brand-navy'
                : 'border-transparent bg-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-700',
            )}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1 border-b border-slate-200" />
      </div>
    </div>
  )
}
