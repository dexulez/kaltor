import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import NoScrollNumbers from '@/components/NoScrollNumbers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kaltor',
  description: 'Sistema integral de gestión para talleres y negocios',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kaltor',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} min-h-full`} suppressHydrationWarning>
        <NoScrollNumbers />
        {children}
        <Toaster richColors position="top-right" closeButton expand visibleToasts={5} />
      </body>
    </html>
  )
}
