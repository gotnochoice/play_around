'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { StageSidebar } from './StageSidebar'
import { ModelSpreadsheet } from './ModelSpreadsheet'
import { parseMetaBlock } from '@/lib/utils'
import type { ConversationState, ModelPurpose, OnboardingData, StageId } from '@/types'

type Action =
  | { type: 'ADD_USER_MESSAGE'; content: string }
  | { type: 'START_STREAMING'; messageId: string }
  | { type: 'APPEND_STREAM'; messageId: string; chunk: string }
  | { type: 'FINISH_STREAMING'; messageId: string; meta: ReturnType<typeof parseMetaBlock>['meta'] }

const EMPTY_MODEL_PURPOSE: ModelPurpose = {
  type: null,
  horizon: null,
  granularity: null,
  audience: null,
}

const BUSINESS_TYPE_MAP: Record<string, string> = {
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

function buildInitialGreeting(data: OnboardingData): string {
  const typeLabel = data.businessType ? (BUSINESS_TYPE_MAP[data.businessType] ?? data.businessType) : 'business'
  const meta = {
    stage: 0,
    stage_name: 'Model Purpose',
    business_type: data.businessType,
    model_purpose: { type: null, horizon: null, granularity: null, audience: null },
    assumptions: {
      founder_name: data.founderName,
      business_name: data.businessName,
      revenue_currency: data.currency,
    },
    quick_replies: ['Projection', 'Snapshot today', 'Scenario analysis'],
  }
  return `Good to have you here, ${data.founderName}.

Before we get into ${data.businessName}'s numbers, I need to understand what kind of model this is. Are you building a forward-looking projection of where the business is going, a snapshot of where things stand today, or a scenario analysis to stress-test different bets?

<meta>${JSON.stringify(meta)}</meta>`
}

function buildInitialState(data: OnboardingData): ConversationState {
  const greetingId = uuidv4()
  const greeting = buildInitialGreeting(data)
  const { meta } = parseMetaBlock(greeting)
  return {
    messages: [{ id: greetingId, role: 'assistant', content: greeting, timestamp: new Date() }],
    currentStage: 0,
    completedStages: [],
    businessType: data.businessType,
    assumptions: {
      founder_name: data.founderName,
      business_name: data.businessName,
      revenue_currency: data.currency,
    },
    modelPurpose: EMPTY_MODEL_PURPOSE,
    quickReplies: meta?.quick_replies ?? [],
    isStreaming: false,
  }
}

function reducer(state: ConversationState, action: Action): ConversationState {
  switch (action.type) {
    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, { id: uuidv4(), role: 'user', content: action.content, timestamp: new Date() }],
        isStreaming: true,
        quickReplies: [],
      }
    case 'START_STREAMING':
      return {
        ...state,
        messages: [...state.messages, { id: action.messageId, role: 'assistant', content: '', timestamp: new Date() }],
      }
    case 'APPEND_STREAM':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, content: m.content + action.chunk } : m,
        ),
      }
    case 'FINISH_STREAMING': {
      const meta = action.meta
      if (!meta) return { ...state, isStreaming: false }
      const newStage = meta.stage as StageId
      const wasAdvanced = newStage > state.currentStage
      const newModelPurpose = meta.model_purpose
        ? ({
            ...state.modelPurpose,
            ...Object.fromEntries(Object.entries(meta.model_purpose).filter(([, v]) => v !== null)),
          } as ModelPurpose)
        : state.modelPurpose
      return {
        ...state,
        isStreaming: false,
        currentStage: newStage,
        completedStages: wasAdvanced
          ? ([...state.completedStages, state.currentStage] as StageId[])
          : state.completedStages,
        businessType: meta.business_type ?? state.businessType,
        assumptions: {
          ...state.assumptions,
          ...Object.fromEntries(Object.entries(meta.assumptions ?? {}).filter(([, v]) => v !== null)),
        },
        modelPurpose: newModelPurpose,
        quickReplies: meta.quick_replies ?? [],
      }
    }
    default:
      return state
  }
}

const STAGE_NAMES = [
  'Model Purpose',
  'Business Discovery',
  'Revenue Deep Dive',
  'Financial Position',
  'Cost Structure',
  'Growth Plans',
  'Review',
]

interface ChatInterfaceProps {
  onboardingData: OnboardingData
}

export function ChatInterface({ onboardingData }: ChatInterfaceProps) {
  const [state, dispatch] = useReducer(reducer, onboardingData, buildInitialState)
  const [isThinking, setIsThinking] = useState(false)
  const [deckContext, setDeckContext] = useState<string | null>(null)
  const [deckFileName, setDeckFileName] = useState<string | null>(null)
  const streamingIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<{ focus: () => void }>(null)

  useEffect(() => {
    if (!state.isStreaming && !isThinking) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [state.isStreaming, isThinking])

  const handleFileUpload = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const { text } = await res.json()
      setDeckContext(text)
      setDeckFileName(file.name)
    } catch (err) {
      console.error('File upload error:', err)
    }
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (state.isStreaming || isThinking) return
      dispatch({ type: 'ADD_USER_MESSAGE', content })
      setIsThinking(true)
      const allMessages = [
        ...state.messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ]
      const history = allMessages.slice(-40)
      const assistantId = uuidv4()
      streamingIdRef.current = assistantId
      abortRef.current = new AbortController()
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, deckContext, onboardingData }),
          signal: abortRef.current.signal,
        })
        if (!response.ok || !response.body) throw new Error(`API error: ${response.status}`)
        dispatch({ type: 'START_STREAMING', messageId: assistantId })
        setIsThinking(false)
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          dispatch({ type: 'APPEND_STREAM', messageId: assistantId, chunk })
        }
        const { meta } = parseMetaBlock(fullText)
        dispatch({ type: 'FINISH_STREAMING', messageId: assistantId, meta })
      } catch (err) {
        setIsThinking(false)
        if (err instanceof Error && err.name === 'AbortError') return
        dispatch({ type: 'START_STREAMING', messageId: assistantId })
        dispatch({
          type: 'APPEND_STREAM',
          messageId: assistantId,
          chunk: '\n\n*Something went wrong. Please try again.*',
        })
        dispatch({ type: 'FINISH_STREAMING', messageId: assistantId, meta: null })
      } finally {
        streamingIdRef.current = null
      }
    },
    [state.isStreaming, state.messages, isThinking, deckContext, onboardingData],
  )

  const handleQuickReply = useCallback(
    (reply: string) => {
      sendMessage(reply)
    },
    [sendMessage],
  )

  const showQuickReplies =
    state.quickReplies.length > 0 && !state.isStreaming && !isThinking

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <StageSidebar state={state} />

      <div className="flex flex-1 overflow-hidden">
        {/* Spreadsheet main area */}
        <div className="flex-1 overflow-hidden border-r border-slate-200">
          <ModelSpreadsheet state={state} />
        </div>

        {/* Chat panel */}
        <div className="flex w-[380px] shrink-0 flex-col overflow-hidden bg-brand-light/30">
          <header className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-sm font-semibold text-slate-800">
                  {state.currentStage === 0 ? 'Setup' : `Stage ${state.currentStage} of 6`}
                </h1>
                <p className="text-xs text-slate-500">{STAGE_NAMES[state.currentStage]}</p>
              </div>
              {deckFileName && (
                <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 ring-1 ring-inset ring-indigo-100">
                  📎 {deckFileName}
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full rounded-full bg-brand-navy transition-all duration-500"
                  style={{ width: `${(state.currentStage / 6) * 100}%` }}
                />
              </div>
              <span className="tabular-nums text-xs text-slate-400">
                {Math.round((state.currentStage / 6) * 100)}%
              </span>
            </div>
          </header>

          <MessageList
            messages={state.messages}
            isStreaming={state.isStreaming}
            streamingMessageId={streamingIdRef.current}
            isThinking={isThinking}
          />

          {showQuickReplies && (
            <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Quick reply
              </p>
              <div className="flex flex-wrap gap-2">
                {state.quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-brand-navy hover:bg-brand-navy hover:text-white"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          <MessageInput
            ref={inputRef}
            onSend={sendMessage}
            onFileUpload={handleFileUpload}
            disabled={state.isStreaming || isThinking}
            placeholder={state.currentStage === 6 ? 'Confirm or correct anything above…' : 'Type your answer…'}
          />
        </div>
      </div>
    </div>
  )
}
