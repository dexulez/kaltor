import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppSidebar from '@/components/layout/AppSidebar'
import MobileNav from '@/components/layout/MobileNav'
import InactivityRedirect from '@/components/layout/InactivityRedirect'
import RealtimeRefresh from '@/components/layout/RealtimeRefresh'
import MayusculasListener from '@/components/layout/MayusculasListener'
import type { ModuloNegocio } from '@/lib/modulos'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('*, roles(*)').eq('id', user.id).single()
  const rolesRel = (profile as { roles?: { nombre?: string } | { nombre?: string }[] | null } | null)?.roles
  const roleName = (Array.isArray(rolesRel) ? rolesRel[0]?.nombre : rolesRel?.nombre) ?? ''
  const esComprador = roleName === 'comprador_externo'
  const pedidosB2BVistoAt = (profile as { pedidos_b2b_visto_at?: string | null } | null)?.pedidos_b2b_visto_at ?? null

  const [{ data: config }, { count: solicitudesPendientes }, { count: pedidosB2BPendientes }] = await Promise.all([
    supabase.from('system_config').select('*').single(),
    supabase.from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
      .like('notas', '[SOLICITUD]%'),
    esComprador
      ? supabase.from('sales_orders')
          .select('id', { count: 'exact', head: true })
          .eq('comprador_id', user.id)
          .gt('updated_at', pedidosB2BVistoAt ?? '1970-01-01')
          .then(r => r.error ? { count: 0 } : r)
      : supabase.from('sales_orders')
          .select('id', { count: 'exact', head: true })
          .eq('estado', 'pendiente')
          .then(r => r.error ? { count: 0 } : r),
  ])

  const logoUrl = (config as { logo_url?: string | null } | null)?.logo_url ?? null
  const nombreLocal = (config as { nombre_local?: string } | null)?.nombre_local ?? 'Kaltor'
  const mayusculasActivas = (config as { mayusculas_automaticas?: boolean } | null)?.mayusculas_automaticas === true
  const alertas = { compras: solicitudesPendientes ?? 0, pedidosB2B: pedidosB2BPendientes ?? 0 }

  // Módulos activos según el plan de la tienda (service role para evitar RLS)
  const storeId = (profile as { store_id?: string } | null)?.store_id
  let modulosDelPlan: Set<ModuloNegocio> | null = null
  if (storeId) {
    const admin = createServiceClient()
    const { data: storeModules } = await admin
      .from('store_modules')
      .select('module_key')
      .eq('store_id', storeId)
      .eq('activo', true)
    if (storeModules && storeModules.length > 0) {
      modulosDelPlan = new Set(storeModules.map((m: { module_key: string }) => m.module_key as ModuloNegocio))
    }
  }

  return (
    <div className="flex h-screen bg-[#F5F6F4] overflow-hidden">
      <InactivityRedirect />
      <RealtimeRefresh />
      <MayusculasListener activo={mayusculasActivas} />
      <AppSidebar user={profile} logoUrl={logoUrl} nombreLocal={nombreLocal} alertas={alertas} modulosDelPlan={modulosDelPlan} />
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
      <MobileNav user={profile} alertas={alertas} modulosDelPlan={modulosDelPlan} />
    </div>
  )
}
