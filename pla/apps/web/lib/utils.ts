import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ConversationMeta } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null, currency = 'USD'): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function parseMetaBlock(text: string): {
  cleanText: string
  meta: ConversationMeta | null
} {
  const metaRegex = /<meta>([\s\S]*?)<\/meta>/
  const match = text.match(metaRegex)

  if (!match) {
    return { cleanText: text.trim(), meta: null }
  }

  try {
    const meta = JSON.parse(match[1]) as ConversationMeta
    const cleanText = text.replace(metaRegex, '').trim()
    return { cleanText, meta }
  } catch {
    return { cleanText: text.replace(metaRegex, '').trim(), meta: null }
  }
}

export function stripMetaBlock(text: string): string {
  return text.replace(/<meta>[\s\S]*?<\/meta>/, '').trim()
}
