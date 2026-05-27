import { getAnthropicClient, MODEL, MAX_TOKENS } from '@/lib/ai/anthropic'
import { DECK_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import { buildFewShotExamples } from '@/lib/logger'
import type { ChatApiRequest } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { messages, deckContext, deckFileType, onboardingData, currentStage }: ChatApiRequest & { deckContext?: string; deckFileType?: string } = await req.json()

    let systemPrompt = DECK_SYSTEM_PROMPT

    // Inject real conversation examples for this business type
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

    // Hard stage reminder so the model stays on the right questions
    if (currentStage != null) {
      const stageNames = ['Model Purpose', 'Business Discovery', 'Revenue Deep Dive', 'Financial Position', 'Cost Structure', 'Growth Plans', 'Review']
      const stageFocus = [
        'Ask the 4 model-purpose questions (type, horizon, granularity, audience). Then offer file upload.',
        'Ask only: how long running + are customers paying, how the last customer found them and why they paid, and the one unproven bet. Do NOT ask about revenue numbers, costs, or growth yet.',
        'Go stream by stream through revenue. Capture monthly_revenue, monthly_cogs, gross_margin, pricing_model, customer_count, price_growth_annual. Do NOT ask about bank balance, burn, team, or costs yet.',
        'Ask only: cash in the bank, monthly total spend, loans, equity raised, AR/AP days. Do NOT ask about team size, individual cost lines, or growth targets yet.',
        'Ask only: team headcount, total monthly salary, founder salary, salary_growth_annual, software tools, marketing spend, other costs. Confirm total monthly_burn. Do NOT ask about growth targets or fundraising yet.',
        'Ask only: revenue target at end of horizon, what unlocks that growth, fundraising plans. Run the inflation and marketing consistency checks.',
        'Summarise all captured assumptions. Flag FX exposure and any estimates. Ask founder to confirm before building.',
      ]
      const name = stageNames[currentStage] ?? `Stage ${currentStage}`
      const focus = stageFocus[currentStage] ?? ''
      systemPrompt += `\n\n---\nACTIVE STAGE: Stage ${currentStage} — ${name}\nYOU MUST ONLY ask questions that belong to Stage ${currentStage}. Do not ask questions from any other stage.\n${focus}`
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
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('API_KEY') || msg.includes('api_key')) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
