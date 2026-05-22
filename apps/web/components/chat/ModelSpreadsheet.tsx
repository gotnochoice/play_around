'use client'

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
}

interface Section {
  title: string
  rows: Row[]
}

export function ModelSpreadsheet({ state }: { state: ConversationState }) {
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

  const sections: Section[] = [
    {
      title: 'Model Setup',
      rows: [
        {
          label: 'Purpose',
          value: modelPurpose?.type ? (PURPOSE_LABELS[modelPurpose.type] ?? modelPurpose.type) : null,
        },
        {
          label: 'Time Horizon',
          value: modelPurpose?.horizon ? (HORIZON_LABELS[modelPurpose.horizon] ?? modelPurpose.horizon) : null,
        },
        {
          label: 'Granularity',
          value: modelPurpose?.granularity
            ? modelPurpose.granularity.charAt(0).toUpperCase() + modelPurpose.granularity.slice(1)
            : null,
        },
        {
          label: 'Audience',
          value: modelPurpose?.audience ? (AUDIENCE_LABELS[modelPurpose.audience] ?? modelPurpose.audience) : null,
        },
      ],
    },
    {
      title: 'Business',
      rows: [
        { label: 'Founder', value: assumptions.founder_name ?? null },
        { label: 'Business Name', value: assumptions.business_name ?? null },
        {
          label: 'Business Type',
          value: businessType ? (BUSINESS_TYPE_LABELS[businessType] ?? businessType) : null,
        },
        { label: 'Revenue Currency', value: assumptions.revenue_currency ?? null },
        { label: 'Cost Currency', value: assumptions.cost_currency ?? null },
      ],
    },
    {
      title: 'Revenue',
      rows: [
        {
          label: 'Monthly Revenue',
          value: assumptions.is_pre_revenue
            ? 'Pre-revenue'
            : assumptions.monthly_revenue != null
              ? formatCurrency(assumptions.monthly_revenue, currency)
              : null,
        },
        {
          label: 'Gross Margin',
          value: assumptions.gross_margin != null ? `${assumptions.gross_margin}%` : null,
        },
        {
          label: 'Customer Count',
          value: assumptions.customer_count != null ? assumptions.customer_count.toLocaleString() : null,
        },
      ],
    },
    {
      title: 'Financial Position',
      rows: [
        {
          label: 'Cash in Bank',
          value: assumptions.current_cash != null ? formatCurrency(assumptions.current_cash, currency) : null,
        },
        {
          label: 'Monthly Burn',
          value: assumptions.monthly_burn != null ? formatCurrency(assumptions.monthly_burn, currency) : null,
        },
        {
          label: 'Runway',
          value: runwayMonths != null ? `~${runwayMonths} months` : null,
          status:
            runwayMonths != null
              ? runwayMonths < 6
                ? 'danger'
                : runwayMonths < 12
                  ? 'warning'
                  : 'good'
              : undefined,
        },
      ],
    },
    {
      title: 'Operations',
      rows: [
        {
          label: 'Team Size',
          value: assumptions.team_size != null ? `${assumptions.team_size} people` : null,
        },
        {
          label: 'Revenue / Employee',
          value: revenuePerEmployee != null ? formatCurrency(revenuePerEmployee, currency) : null,
        },
      ],
    },
  ]

  let rowNum = 1

  const businessDesc = [
    businessType ? BUSINESS_TYPE_LABELS[businessType] : null,
    assumptions.business_name,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
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

      <div className="flex shrink-0 border-b border-slate-200 bg-slate-100 text-[11px] font-medium text-slate-400">
        <div className="w-8 shrink-0 border-r border-slate-200 py-1 text-center">#</div>
        <div className="w-44 shrink-0 border-r border-slate-200 px-3 py-1">A</div>
        <div className="flex-1 px-3 py-1">B</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="flex items-center border-b border-slate-200 bg-indigo-50/70">
              <div className="w-8 shrink-0 border-r border-slate-200 py-2 text-center text-[10px] text-slate-400">
                {rowNum++}
              </div>
              <div className="w-44 shrink-0 border-r border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                {section.title}
              </div>
              <div className="flex-1 px-3 py-2" />
            </div>

            {section.rows.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  'flex items-center border-b border-slate-100 transition-colors',
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                  row.value && 'hover:bg-indigo-50/30',
                )}
              >
                <div className="w-8 shrink-0 border-r border-slate-100 py-2 text-center text-[10px] text-slate-300">
                  {rowNum++}
                </div>
                <div className="w-44 shrink-0 border-r border-slate-100 px-3 py-2 text-xs text-slate-500">
                  {row.label}
                </div>
                <div
                  className={cn(
                    'flex-1 px-3 py-2 text-sm transition-all duration-500',
                    row.value
                      ? cn(
                          'font-medium',
                          row.status === 'danger' && 'text-red-500',
                          row.status === 'warning' && 'text-amber-500',
                          row.status === 'good' && 'text-emerald-600',
                          !row.status && 'text-slate-800',
                        )
                      : 'text-slate-300',
                  )}
                >
                  {row.value ?? '—'}
                </div>
              </div>
            ))}
          </div>
        ))}

        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`pad-${i}`}
            className={cn(
              'flex items-center border-b border-slate-100',
              i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
            )}
          >
            <div className="w-8 shrink-0 border-r border-slate-100 py-2.5 text-center text-[10px] text-slate-200">
              {rowNum++}
            </div>
            <div className="w-44 shrink-0 border-r border-slate-100 px-3 py-2.5" />
            <div className="flex-1 px-3 py-2.5" />
          </div>
        ))}
      </div>
    </div>
  )
}
