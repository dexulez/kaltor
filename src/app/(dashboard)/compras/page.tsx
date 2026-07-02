import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import AlertasOCPanel from '@/components/compras/AlertasOCPanel'
import OrdenesConFiltro from '@/components/compras/OrdenesConFiltro'
import { tieneSubPermiso } from '@/lib/modulos'

export default async function ComprasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesData = perfil?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = perfil?.permisos_modulos as Record<string, boolean> | null
  const puedeCrear = tieneSubPermiso('compras.crear', rolNombre, permisos)

  const { data: ordenes } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(nombre, whatsapp, telefono)')
    .order('created_at', { ascending: false })
    .limit(100)

  const hoyStr = new Intl.DateTimeFormat('sv', { timeZone: 'America/Santiago' }).format(new Date())

  type ORow = { id: string; numero_oc: string; estado: string; metodo_pago?: string | null; total?: number | null; monto_pagado?: number | null; fecha_pago?: string | null; created_at?: string | null; notas?: string | null; fecha_estimada_llegada?: string | null; suppliers?: { nombre?: string | null; whatsapp?: string | null; telefono?: string | null } | null }
  const todas = (ordenes ?? []) as ORow[]
  const borradores = todas.filter(o => (o.notas ?? '').startsWith('[SOLICITUD]'))
  const otrasOrdenes = todas.filter(o => !(o.notas ?? '').startsWith('[SOLICITUD]'))

  return (
    <div className="p-6 space-y-4">
      <AlertasOCPanel />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
        <Link href="/compras/historial">
          <Button variant="outline" className="gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50">
            🔍 Historial de compras
          </Button>
        </Link>
      </div>

      <OrdenesConFiltro
        borradores={borradores}
        ordenes={otrasOrdenes}
        hoyStr={hoyStr}
        puedeCrear={puedeCrear}
      />
    </div>
  )
}
