import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/ai/anthropic'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  let file: File | null = null
  try {
    const formData = await req.formData()
    file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const name = file.name.toLowerCase()

    // Plain text
    if (name.endsWith('.txt') || file.type === 'text/plain') {
      return NextResponse.json({ text: buffer.toString('utf-8'), type: 'text' })
    }

    // CSV
    if (name.endsWith('.csv')) {
      return NextResponse.json({ text: buffer.toString('utf-8'), type: 'csv' })
    }

    // PDF — use Anthropic API for reliable extraction in serverless (no native deps)
    if (name.endsWith('.pdf')) {
      try {
        const base64 = buffer.toString('base64')
        const client = getAnthropicClient()
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              } as any,
              {
                type: 'text',
                text: 'Extract all text and financial data from this document. Include all numbers, tables, and figures exactly as shown. Return only the extracted content, no commentary.',
              },
            ],
          }],
        })
        const text = response.content[0].type === 'text' ? response.content[0].text : ''
        return NextResponse.json({ text, pages: 0, type: 'pdf' })
      } catch (pdfErr) {
        console.error('PDF extraction error:', pdfErr)
        return NextResponse.json({
          text: `[PDF uploaded: ${file.name} — text extraction unavailable. Please describe the key figures verbally.]`,
          type: 'pdf',
          pages: 0,
          parseError: true,
        })
      }
    }

    // Excel — handle both CommonJS and ESM module shapes
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      try {
        // @ts-ignore
        const xlsxModule = await import('xlsx')
        const XLSX = (xlsxModule as any).default ?? xlsxModule
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const utils = XLSX.utils ?? (xlsxModule as any).default?.utils
        const lines: string[] = []
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          const csv = utils.sheet_to_csv(sheet, { blankrows: false })
          if (csv.trim()) {
            lines.push(`--- Sheet: ${sheetName} ---`)
            lines.push(csv)
          }
        }
        return NextResponse.json({ text: lines.join('\n\n'), type: 'excel', sheets: workbook.SheetNames.length })
      } catch (xlsxErr) {
        console.error('xlsx error:', xlsxErr)
        return NextResponse.json({
          text: `[Excel file uploaded: ${file.name} — sheet extraction unavailable. Please share the key figures verbally.]`,
          type: 'excel',
          sheets: 0,
          parseError: true,
        })
      }
    }

    return NextResponse.json(
      { error: 'Unsupported file type. Please upload a PDF, Excel (.xlsx / .xls), or CSV file.' },
      { status: 400 },
    )
  } catch (error) {
    console.error('Upload error:', error)
    if (file?.name) {
      return NextResponse.json({
        text: `[File uploaded: ${file.name} — could not read contents. Please describe the key figures verbally.]`,
        type: 'unknown',
        parseError: true,
      })
    }
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to process file: ${msg}` }, { status: 500 })
  }
}
