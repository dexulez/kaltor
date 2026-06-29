import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { enviarWAServer } from '@/lib/whatsapp-server'
import { msgPedidoB2BPagado } from '@/lib/whatsapp'

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
    return NextResponse.json({ error: 'No tienes permiso para registrar pagos' }, { status: 403 })
  }

  let body: { monto?: number; metodoPago?: string; nota?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const montoNum = Number(body.monto)
  if (!montoNum || montoNum <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })

  const admin = createServiceClient()
  const { data: pedido } = await admin.from('sales_orders').select('*').eq('id', id).single()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (!pedido.sale_id) return NextResponse.json({ error: 'Este pedido todavía no fue confirmado' }, { status: 400 })

  const saldoPendiente = (pedido.total_estimado ?? 0) - (pedido.monto_pagado ?? 0)
  if (montoNum > saldoPendiente) {
    return NextResponse.json({ error: 'El monto supera el saldo pendiente' }, { status: 400 })
  }

  const { error: pagoErr } = await admin.from('sales_order_payments').insert({
    sales_order_id: id,
    monto: montoNum,
    metodo_pago: body.metodoPago || 'transferencia',
    fecha: new Date().toISOString().split('T')[0],
    nota: body.nota ?? null,
  })
  if (pagoErr) return NextResponse.json({ error: 'Error al registrar el pago: ' + pagoErr.message }, { status: 500 })

  const yaEstabaPagado = pedido.pagado === true
  const nuevoMontoPagado = (pedido.monto_pagado ?? 0) + montoNum
  const quedoCompleto = nuevoMontoPagado >= (pedido.total_estimado ?? 0)

  await admin.from('sales_orders').update({
    monto_pagado: nuevoMontoPagado,
    pagado: quedoCompleto,
    fecha_pago: quedoCompleto ? new Date().toISOString() : pedido.fecha_pago,
  }).eq('id', id)

  if (!yaEstabaPagado && quedoCompleto) {
    const { data: comprador } = await admin.from('user_profiles').select('nombre_completo, telefono').eq('id', pedido.comprador_id).single()
    const { data: cfg } = await admin.from('system_config').select('nombre_local').single()
    if (comprador?.telefono) {
      await enviarWAServer(
        comprador.telefono,
        msgPedidoB2BPagado(comprador.nombre_completo ?? 'Cliente', pedido.numero_pedido, nuevoMontoPagado, cfg?.nombre_local ?? 'TechRepair Pro')
      )
    }
  }

  return NextResponse.json({ ok: true })
}
