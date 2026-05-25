'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import type { Message } from '@/types'

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  streamingMessageId: string | null
  isThinking: boolean
  onFeedback?: (messageIndex: number, feedback: 'up' | 'down') => void
}

export function MessageList({ messages, isStreaming, streamingMessageId, isThinking, onFeedback }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming, isThinking])

  return (
    <div className="flex-1 overflow-y-auto py-4">
      <div className="mx-auto max-w-3xl space-y-1">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isStreaming && message.id === streamingMessageId}
            onFeedback={onFeedback ? (f) => onFeedback(index, f) : undefined}
          />
        ))}
        {isThinking && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
