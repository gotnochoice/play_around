import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ConversationMeta } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrencyCompact(value: number, currency = 'USD'): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const symbol = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
    .formatToParts(0)
    .find((p) => p.type === 'currency')?.value ?? ''
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(0)}K`
  return `${sign}${symbol}${abs.toFixed(0)}`
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
