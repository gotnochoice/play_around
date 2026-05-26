import { getAnthropicClient, MODEL, MAX_TOKENS } from '@/lib/ai/anthropic'
import { DECK_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import { buildFewShotExamples } from '@/lib/logger'
import type { ChatApiRequest } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { messages, deckContext, deckFileType, onboardingData }: ChatApiRequest & { deckContext?: string; deckFileType?: string } = await req.json()

    let systemPrompt = DECK_SYSTEM_PROMPT

    const fewShot = buildFewShotExamples(onboardingData?.businessType ?? undefined)
    if (fewShot) systemPrompt += fewShot

    if (onboardingData) {
      systemPrompt +=
        `\n\n---\nPRE-LOADED FROM ONBOARDING:\nFounder name: ${onboardingData.founderName}\nBusiness name: ${onboardingData.businessName}\nBusiness type: ${onboardingData.businessType}\nBusiness model: ${onboardingData.businessDescription || 'not provided'}\nRevenue currency: ${onboardingData.currency}\n\nDo NOT ask for any of this information again. Start with Stage 0 (model purpose).`
    }

    if (deckContext) {
      const fileLabel = deckFileType === 'excel' ? 'financial model (Excel)'
        : deckFileType === 'csv' ? 'financial data (CSV)'
        : deckFileType === 'pdf' ? 'pitch deck (PDF)'
        : 'document'
      systemPrompt += `\n\n---\nFOUNDER-UPLOADED ${fileLabel.toUpperCase()}:\n`
      systemPrompt += `The founder has uploaded their ${fileLabel}. `
      if (deckFileType === 'excel' || deckFileType === 'csv') {
        systemPrompt += `Extract every financial figure from it: revenue, costs, margins, headcount, cash, loans, and any projections. When you would normally ask for a number that appears in this file, use the uploaded figure and confirm it with the founder instead of asking from scratch. Flag any numbers that look like estimates or projections rather than actuals.\n\n`
      } else {
        systemPrompt += `Use it as background context. Extract any financial figures, team size, revenue numbers, cost data, or growth targets mentioned. Where a figure appears here that you would otherwise ask about, reference it and confirm rather than asking cold.\n\n`
      }
      systemPrompt += deckContext.slice(0, 10000)
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
