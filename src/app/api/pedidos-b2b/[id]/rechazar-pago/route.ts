import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { enviarWAServer } from '@/lib/whatsapp-server'
import { msgPagoB2BRechazado } from '@/lib/whatsapp'

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
  if (!ROLES_AUTORIZADOS.includes(getRoleName(callerProfile as ProfileRoleResult | null) ?? '')) {
    return NextResponse.json({ error: 'No tienes permiso para rechazar pagos' }, { status: 403 })
  }

  let body: { motivo?: string | null }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const admin = createServiceClient()
  const { data: pedido } = await admin.from('sales_orders').select('*').eq('id', id).single()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (!pedido.pago_en_revision) return NextResponse.json({ error: 'Este pedido no tiene un pago en revisión' }, { status: 400 })

  const { error: ordenErr } = await admin.from('sales_orders').update({
    pago_en_revision: false,
    metodo_pago_reportado: null,
    nota_pago_comprador: null,
    monto_reportado: null,
  }).eq('id', id)
  if (ordenErr) return NextResponse.json({ error: 'Error al actualizar el pedido: ' + ordenErr.message }, { status: 500 })

  const { data: comprador } = await admin.from('user_profiles').select('nombre_completo, telefono').eq('id', pedido.comprador_id).single()
  const { data: cfg } = await admin.from('system_config').select('nombre_local').single()
  if (comprador?.telefono) {
    await enviarWAServer(
      comprador.telefono,
      msgPagoB2BRechazado(comprador.nombre_completo ?? 'Cliente', pedido.numero_pedido, body.motivo?.trim() || null, cfg?.nombre_local ?? 'TechRepair Pro')
    )
  }

  return NextResponse.json({ ok: true })
}
