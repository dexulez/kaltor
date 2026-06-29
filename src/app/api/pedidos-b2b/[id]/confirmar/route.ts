import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { calcularPpm } from '@/lib/calculations'
import { enviarWAServer } from '@/lib/whatsapp-server'
import { msgPedidoB2BConfirmado } from '@/lib/whatsapp'

type ProfileRoleResult = {
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

function getRoleName(profile: ProfileRoleResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

const ROLES_AUTORIZADOS = ['administrador', 'vendedor', 'supervisor_ventas']

interface ItemSeleccion {
  cantidadConfirmada: number
  precioUnitario: number
}

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
    return NextResponse.json({ error: 'No tienes permiso para confirmar pedidos' }, { status: 403 })
  }

  let body: { items?: Record<string, ItemSeleccion>; metodoPago?: string; tipoDocumento?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  const seleccion = body.items ?? {}

  const admin = createServiceClient()

  const { data: pedido } = await admin.from('sales_orders').select('*').eq('id', id).single()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (pedido.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Este pedido ya fue procesado' }, { status: 400 })
  }

  const { data: itemsPedido } = await admin.from('sales_order_items').select('*').eq('sales_order_id', id)
  const itemsConfirmados = (itemsPedido ?? [])
    .map(it => {
      const sel = seleccion[it.id]
      if (!sel || sel.cantidadConfirmada <= 0) return null
      return { ...it, cantidadConfirmada: sel.cantidadConfirmada, precioFinal: sel.precioUnitario }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  if (itemsConfirmados.length === 0) {
    return NextResponse.json({ error: 'Debes confirmar al menos un producto' }, { status: 400 })
  }

  const { data: productosData } = await admin
    .from('products')
    .select('id, precio_costo, costo_envio, stock_actual')
    .in('id', itemsConfirmados.map(i => i.product_id))
  const productosMap = new Map((productosData ?? []).map(p => [p.id as string, p]))

  const { data: cfg } = await admin
    .from('system_config')
    .select('iva, ppm, comision_debito, comision_credito, nombre_local')
    .single()

  const totalBruto = itemsConfirmados.reduce((s, i) => s + i.cantidadConfirmada * i.precioFinal, 0)
  const ivaPct = cfg?.iva ?? 19
  const ppmPct = cfg?.ppm ?? 3
  const neto = Math.round(totalBruto / (1 + ivaPct / 100))
  const iva = totalBruto - neto
  const ppm = calcularPpm(neto, ppmPct)
  const metodoPago = body.metodoPago || 'transferencia'
  const comisionPct = metodoPago === 'debito' ? (cfg?.comision_debito ?? 0) : metodoPago === 'credito' ? (cfg?.comision_credito ?? 0) : 0
  const comisionBancaria = Math.round(totalBruto * comisionPct / 100)

  const { data: compradorProfile } = await admin
    .from('user_profiles')
    .select('nombre_completo, telefono, customer_id')
    .eq('id', pedido.comprador_id)
    .single()

  const { data: venta, error: ventaErr } = await admin.from('sales').insert({
    tipo: 'directa',
    customer_id: compradorProfile?.customer_id ?? null,
    subtotal: neto,
    iva,
    ppm,
    total: totalBruto,
    metodo_pago: metodoPago,
    comision_bancaria: comisionBancaria,
    tipo_documento: body.tipoDocumento || 'factura',
    usuario_id: user.id,
    notas: `Pedido B2B ${pedido.numero_pedido}`,
  }).select().single()

  if (ventaErr || !venta) {
    return NextResponse.json({ error: 'Error al generar la venta: ' + ventaErr?.message }, { status: 500 })
  }

  const { error: itemsErr } = await admin.from('sale_items').insert(itemsConfirmados.map(it => {
    const p = productosMap.get(it.product_id)
    return {
      sale_id: venta.id,
      product_id: it.product_id,
      nombre: it.nombre,
      cantidad: it.cantidadConfirmada,
      precio_unitario: it.precioFinal,
      precio_costo: (p?.precio_costo ?? 0) + (p?.costo_envio ?? 0),
      subtotal: it.cantidadConfirmada * it.precioFinal,
    }
  }))
  if (itemsErr) {
    // La venta ya quedó creada (sin items) — se revierte para no dejar una venta fantasma
    await admin.from('sales').delete().eq('id', venta.id)
    return NextResponse.json({ error: 'Error al guardar los productos de la venta: ' + itemsErr.message }, { status: 500 })
  }

  for (const it of itemsConfirmados) {
    const p = productosMap.get(it.product_id)
    if (!p) continue
    const stockAnterior = p.stock_actual ?? 0
    const stockNuevo = Math.max(0, stockAnterior - it.cantidadConfirmada)
    const { error: stockErr } = await admin.from('products').update({ stock_actual: stockNuevo }).eq('id', it.product_id)
    if (stockErr) console.error('[confirmar pedido b2b] error al descontar stock', it.product_id, stockErr)

    const { error: movErr } = await admin.from('stock_movements').insert({
      product_id: it.product_id,
      tipo: 'salida',
      cantidad: it.cantidadConfirmada,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      razon: `Venta B2B ${venta.numero_venta}`,
      referencia_id: venta.id,
      referencia_tipo: 'sale',
    })
    if (movErr) console.error('[confirmar pedido b2b] error al registrar movimiento de stock', it.product_id, movErr)

    const { error: itemErr } = await admin.from('sales_order_items').update({ cantidad_confirmada: it.cantidadConfirmada }).eq('id', it.id)
    if (itemErr) console.error('[confirmar pedido b2b] error al marcar cantidad confirmada', it.id, itemErr)
  }

  await admin.from('sales_orders').update({
    estado: 'confirmado',
    sale_id: venta.id,
    confirmado_por: user.id,
    confirmado_at: new Date().toISOString(),
    total_estimado: totalBruto,
  }).eq('id', id)

  if (compradorProfile?.telefono) {
    await enviarWAServer(
      compradorProfile.telefono,
      msgPedidoB2BConfirmado(compradorProfile.nombre_completo ?? 'Cliente', pedido.numero_pedido, totalBruto, cfg?.nombre_local ?? 'TechRepair Pro')
    )
  }

  return NextResponse.json({ ok: true, venta_id: venta.id })
}
