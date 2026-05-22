'use client'

import { useCallback, useReducer, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { StageSidebar } from './StageSidebar'
import { parseMetaBlock } from '@/lib/utils'
import { INITIAL_GREETING } from '@/lib/ai/system-prompt'
import type { ConversationState, StageId } from '@/types'

type Action =
  | { type: 'ADD_USER_MESSAGE'; content: string }
  | { type: 'START_STREAMING'; messageId: string }
  | { type: 'APPEND_STREAM'; messageId: string; chunk: string }
  | { type: 'FINISH_STREAMING'; messageId: string; meta: ReturnType<typeof parseMetaBlock>['meta'] }

function initialState(): ConversationState {
  const { meta } = parseMetaBlock(INITIAL_GREETING)
  const greetingId = uuidv4()
  return {
    messages: [{ id: greetingId, role: 'assistant', content: INITIAL_GREETING, timestamp: new Date() }],
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
      return { ...state, messages: [...state.messages, { id: uuidv4(), role: 'user', content: action.content, timestamp: new Date() }], isStreaming: true }
    case 'START_STREAMING':
      return { ...state, messages: [...state.messages, { id: action.messageId, role: 'assistant', content: '', timestamp: new Date() }] }
    case 'APPEND_STREAM':
      return { ...state, messages: state.messages.map((m) => m.id === action.messageId ? { ...m, content: m.content + action.chunk } : m) }
    case 'FINISH_STREAMING': {
      const meta = action.meta
      if (!meta) return { ...state, isStreaming: false }
      const newStage = meta.stage as StageId
      const wasAdvanced = newStage > state.currentStage
      return {
        ...state,
        isStreaming: false,
        currentStage: newStage,
        completedStages: wasAdvanced ? ([...state.completedStages, state.currentStage] as StageId[]) : state.completedStages,
        businessType: meta.business_type ?? state.businessType,
        assumptions: { ...state.assumptions, ...Object.fromEntries(Object.entries(meta.assumptions ?? {}).filter(([, v]) => v !== null)) },
      }
    }
    default: return state
  }
}

export function ChatInterface() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [isThinking, setIsThinking] = useState(false)
  const [deckContext, setDeckContext] = useState<string | null>(null)
  const [deckFileName, setDeckFileName] = useState<string | null>(null)
  const streamingIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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

  const sendMessage = useCallback(async (content: string) => {
    if (state.isStreaming || isThinking) return
    dispatch({ type: 'ADD_USER_MESSAGE', content })
    setIsThinking(true)
    const allMessages = [
        ...state.messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content },
      ]
      const history = allMessages.slice(-12)
    const assistantId = uuidv4()
    streamingIdRef.current = assistantId
    abortRef.current = new AbortController()
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, deckContext }),
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
      dispatch({ type: 'APPEND_STREAM', messageId: assistantId, chunk: '\n\n*Something went wrong. Please try again.*' })
      dispatch({ type: 'FINISH_STREAMING', messageId: assistantId, meta: null })
    } finally {
      streamingIdRef.current = null
    }
  }, [state.isStreaming, state.messages, isThinking, deckContext])

  return (
    <div className="flex h-screen overflow-hidden bg-brand-light/30">
      <StageSidebar state={state} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-purple-100 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold text-slate-800">Financial Model Builder</h1>
              <p className="text-xs text-slate-500">
                Stage {state.currentStage} of 6 —{' '}
                {['Business Overview', 'Current Financials', 'Revenue Model', 'Cost Structure', 'Growth Plans', 'Review'][state.currentStage - 1]}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {deckFileName && (
                <span className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-medium text-brand-blue">
                  📎 {deckFileName}
                </span>
              )}
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-purple-100">
                  <div className="h-full rounded-full bg-brand-blue transition-all duration-500" style={{ width: `${((state.currentStage - 1) / 5) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-400">{Math.round(((state.currentStage - 1) / 5) * 100)}%</span>
              </div>
            </div>
          </div>
        </header>
        <MessageList messages={state.messages} isStreaming={state.isStreaming} streamingMessageId={streamingIdRef.current} isThinking={isThinking} />
        <MessageInput onSend={sendMessage} onFileUpload={handleFileUpload} disabled={state.isStreaming || isThinking} placeholder={state.currentStage === 6 ? 'Confirm or correct anything above…' : 'Type your answer…'} />
      </main>
    </div>
  )
}
