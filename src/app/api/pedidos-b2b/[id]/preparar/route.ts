import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

type ProfileRoleResult = {
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

function getRoleName(profile: ProfileRoleResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

const ROLES_AUTORIZADOS = ['administrador', 'vendedor', 'supervisor_ventas']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: callerProfile } = await supabase.from('user_profiles').select('roles(nombre)').eq('id', user.id).single()
  const rolLlamador = getRoleName(callerProfile as ProfileRoleResult | null) ?? ''

  const admin = createServiceClient()
  const { data: pedido } = await admin.from('sales_orders').select('*').eq('id', id).single()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  const esCompradorDelPedido = rolLlamador === 'comprador_externo' && pedido.comprador_id === user.id
  if (!ROLES_AUTORIZADOS.includes(rolLlamador) && !esCompradorDelPedido) {
    return NextResponse.json({ error: 'No tienes permiso para esta acción' }, { status: 403 })
  }
  if (pedido.estado !== 'confirmado') {
    return NextResponse.json({ error: 'Este pedido no está confirmado' }, { status: 400 })
  }

  await admin.from('sales_orders').update({ estado: 'preparando' }).eq('id', id)

  return NextResponse.json({ ok: true })
}
