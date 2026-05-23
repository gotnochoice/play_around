import { getAnthropicClient, MODEL, MAX_TOKENS } from '@/lib/ai/anthropic'
import { DECK_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import type { ChatApiRequest } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { messages, deckContext, onboardingData }: ChatApiRequest & { deckContext?: string } = await req.json()

    let systemPrompt = DECK_SYSTEM_PROMPT

    if (onboardingData) {
      systemPrompt +=
        `\n\n---\nPRE-LOADED FROM ONBOARDING:\nFounder name: ${onboardingData.founderName}\nBusiness name: ${onboardingData.businessName}\nBusiness type: ${onboardingData.businessType}\nBusiness model: ${onboardingData.businessDescription || 'not provided'}\nRevenue currency: ${onboardingData.currency}\n\nDo NOT ask for any of this information again. Start with Stage 0 (model purpose).`
    }

    if (deckContext) {
      systemPrompt += `\n\n---\nThe founder has uploaded their pitch deck. Use it as background context:\n\n${deckContext.slice(0, 8000)}`
    }

    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 })
    }

    const stream = getAnthropicClient().messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
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
