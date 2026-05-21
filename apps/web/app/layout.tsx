import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FounderDeck — Financial Co-pilot for Founders',
  description:
    'Turn a 30-minute conversation into an investor-ready financial model and pitch deck.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
