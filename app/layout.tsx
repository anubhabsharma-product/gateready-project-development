import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import 'katex/dist/katex.min.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'GateReady | Attendee Planning',
  description: 'Track event registrations, verified arrivals, and campaign spending. Plan attendance and manage experiments.',
  applicationName: 'GateReady',
  generator: 'Next.js',
  icons: { icon: '/gateready-mark.png' },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f5f6f5',
  userScalable: true,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
