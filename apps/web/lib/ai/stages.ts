import type { Stage } from '@/types'

export const STAGES: Stage[] = [
  {
    id: 1,
    name: 'Business Overview',
    description: 'What you do, who you serve, how you make money',
  },
  {
    id: 2,
    name: 'Current Financials',
    description: 'Cash on hand, current revenue and spending',
  },
  {
    id: 3,
    name: 'Revenue Model',
    description: 'Pricing, customers, and how revenue works',
  },
  {
    id: 4,
    name: 'Cost Structure',
    description: 'Team, tools, and what you spend each month',
  },
  {
    id: 5,
    name: 'Growth Plans',
    description: 'Where you expect to be in 12 months',
  },
  {
    id: 6,
    name: 'Review',
    description: 'Confirm everything before building your model',
  },
]

export function getStage(id: number): Stage | undefined {
  return STAGES.find((s) => s.id === id)
}
