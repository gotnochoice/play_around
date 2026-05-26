import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const name = file.name.toLowerCase()

    // Plain text
    if (name.endsWith('.txt') || file.type === 'text/plain') {
      return NextResponse.json({ text: buffer.toString('utf-8'), type: 'text' })
    }

    // PDF
    if (name.endsWith('.pdf')) {
      // @ts-ignore
      const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
      const data = await pdfParse(buffer, { max: 15 })
      return NextResponse.json({ text: data.text, pages: data.numpages, type: 'pdf' })
    }

    // CSV
    if (name.endsWith('.csv')) {
      return NextResponse.json({ text: buffer.toString('utf-8'), type: 'csv' })
    }

    // Excel
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      // @ts-ignore
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const lines: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
        if (csv.trim()) {
          lines.push(`--- Sheet: ${sheetName} ---`)
          lines.push(csv)
        }
      }
      return NextResponse.json({ text: lines.join('\n\n'), type: 'excel', sheets: workbook.SheetNames.length })
    }

    return NextResponse.json(
      { error: 'Unsupported file type. Upload a PDF, Excel (.xlsx / .xls), or CSV file.' },
      { status: 400 },
    )
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 })
  }
}
