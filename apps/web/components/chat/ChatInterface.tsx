'use client'

import { useCallback, useReducer, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { StageSidebar } from './StageSidebar'
import { parseMetaBlock } from '@/lib/utils'
import { INITIAL_GREETING } from '@/lib/ai/system-prompt'
import type { ConversationState, Message, StageId } from '@/types'

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_USER_MESSAGE'; content: string }
  | { type: 'START_STREAMING'; messageId: string }
  | { type: 'APPEND_STREAM'; messageId: string; chunk: string }
  | { type: 'FINISH_STREAMING'; messageId: string; meta: ReturnType<typeof parseMetaBlock>['meta'] }

function initialState(): ConversationState {
  const { meta } = parseMetaBlock(INITIAL_GREETING)
  const greetingId = uuidv4()

  return {
    messages: [
      {
        id: greetingId,
        role: 'assistant',
        content: INITIAL_GREETING,
        timestamp: new Date(),
      },
    ],
    currentStage: (meta?.stage ?? 1) as StageId,
    completedStages: [],
    businessType: meta?.business_type ?? null,
    assumptions: meta?.assumptions ?? {},
    isStreaming: false,
  }
}

function reducer(state: ConversationState, action: Action): ConversationState {
  switch (action.type) {
    case 'ADD_USER_MESSAGE':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: uuidv4(),
            role: 'user',
            content: action.content,
            timestamp: new Date(),
          },
        ],
        isStreaming: true,
      }

    case 'START_STREAMING':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: action.messageId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
          },
        ],
      }

    case 'APPEND_STREAM': {
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId
            ? { ...m, content: m.content + action.chunk }
            : m,
        ),
      }
    }

    case 'FINISH_STREAMING': {
      const meta = action.meta
      if (!meta) return { ...state, isStreaming: false }

      const newStage = meta.stage as StageId
      const wasAdvanced = newStage > state.currentStage
      const completedStages = wasAdvanced
        ? ([...state.completedStages, state.currentStage] as StageId[])
        : state.completedStages

      return {
        ...state,
        isStreaming: false,
        currentStage: newStage,
        completedStages,
        businessType: meta.business_type ?? state.businessType,
        assumptions: {
          ...state.assumptions,
          ...Object.fromEntries(
            Object.entries(meta.assumptions ?? {}).filter(([, v]) => v !== null),
          ),
        },
      }
    }

    default:
      return state
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatInterface() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const streamingIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (state.isStreaming) return

      // Add user message
      dispatch({ type: 'ADD_USER_MESSAGE', content })

      // Build history for the API (excluding the greeting's meta block for cleanliness)
      const history = [
        ...state.messages.map((m) => ({
          role: m.role,
          content: m.role === 'assistant' ? m.content : m.content,
        })),
        { role: 'user' as const, content },
      ]

      // Start a new assistant message placeholder
      const assistantId = uuidv4()
      streamingIdRef.current = assistantId
      dispatch({ type: 'START_STREAMING', messageId: assistantId })

      abortRef.current = new AbortController()

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
          signal: abortRef.current.signal,
        })

        if (!response.ok || !response.body) {
          throw new Error(`API error: ${response.status}`)
        }

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

        // Parse metadata from the complete response
        const { meta } = parseMetaBlock(fullText)
        dispatch({ type: 'FINISH_STREAMING', messageId: assistantId, meta })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Streaming error:', err)
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
    [state.isStreaming, state.messages],
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <StageSidebar state={state} />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold text-slate-800">
                Financial Model Builder
              </h1>
              <p className="text-xs text-slate-500">
                Stage {state.currentStage} of 6 —{' '}
                {['Business Overview', 'Current Financials', 'Revenue Model', 'Cost Structure', 'Growth Plans', 'Review'][state.currentStage - 1]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-blue transition-all duration-500"
                  style={{ width: `${((state.currentStage - 1) / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">
                {Math.round(((state.currentStage - 1) / 5) * 100)}%
              </span>
            </div>
          </div>
        </header>

        <MessageList
          messages={state.messages}
          isStreaming={state.isStreaming}
          streamingMessageId={streamingIdRef.current}
        />

        <MessageInput
          onSend={sendMessage}
          disabled={state.isStreaming}
          placeholder={
            state.currentStage === 6
              ? 'Confirm or correct anything above…'
              : 'Type your answer…'
          }
        />
      </main>
    </div>
  )
}
