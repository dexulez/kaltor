import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { enviarWAServer } from '@/lib/whatsapp-server'
import { msgNuevoPedidoB2B } from '@/lib/whatsapp'

type ProfileRoleResult = {
  nombre_completo?: string | null
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

function getRoleName(profile: ProfileRoleResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

interface ItemCarrito {
  productId: string
  cantidad: number
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('nombre_completo, roles(nombre)')
    .eq('id', user.id)
    .single()

  if (getRoleName(profile as ProfileRoleResult | null) !== 'comprador_externo') {
    return NextResponse.json({ error: 'Solo compradores externos pueden crear pedidos' }, { status: 403 })
  }

  let body: { items?: ItemCarrito[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const itemsCarrito = (body.items ?? []).filter(i => i.productId && i.cantidad > 0)
  if (itemsCarrito.length === 0) return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 })

  const admin = createServiceClient()

  // Nunca confiar en precios del cliente: se recalculan desde la base de datos.
  const { data: productos } = await admin
    .from('products')
    .select('id, nombre, precio_mayorista, visible_compradores')
    .in('id', itemsCarrito.map(i => i.productId))

  const productosMap = new Map((productos ?? []).map(p => [p.id as string, p]))

  const itemsValidos = itemsCarrito
    .filter(i => {
      const p = productosMap.get(i.productId)
      return p && p.visible_compradores
    })
    .map(i => {
      const p = productosMap.get(i.productId)!
      const precioUnitario = p.precio_mayorista ?? 0
      return {
        product_id: p.id as string,
        nombre: p.nombre as string,
        cantidad_solicitada: i.cantidad,
        precio_unitario: precioUnitario,
        subtotal: precioUnitario * i.cantidad,
      }
    })

  if (itemsValidos.length === 0) {
    return NextResponse.json({ error: 'Ninguno de los productos del carrito está disponible' }, { status: 400 })
  }

  const totalEstimado = itemsValidos.reduce((s, i) => s + i.subtotal, 0)

  const { data: pedido, error: pedidoErr } = await admin
    .from('sales_orders')
    .insert({ comprador_id: user.id, total_estimado: totalEstimado })
    .select()
    .single()

  if (pedidoErr || !pedido) {
    return NextResponse.json({ error: 'Error al crear el pedido: ' + pedidoErr?.message }, { status: 500 })
  }

  const { error: itemsErr } = await admin
    .from('sales_order_items')
    .insert(itemsValidos.map(i => ({ ...i, sales_order_id: pedido.id })))

  if (itemsErr) {
    return NextResponse.json({ error: 'Error al guardar los productos del pedido: ' + itemsErr.message }, { status: 500 })
  }

  const nombreComprador = (profile as ProfileRoleResult | null)?.nombre_completo ?? 'Comprador'

  await admin.from('notifications').insert({
    tipo: 'pedido_b2b',
    titulo: `Nuevo pedido B2B de ${nombreComprador}`,
    mensaje: `${itemsValidos.length} producto(s) · Total estimado: $${totalEstimado.toLocaleString('es-CL')} · ${pedido.numero_pedido}`,
    url: `/pedidos-b2b/${pedido.id}`,
    leida: false,
  })

  const { data: cfg } = await admin.from('system_config').select('whatsapp').single()
  if (cfg?.whatsapp) {
    await enviarWAServer(
      cfg.whatsapp,
      msgNuevoPedidoB2B(nombreComprador, itemsValidos.map(i => ({ nombre: i.nombre, cantidad: i.cantidad_solicitada })), pedido.numero_pedido, totalEstimado)
    )
  }

  return NextResponse.json({ ok: true, numero_pedido: pedido.numero_pedido })
}
