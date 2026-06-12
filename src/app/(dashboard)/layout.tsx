import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppSidebar from '@/components/layout/AppSidebar'
import MobileNav from '@/components/layout/MobileNav'
import InactivityRedirect from '@/components/layout/InactivityRedirect'
import RealtimeRefresh from '@/components/layout/RealtimeRefresh'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: config }, { count: solicitudesPendientes }] = await Promise.all([
    supabase.from('user_profiles').select('*, roles(*)').eq('id', user.id).single(),
    supabase.from('system_config').select('nombre_local, logo_url').single(),
    supabase.from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
      .like('notas', '[SOLICITUD]%'),
  ])

  const logoUrl = (config as { logo_url?: string | null } | null)?.logo_url ?? null
  const nombreLocal = (config as { nombre_local?: string } | null)?.nombre_local ?? 'TechRepair Pro'
  const alertas = { compras: solicitudesPendientes ?? 0 }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <InactivityRedirect />
      <RealtimeRefresh />
      <AppSidebar user={profile} logoUrl={logoUrl} nombreLocal={nombreLocal} alertas={alertas} />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
      <MobileNav user={profile} alertas={alertas} />
    </div>
  )
}
