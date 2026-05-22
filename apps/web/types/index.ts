export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
}

export type BusinessType =
  | 'B2B_SAAS'
  | 'CONSUMER_APP'
  | 'MARKETPLACE'
  | 'ECOMMERCE'
  | 'PROFESSIONAL_SERVICES'
  | 'FINTECH'
  | 'HARDWARE'
  | 'MEDIA'
  | 'AGRITECH'
  | 'EDTECH'
  | 'HEALTHTECH'
  | 'LOGISTICS'
  | null

export type StageId = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Stage {
  id: StageId
  name: string
  description: string
}

export interface CapturedAssumptions {
  current_cash: number | null
  monthly_revenue: number | null
  is_pre_revenue: boolean | null
  business_type: BusinessType
  business_name: string | null
  pricing_model: string | null
  customer_count: number | null
  monthly_burn: number | null
  team_size: number | null
  growth_rate_monthly: number | null
  gross_margin: number | null
  revenue_currency: string | null
  cost_currency: string | null
  is_multi_currency: boolean | null
  [key: string]: unknown
}

export interface ConversationMeta {
  stage: StageId
  stage_name: string
  business_type: BusinessType
  assumptions: Partial<CapturedAssumptions>
}

export interface ConversationState {
  messages: Message[]
  currentStage: StageId
  completedStages: StageId[]
  businessType: BusinessType
  assumptions: Partial<CapturedAssumptions>
  isStreaming: boolean
}

export interface ChatApiRequest {
  messages: Array<{ role: MessageRole; content: string }>
  deckContext?: string
}
