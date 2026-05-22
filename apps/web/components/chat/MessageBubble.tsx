'use client'

import { cn, stripMetaBlock } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant'
  const displayContent = isAssistant
    ? stripMetaBlock(message.content)
    : message.content

  return (
    <div
      className={cn(
        'flex w-full animate-slide-up items-end gap-3 px-4 py-1',
        isAssistant ? 'justify-start' : 'justify-end',
      )}
    >
      {isAssistant && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
          FD
        </div>
      )}

      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isAssistant
            ? 'rounded-tl-sm bg-white shadow-sm ring-1 ring-slate-100'
            : 'rounded-tr-sm bg-brand-navy text-white',
        )}
      >
        {formatContent(displayContent)}
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current opacity-70" />
        )}
      </div>

      {!isAssistant && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
          You
        </div>
      )}
    </div>
  )
}

function formatContent(text: string) {
  const lines = text.split('\n')

  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const formatted = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={j} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        )
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
