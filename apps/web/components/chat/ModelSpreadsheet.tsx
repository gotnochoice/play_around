'use client'

import { useState } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import type { ConversationState } from '@/types'

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

interface Row {
  label: string
  value: string | null
  status?: 'danger' | 'warning' | 'good'
  note?: string
}

type TabId = 'overview' | 'revenue' | 'financials'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'financials', label: 'Financials' },
]

function Cell({ value, status, className }: { value: string | null; status?: Row['status']; className?: string }) {
  return (
    <div
      className={cn(
        'flex-1 px-3 py-2 text-sm transition-all duration-500',
        value
          ? cn(
              'font-medium',
              status === 'danger' && 'text-red-500',
              status === 'warning' && 'text-amber-500',
              status === 'good' && 'text-emerald-600',
              !status && 'text-slate-800',
            )
          : 'text-slate-300',
        className,
      )}
    >
      {value ?? '—'}
    </div>
  )
}

function SheetRow({ rowNum, label, value, status, even }: { rowNum: number; label: string; value: string | null; status?: Row['status']; even: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center border-b border-slate-100 transition-colors',
        even ? 'bg-white' : 'bg-slate-50/40',
        value && 'hover:bg-indigo-50/20',
      )}
    >
      <div className="w-8 shrink-0 border-r border-slate-100 py-2 text-center text-[10px] text-slate-300 select-none">
        {rowNum}
      </div>
      <div className="w-44 shrink-0 border-r border-slate-100 px-3 py-2 text-xs text-slate-500 select-none">
        {label}
      </div>
      <Cell value={value} status={status} />
    </div>
  )
}

function SectionHeader({ rowNum, title }: { rowNum: number; title: string }) {
  return (
    <div className="flex items-center border-b border-slate-200 bg-indigo-50/60">
      <div className="w-8 shrink-0 border-r border-slate-200 py-2 text-center text-[10px] text-slate-400 select-none">
        {rowNum}
      </div>
      <div className="w-44 shrink-0 border-r border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-700 select-none">
        {title}
      </div>
      <div className="flex-1 bg-indigo-50/30 px-3 py-2" />
    </div>
  )
}

function PadRow({ rowNum, even }: { rowNum: number; even: boolean }) {
  return (
    <div className={cn('flex items-center border-b border-slate-100', even ? 'bg-white' : 'bg-slate-50/40')}>
      <div className="w-8 shrink-0 border-r border-slate-100 py-2.5 text-center text-[10px] text-slate-200 select-none">
        {rowNum}
      </div>
      <div className="w-44 shrink-0 border-r border-slate-100 px-3 py-2.5" />
      <div className="flex-1 px-3 py-2.5" />
    </div>
  )
}

export function ModelSpreadsheet({ state }: { state: ConversationState }) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const { assumptions, businessType, modelPurpose } = state
  const currency = assumptions.revenue_currency ?? undefined

  const runwayMonths =
    assumptions.current_cash != null && assumptions.monthly_burn != null && assumptions.monthly_burn > 0
      ? Math.floor(assumptions.current_cash / assumptions.monthly_burn)
      : null

  const revenuePerEmployee =
    assumptions.monthly_revenue != null && assumptions.team_size != null && assumptions.team_size > 0
      ? Math.round(assumptions.monthly_revenue / assumptions.team_size)
      : null

  const overviewRows: Row[] = [
    { label: 'Purpose', value: modelPurpose?.type ? (PURPOSE_LABELS[modelPurpose.type] ?? null) : null },
    { label: 'Time Horizon', value: modelPurpose?.horizon ? (HORIZON_LABELS[modelPurpose.horizon] ?? null) : null },
    { label: 'Granularity', value: modelPurpose?.granularity ? modelPurpose.granularity.charAt(0).toUpperCase() + modelPurpose.granularity.slice(1) : null },
    { label: 'Audience', value: modelPurpose?.audience ? (AUDIENCE_LABELS[modelPurpose.audience] ?? null) : null },
  ]

  const businessRows: Row[] = [
    { label: 'Founder', value: assumptions.founder_name ?? null },
    { label: 'Business Name', value: assumptions.business_name ?? null },
    { label: 'Business Type', value: businessType ? (BUSINESS_TYPE_LABELS[businessType] ?? businessType) : null },
    { label: 'Revenue Currency', value: assumptions.revenue_currency ?? null },
    { label: 'Cost Currency', value: assumptions.cost_currency ?? null },
  ]

  const revenueRows: Row[] = [
    {
      label: 'Monthly Revenue',
      value: assumptions.is_pre_revenue
        ? 'Pre-revenue'
        : assumptions.monthly_revenue != null
          ? formatCurrency(assumptions.monthly_revenue, currency)
          : null,
    },
    { label: 'Gross Margin', value: assumptions.gross_margin != null ? `${assumptions.gross_margin}%` : null },
    { label: 'Customer Count', value: assumptions.customer_count != null ? assumptions.customer_count.toLocaleString() : null },
    { label: 'Pricing Model', value: assumptions.pricing_model ?? null },
  ]

  const financialRows: Row[] = [
    { label: 'Cash in Bank', value: assumptions.current_cash != null ? formatCurrency(assumptions.current_cash, currency) : null },
    { label: 'Monthly Burn', value: assumptions.monthly_burn != null ? formatCurrency(assumptions.monthly_burn, currency) : null },
    {
      label: 'Runway',
      value: runwayMonths != null ? `~${runwayMonths} months` : null,
      status: runwayMonths != null ? (runwayMonths < 6 ? 'danger' : runwayMonths < 12 ? 'warning' : 'good') : undefined,
    },
    { label: 'Team Size', value: assumptions.team_size != null ? `${assumptions.team_size} people` : null },
    { label: 'Revenue / Employee', value: revenuePerEmployee != null ? formatCurrency(revenuePerEmployee, currency) : null },
  ]

  const businessDesc = [
    businessType ? BUSINESS_TYPE_LABELS[businessType] : null,
    assumptions.business_name,
  ].filter(Boolean).join(' · ')

  let r = 1

  function renderRows(sections: { title: string; rows: Row[] }[]) {
    r = 1
    const elements: React.ReactNode[] = []
    for (const section of sections) {
      elements.push(<SectionHeader key={section.title} rowNum={r++} title={section.title} />)
      section.rows.forEach((row, i) => {
        elements.push(
          <SheetRow key={row.label} rowNum={r++} label={row.label} value={row.value} status={row.status} even={i % 2 === 0} />
        )
      })
    }
    const padCount = Math.max(0, 12 - r)
    for (let i = 0; i < padCount; i++) {
      elements.push(<PadRow key={`pad-${i}`} rowNum={r++} even={i % 2 === 0} />)
    }
    return elements
  }

  const tabContent: Record<TabId, { title: string; rows: Row[] }[]> = {
    overview: [
      { title: 'Model Setup', rows: overviewRows },
      { title: 'Business', rows: businessRows },
    ],
    revenue: [
      { title: 'Revenue', rows: revenueRows },
    ],
    financials: [
      { title: 'Financial Position', rows: financialRows },
    ],
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Title bar */}
      <div className="shrink-0 border-b border-slate-200 bg-brand-navy px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Financial Model
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-white">
              {assumptions.business_name ?? 'Your Business'}
            </h2>
          </div>
          {businessType && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              {BUSINESS_TYPE_LABELS[businessType] ?? businessType}
            </span>
          )}
        </div>
      </div>

      {/* Formula bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-1.5">
        <span className="min-w-[36px] rounded border border-slate-200 bg-white px-1.5 py-0.5 text-center font-mono text-[11px] text-slate-500">
          A1
        </span>
        <span className="text-xs italic text-slate-400">fx</span>
        <span className="flex-1 truncate text-xs text-slate-500">
          {businessDesc || 'Waiting for data…'}
        </span>
        <span className="shrink-0 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
          Stage {state.currentStage} / 6
        </span>
      </div>

      {/* Column headers */}
      <div className="flex shrink-0 border-b border-slate-200 bg-slate-100 text-[11px] font-medium text-slate-400 select-none">
        <div className="w-8 shrink-0 border-r border-slate-200 py-1 text-center">#</div>
        <div className="w-44 shrink-0 border-r border-slate-200 px-3 py-1">A</div>
        <div className="flex-1 px-3 py-1">B</div>
      </div>

      {/* Data rows */}
      <div className="flex-1 overflow-y-auto">
        {renderRows(tabContent[activeTab])}
      </div>

      {/* Tab bar */}
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
