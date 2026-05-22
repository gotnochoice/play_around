import type { Stage } from '@/types'

export const STAGES: Stage[] = [
  {
    id: 0,
    name: 'Model Purpose',
    description: 'Type of model, time horizon, granularity, audience',
  },
  {
    id: 1,
    name: 'Business Discovery',
    description: 'What you do, the insight, your customers, your moat',
  },
  {
    id: 2,
    name: 'Revenue Deep Dive',
    description: 'Currency and revenue stream by stream',
  },
  {
    id: 3,
    name: 'Financial Position',
    description: 'Cash on hand and current burn',
  },
  {
    id: 4,
    name: 'Cost Structure',
    description: 'Team, tools, marketing and other costs',
  },
  {
    id: 5,
    name: 'Growth Plans',
    description: 'Targets, growth levers, fundraising',
  },
  {
    id: 6,
    name: 'Review',
    description: 'Confirm everything before building the model',
  },
]

export function getStage(id: number): Stage | undefined {
  return STAGES.find((s) => s.id === id)
}
