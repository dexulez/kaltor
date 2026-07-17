import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import NoScrollNumbers from '@/components/NoScrollNumbers'

const inter = Inter({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  metadataBase: new URL('https://kaltorpos.com'),
  title: {
    default: 'Kaltor · Gestión de negocio todo en uno',
    template: '%s · Kaltor',
  },
  description: 'Ventas, inventario, taller, compras, contabilidad y reportes en un solo sistema. Controla tu negocio en tiempo real, desde cualquier dispositivo.',
  keywords: ['software gestión negocio', 'punto de venta', 'sistema para talleres', 'inventario', 'POS Chile', 'Kaltor'],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/kaltor-logo-hex.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/kaltor-logo-hex.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kaltor',
  },
  openGraph: {
    type: 'website',
    locale: 'es_CL',
    url: 'https://kaltorpos.com',
    siteName: 'Kaltor',
    title: 'Kaltor · Gestión de negocio todo en uno',
    description: 'Ventas, inventario, taller, compras, contabilidad y reportes en un solo sistema. Controla tu negocio en tiempo real.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kaltor · Gestión de negocio todo en uno',
    description: 'Ventas, inventario, taller, compras, contabilidad y reportes en un solo sistema.',
  },
}

export const viewport: Viewport = {
  themeColor: '#FF7A1A',
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
      <body className={`${inter.className} ${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-full`} suppressHydrationWarning>
        <NoScrollNumbers />
        {children}
        <Toaster richColors position="top-right" closeButton expand visibleToasts={5} />
      </body>
    </html>
  )
}
