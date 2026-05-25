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

export interface ModelPurpose {
  type: 'projection' | 'snapshot' | 'scenario' | null
  horizon: '12mo' | '3yr' | '5yr' | null
  granularity: 'monthly' | 'quarterly' | 'annual' | null
  audience: 'vc' | 'board' | 'acquirer' | 'personal' | null
}

export interface OnboardingData {
  founderName: string
  businessName: string
  businessType: BusinessType
  businessDescription: string
  currency: string
}

export interface CapturedAssumptions {
  founder_name: string | null
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
  loans: number | null
  paid_in_capital: number | null
  days_receivable: number | null
  days_payable: number | null
  fixed_assets: number | null
  capex_monthly: number | null
  tax_rate: number | null
  depreciation_monthly: number | null
  inventory_value: number | null
  monthly_cogs: number | null
  [key: string]: unknown
}

export interface ConversationMeta {
  stage: StageId
  stage_name: string
  business_type: BusinessType
  model_purpose?: ModelPurpose
  quick_replies?: string[]
  assumptions: Partial<CapturedAssumptions>
}

export interface ConversationState {
  sessionId: string
  messages: Message[]
  currentStage: StageId
  completedStages: StageId[]
  businessType: BusinessType
  assumptions: Partial<CapturedAssumptions>
  modelPurpose: ModelPurpose
  quickReplies: string[]
  isStreaming: boolean
}

export interface ChatApiRequest {
  messages: Array<{ role: MessageRole; content: string }>
  deckContext?: string
  onboardingData?: OnboardingData
}
