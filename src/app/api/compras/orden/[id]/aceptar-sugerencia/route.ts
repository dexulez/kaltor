import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params
  const supabase = createServiceClient()

  try {
    const body = await req.json() as {
      itemId: string
      nombre: string
      categoria_id: string
      precio_venta: number
      precio_costo: number
      stock_minimo: number
      sku?: string
      proveedor_id?: string
    }

    if (!body.itemId || !body.nombre || !body.categoria_id || !body.precio_venta) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // 1. Crear producto en inventario
    const { data: producto, error: errProducto } = await supabase
      .from('products')
      .insert({
        nombre: body.nombre,
        categoria_id: body.categoria_id,
        precio_costo: body.precio_costo ?? 0,
        precio_venta: body.precio_venta,
        stock_actual: 0,
        stock_minimo: body.stock_minimo ?? 1,
        ...(body.sku ? { sku: body.sku } : {}),
        ...(body.proveedor_id ? { proveedor_id: body.proveedor_id } : {}),
      })
      .select('id')
      .single()

    if (errProducto) {
      return NextResponse.json({ error: errProducto.message }, { status: 400 })
    }

    // 2. Promover el ítem sugerido a ítem regular de la OC:
    //    cantidad_solicitada=1 lo saca de la sección "sugeridos" y lo pone en la tabla de revisión
    const precioCosto = body.precio_costo ?? 0
    await supabase
      .from('purchase_order_items')
      .update({
        product_id: producto.id,
        cantidad_solicitada: 1,
        precio_unitario: precioCosto,
        subtotal: precioCosto,
        disponible_proveedor: true,
        precio_cotizado: precioCosto,
      })
      .eq('id', body.itemId)

    return NextResponse.json({ ok: true, productoId: producto.id })
  } catch (e) {
    console.error('[aceptar-sugerencia]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
