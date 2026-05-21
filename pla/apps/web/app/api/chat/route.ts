import { getAnthropicClient, MODEL, MAX_TOKENS } from '@/lib/ai/anthropic'
import { DECK_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import type { ChatApiRequest } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { messages }: ChatApiRequest = await req.json()

    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 })
    }

    const stream = getAnthropicClient().messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: DECK_SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } finally {
          controller.close()
        }
      },
      cancel() {
        stream.controller.abort()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)

    if (error instanceof Error && error.message.includes('API_KEY')) {
      return new Response('Anthropic API key not configured', { status: 500 })
    }

    return new Response('Internal server error', { status: 500 })
  }
}
