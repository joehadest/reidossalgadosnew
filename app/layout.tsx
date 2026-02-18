import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { AdminProvider } from '@/lib/admin-context'
import { AdminDataWrapper } from '@/components/admin-data-wrapper'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title: 'Rei dos Salgados | O Melhor Lanche da Cidade',
  description: 'Rei dos Salgados - Delivery de salgados em Alto do Rodrigues RN. Peca online os melhores salgados da cidade!',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/favicon/favicon_io/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/favicon/favicon_io/apple-touch-icon.png',
  },
  manifest: '/favicon/favicon_io/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#FBBF24',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        <AdminProvider>
          <AdminDataWrapper>
            {children}
          </AdminDataWrapper>
        </AdminProvider>
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  )
}
