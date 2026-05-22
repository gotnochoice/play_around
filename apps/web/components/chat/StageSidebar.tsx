'use client'

import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { STAGES } from '@/lib/ai/stages'
import type { ConversationState } from '@/types'

interface StageSidebarProps {
  state: ConversationState
}

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

export function StageSidebar({ state }: StageSidebarProps) {
  const { currentStage, completedStages, businessType, assumptions } = state

  const captured = [
    {
      label: 'Business type',
      value: businessType ? BUSINESS_TYPE_LABELS[businessType] : null,
    },
    {
      label: 'Business name',
      value: assumptions.business_name ?? null,
    },
    {
      label: 'Cash available',
      value: assumptions.current_cash !== null && assumptions.current_cash !== undefined
        ? formatCurrency(assumptions.current_cash)
        : null,
    },
    {
      label: 'Monthly revenue',
      value: assumptions.monthly_revenue !== null && assumptions.monthly_revenue !== undefined
        ? formatCurrency(assumptions.monthly_revenue)
        : assumptions.is_pre_revenue ? 'Pre-revenue' : null,
    },
    {
      label: 'Monthly burn',
      value: assumptions.monthly_burn !== null && assumptions.monthly_burn !== undefined
        ? formatCurrency(assumptions.monthly_burn)
        : null,
    },
    {
      label: 'Team size',
      value: assumptions.team_size !== null && assumptions.team_size !== undefined
        ? `${assumptions.team_size} people`
        : null,
    },
  ].filter((item) => item.value !== null)

  const runwayMonths =
    assumptions.current_cash &&
    assumptions.monthly_burn &&
    assumptions.monthly_burn > 0
      ? Math.floor(assumptions.current_cash / assumptions.monthly_burn)
      : null

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-brand-navy text-white">
      {/* Logo */}
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue text-xs font-bold">
            FD
          </div>
          <span className="font-semibold tracking-tight">FounderDeck</span>
        </div>
        <p className="mt-1 text-xs text-white/50">Your Personal Financial Model Builder</p>
      </div>

      {/* Stages */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <p className="mb-3 px-2 text-xs font-medium uppercase tracking-widest text-white/40">
          Progress
        </p>
        <nav className="space-y-1">
          {STAGES.map((stage) => {
            const isCompleted = completedStages.includes(stage.id)
            const isCurrent = currentStage === stage.id
            const isUpcoming = !isCompleted && !isCurrent

            return (
              <div
                key={stage.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  isCurrent && 'bg-white/10',
                  isCompleted && 'opacity-60',
                  isUpcoming && 'opacity-30',
                )}
              >
                <div className="mt-0.5 shrink-0 text-white/80">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin text-brand-blue" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight">
                    {stage.id}. {stage.name}
                  </p>
                  <p className="mt-0.5 text-xs text-white/40 leading-tight">
                    {stage.description}
                  </p>
                </div>
              </div>
            )
          })}
        </nav>

        {/* Captured assumptions */}
        {captured.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 px-2 text-xs font-medium uppercase tracking-widest text-white/40">
              Captured so far
            </p>
            <div className="space-y-2">
              {captured.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-white/5 px-3 py-2"
                >
                  <p className="text-xs text-white/40">{item.label}</p>
                  <p className="text-sm font-medium text-white">{item.value}</p>
                </div>
              ))}
              {runwayMonths !== null && (
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <p className="text-xs text-white/40">Runway</p>
                  <p className={cn(
                    'text-sm font-medium',
                    runwayMonths < 6 ? 'text-red-400' : runwayMonths < 12 ? 'text-amber-400' : 'text-emerald-400'
                  )}>
                    ~{runwayMonths} months
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-xs text-white/30">
          Your data is used only to build your model. It is never used to train AI.
        </p>
      </div>
    </aside>
  )
}
