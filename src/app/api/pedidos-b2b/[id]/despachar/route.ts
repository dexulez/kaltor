import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { calcularPpm } from '@/lib/calculations'

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
    return NextResponse.json({ error: 'No tienes permiso para despachar pedidos' }, { status: 403 })
  }

  const admin = createServiceClient()

  const { data: pedido } = await admin.from('sales_orders').select('*').eq('id', id).single()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  if (pedido.estado !== 'preparando') {
    return NextResponse.json({ error: 'Este pedido no está en etapa de preparación' }, { status: 400 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const foto = formData.get('foto') as File | null
  const preciosRaw = formData.get('precios') as string | null
  let preciosCorregidos: Record<string, number> = {}
  if (preciosRaw) {
    try { preciosCorregidos = JSON.parse(preciosRaw) } catch { /* ignorar */ }
  }

  let comprobanteEnvioUrl: string | null = pedido.comprobante_envio_url ?? null
  if (foto && foto.size > 0) {
    const path = `pedidos-b2b/${id}/${Date.now()}.jpg`
    const buffer = Buffer.from(await foto.arrayBuffer())
    const { error: upErr } = await admin.storage.from('ot-fotos').upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
    if (upErr) {
      return NextResponse.json({ error: 'Error al subir la foto: ' + upErr.message }, { status: 500 })
    }
    const { data } = admin.storage.from('ot-fotos').getPublicUrl(path)
    comprobanteEnvioUrl = data.publicUrl
  }

  const { data: itemsPedido } = await admin.from('sales_order_items').select('*').eq('sales_order_id', id).gt('cantidad_confirmada', 0)
  const items = itemsPedido ?? []
  if (items.length === 0) {
    return NextResponse.json({ error: 'El pedido no tiene productos confirmados' }, { status: 400 })
  }

  const itemsCorregidos = items.map(it => {
    const nuevoPrecio = preciosCorregidos[it.id]
    const precioFinal = nuevoPrecio > 0 ? nuevoPrecio : it.precio_unitario
    return { ...it, precioFinal, subtotalFinal: precioFinal * (it.cantidad_confirmada ?? 0) }
  })

  await Promise.all(itemsCorregidos.map(it =>
    admin.from('sales_order_items').update({ precio_unitario: it.precioFinal, subtotal: it.subtotalFinal }).eq('id', it.id)
  ))

  const totalBruto = itemsCorregidos.reduce((s, it) => s + it.subtotalFinal, 0)

  const { data: cfg } = await admin
    .from('system_config')
    .select('iva, ppm, comision_debito, comision_credito')
    .single()
  const ivaPct = cfg?.iva ?? 19
  const ppmPct = cfg?.ppm ?? 3
  const neto = Math.round(totalBruto / (1 + ivaPct / 100))
  const iva = totalBruto - neto
  const ppm = calcularPpm(neto, ppmPct)
  const metodoPago = pedido.metodo_pago ?? 'transferencia'
  const comisionPct = metodoPago === 'debito' ? (cfg?.comision_debito ?? 0) : metodoPago === 'credito' ? (cfg?.comision_credito ?? 0) : 0
  const comisionBancaria = Math.round(totalBruto * comisionPct / 100)

  // Si ya estaba pagado en su totalidad sin abonos manuales registrados, el monto pagado
  // sigue al total corregido; si ya hay abonos parciales, se respetan y solo se recalcula el flag.
  const { count: pagosCount } = await admin
    .from('sales_order_payments')
    .select('id', { count: 'exact', head: true })
    .eq('sales_order_id', id)

  const montoPagado = (!pagosCount && pedido.pagado)
    ? totalBruto
    : (pedido.monto_pagado ?? 0)
  const pagadoFinal = montoPagado >= totalBruto

  await admin.from('sales_orders').update({
    estado: 'en_camino',
    total_estimado: totalBruto,
    comprobante_envio_url: comprobanteEnvioUrl,
    monto_pagado: montoPagado,
    pagado: pagadoFinal,
  }).eq('id', id)

  if (pedido.sale_id) {
    await admin.from('sales').update({
      subtotal: neto,
      iva,
      ppm,
      total: totalBruto,
      comision_bancaria: comisionBancaria,
    }).eq('id', pedido.sale_id)

    const { data: productosData } = await admin
      .from('products')
      .select('id, precio_costo, costo_envio')
      .in('id', itemsCorregidos.map(it => it.product_id))
    const productosMap = new Map((productosData ?? []).map(p => [p.id as string, p]))

    await admin.from('sale_items').delete().eq('sale_id', pedido.sale_id)
    await admin.from('sale_items').insert(itemsCorregidos.map(it => {
      const p = productosMap.get(it.product_id)
      return {
        sale_id: pedido.sale_id,
        product_id: it.product_id,
        nombre: it.nombre,
        cantidad: it.cantidad_confirmada,
        precio_unitario: it.precioFinal,
        precio_costo: (p?.precio_costo ?? 0) + (p?.costo_envio ?? 0),
        subtotal: it.subtotalFinal,
      }
    }))
  }

  return NextResponse.json({ ok: true })
}
