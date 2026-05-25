'use client'

import { useState } from 'react'
import { cn, stripMetaBlock } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  onFeedback?: (feedback: 'up' | 'down') => void
}

export function MessageBubble({ message, isStreaming, onFeedback }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant'
  const displayContent = isAssistant ? stripMetaBlock(message.content) : message.content
  const [voted, setVoted] = useState<'up' | 'down' | null>(null)

  const handleFeedback = (f: 'up' | 'down') => {
    if (voted) return
    setVoted(f)
    onFeedback?.(f)
  }

  return (
    <div className={cn('group flex w-full animate-slide-up items-end gap-3 px-4 py-1.5',
      isAssistant ? 'justify-start' : 'justify-end')}>
      {isAssistant && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white shadow-sm">
          FD
        </div>
      )}
      <div className="flex max-w-[72%] flex-col gap-1">
        <div className={cn('rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isAssistant
            ? 'rounded-tl-sm bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] ring-1 ring-slate-200/70'
            : 'rounded-tr-sm bg-gradient-to-br from-brand-navy to-brand-blue text-white shadow-sm')}>
          {formatContent(displayContent)}
          {isStreaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current opacity-60" />}
        </div>
        {isAssistant && !isStreaming && onFeedback && displayContent.length > 10 && (
          <div className="flex items-center gap-1 pl-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={() => handleFeedback('up')}
              className={cn('rounded p-0.5 text-base transition-colors',
                voted === 'up' ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500')}
              title="Good response">👍</button>
            <button onClick={() => handleFeedback('down')}
              className={cn('rounded p-0.5 text-base transition-colors',
                voted === 'down' ? 'text-red-400' : 'text-slate-300 hover:text-red-400')}
              title="Not helpful">👎</button>
          </div>
        )}
      </div>
      {!isAssistant && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand-navy">
          You
        </div>
      )}
    </div>
  )
}

function formatContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const formatted = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
      }
      return part
    })
    return (
      <span key={i}>
        {formatted}
        {i < lines.length - 1 && line !== '' && <br />}
      </span>
    )
  })
}
