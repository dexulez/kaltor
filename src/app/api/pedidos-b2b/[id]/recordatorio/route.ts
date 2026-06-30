import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { enviarWAServer } from '@/lib/whatsapp-server'
import { msgRecordatorioPagoB2B } from '@/lib/whatsapp'

type ProfileRoleResult = {
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

function getRoleName(profile: ProfileRoleResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

const ROLES_AUTORIZADOS = ['administrador', 'vendedor', 'supervisor_ventas']

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: callerProfile } = await supabase.from('user_profiles').select('roles(nombre)').eq('id', user.id).single()
  if (!ROLES_AUTORIZADOS.includes(getRoleName(callerProfile as ProfileRoleResult | null) ?? '')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const admin = createServiceClient()
  const { data: pedido } = await admin.from('sales_orders').select('*').eq('id', id).single()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (pedido.pagado) return NextResponse.json({ error: 'El pedido ya está pagado' }, { status: 400 })

  const saldoPendiente = (pedido.total_estimado ?? 0) - (pedido.monto_pagado ?? 0)
  if (saldoPendiente <= 0) return NextResponse.json({ error: 'Sin saldo pendiente' }, { status: 400 })

  const { data: comprador } = await admin
    .from('user_profiles')
    .select('nombre_completo, telefono')
    .eq('id', pedido.comprador_id)
    .single()

  const { data: cfg } = await admin.from('system_config').select('nombre_local').single()
  const nombreLocal = cfg?.nombre_local ?? 'TechRepair Pro'

  if (comprador?.telefono) {
    await enviarWAServer(
      comprador.telefono,
      msgRecordatorioPagoB2B(
        comprador.nombre_completo ?? 'Cliente',
        pedido.numero_pedido,
        saldoPendiente,
        pedido.fecha_vencimiento_pago ?? null,
        nombreLocal
      )
    )
  }

  await admin.from('sales_orders').update({
    recordatorio_enviado_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true, telefono: comprador?.telefono ?? null })
}
