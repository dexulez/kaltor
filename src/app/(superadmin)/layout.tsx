import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Kaltor · Panel de Plataforma', robots: 'noindex' }

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const superAdminEmail = process.env.KALTOR_SUPER_ADMIN_EMAIL
  if (!user || !superAdminEmail || user.email !== superAdminEmail) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#F5F6F4]">
      {/* Top bar */}
      <header className="bg-[#121B1F] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
          {/* Logo + label */}
          <div className="flex items-center gap-3 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kaltor-logo-hex.svg" alt="Kaltor" className="h-7 w-7" />
            <span className="text-white font-bold text-sm tracking-tight">Kaltor</span>
            <span className="text-[10px] bg-[#FF7A1A]/20 text-[#FF7A1A] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase">
              Plataforma
            </span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 text-sm flex-1">
            <Link
              href="/kaltor-admin"
              className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Resumen
            </Link>
          </nav>

          {/* User */}
          <span className="text-xs text-gray-500 shrink-0">{user.email}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
