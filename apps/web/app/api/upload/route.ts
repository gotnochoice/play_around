import { NextRequest, NextResponse } from 'next/server'

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

    // PDF
    if (name.endsWith('.pdf')) {
      try {
        // @ts-ignore
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default
        const data = await pdfParse(buffer, { max: 15 })
        return NextResponse.json({ text: data.text, pages: data.numpages, type: 'pdf' })
      } catch (pdfErr) {
        console.error('pdf-parse error:', pdfErr)
        return NextResponse.json({
          text: `[PDF uploaded: ${file.name} — text extraction unavailable. Please describe the key figures verbally.]`,
          type: 'pdf',
          pages: 0,
          parseError: true,
        })
      }
    }

    // CSV
    if (name.endsWith('.csv')) {
      return NextResponse.json({ text: buffer.toString('utf-8'), type: 'csv' })
    }

    // Excel
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      try {
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
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (file?.name) {
      return NextResponse.json({
        text: `[File uploaded: ${file.name} — could not read contents. Please describe the key figures verbally.]`,
        type: 'unknown',
        parseError: true,
      })
    }
    return NextResponse.json({ error: `Failed to process file: ${msg}` }, { status: 500 })
  }
}
