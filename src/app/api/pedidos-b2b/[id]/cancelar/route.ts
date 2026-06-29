import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { tieneSubPermiso } from '@/lib/modulos'

type ProfileResult = {
  nombre_completo?: string | null
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
  permisos_modulos?: Record<string, boolean> | null
}

function getRoleName(profile: ProfileResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

const ESTADOS_CANCELABLES = ['confirmado', 'preparando', 'en_camino']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('user_profiles')
    .select('nombre_completo, permisos_modulos, roles(nombre)')
    .eq('id', user.id)
    .single()

  const rolNombre = getRoleName(callerProfile as ProfileResult | null) ?? ''
  const permisos = (callerProfile as ProfileResult | null)?.permisos_modulos ?? null
  if (!tieneSubPermiso('caja.anular', rolNombre, permisos)) {
    return NextResponse.json({ error: 'No tienes permiso para cancelar pedidos' }, { status: 403 })
  }

  let body: { motivo?: string | null }
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const motivo = body.motivo ?? null

  const admin = createServiceClient()
  const { data: pedido } = await admin.from('sales_orders').select('*').eq('id', id).single()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (!ESTADOS_CANCELABLES.includes(pedido.estado)) {
    return NextResponse.json({ error: 'Este pedido no se puede cancelar en su estado actual' }, { status: 400 })
  }

  const { data: itemsPedido } = await admin.from('sales_order_items').select('*').eq('sales_order_id', id).gt('cantidad_confirmada', 0)

  for (const item of itemsPedido ?? []) {
    const { data: producto } = await admin.from('products').select('stock_actual').eq('id', item.product_id).single()
    if (!producto) continue
    const stockAnterior = producto.stock_actual ?? 0
    const stockNuevo = stockAnterior + (item.cantidad_confirmada ?? 0)
    await admin.from('products').update({ stock_actual: stockNuevo }).eq('id', item.product_id)
    await admin.from('stock_movements').insert({
      product_id: item.product_id,
      tipo: 'entrada',
      cantidad: item.cantidad_confirmada,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      razon: `Cancelación pedido B2B ${pedido.numero_pedido}`,
      referencia_id: pedido.id,
      referencia_tipo: 'sales_order',
    })
  }

  if (pedido.sale_id) {
    const { error: anularErr } = await admin.from('sales').update({
      anulada: true,
      motivo_anulacion: motivo ? `Cancelación pedido B2B: ${motivo}` : 'Cancelación de pedido B2B',
      anulado_por: user.id,
      anulado_at: new Date().toISOString(),
    }).eq('id', pedido.sale_id)
    if (anularErr) {
      await admin.from('sales').update({ anulada: true }).eq('id', pedido.sale_id)
    }

    await admin.from('audit_logs').insert({
      usuario_id: user.id,
      usuario_nombre: (callerProfile as ProfileResult | null)?.nombre_completo ?? '',
      accion: 'venta_anulada',
      modulo: 'caja',
      entidad_id: pedido.sale_id,
      entidad_desc: `Pedido B2B ${pedido.numero_pedido} cancelado${motivo ? ` — ${motivo}` : ''}`,
      metadata: {},
    })
  }

  await admin.from('sales_orders').update({
    estado: 'cancelado',
    cancelado_por: user.id,
    cancelado_at: new Date().toISOString(),
    motivo_cancelacion: motivo,
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
