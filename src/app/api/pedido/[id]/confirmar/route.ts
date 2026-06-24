import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    const body = await req.json() as {
      disponibles: Record<string, boolean>
      cantidades?: Record<string, string>
      precios?: Record<string, string>
      notas?: Record<string, string>
      alternativas?: Record<string, string>
      preciosAlternativa?: Record<string, string>
      cantidadesAlternativa?: Record<string, string>
      productosAdicionales?: { nombre: string; cantidad: number; precio: number; nota?: string }[]
      descuentos?: Record<string, { tipo: string; valor: number; desdeCantidad: number | null }>
    }
    const { disponibles, cantidades = {}, precios = {}, notas = {}, alternativas = {}, preciosAlternativa = {}, cantidadesAlternativa = {}, productosAdicionales = [], descuentos = {} } = body

    // Paso 1: update solo disponible_proveedor (columna que siempre existe)
    await Promise.all(
      Object.entries(disponibles).map(([itemId, disp]) =>
        supabase.from('purchase_order_items')
          .update({ disponible_proveedor: disp })
          .eq('id', itemId)
      )
    )

    // Paso 2: cada columna extendida en su propio update para que el fallo de una
    // no impida guardar las demás (si la columna no existe, solo ese update falla)
    await Promise.all(
      Object.entries(disponibles).map(async ([itemId]) => {
        const tryUpdate = (payload: Record<string, unknown>) =>
          supabase.from('purchase_order_items').update(payload).eq('id', itemId)

        if (precios[itemId])
          await tryUpdate({ precio_cotizado: parseInt(precios[itemId]) })
        if (cantidades[itemId])
          await tryUpdate({ cantidad_disponible_proveedor: parseInt(cantidades[itemId]) })
        if (notas[itemId]?.trim())
          await tryUpdate({ nota_proveedor: notas[itemId].trim() })
        if (alternativas[itemId]?.trim())
          await tryUpdate({ alternativa: alternativas[itemId].trim() })
        if (preciosAlternativa[itemId])
          await tryUpdate({ precio_alternativa: parseInt(preciosAlternativa[itemId]) })
        if (cantidadesAlternativa[itemId])
          await tryUpdate({ cantidad_alternativa: parseInt(cantidadesAlternativa[itemId]) })
        const desc = descuentos[itemId]
        if (desc) {
          await tryUpdate({
            descuento_tipo: desc.tipo,
            descuento_valor: desc.valor,
            descuento_desde_cantidad: desc.desdeCantidad,
          })
        }
      })
    )

    // Paso 3: insertar productos adicionales sugeridos por el proveedor
    // cantidad_solicitada=0 es el marcador de "sugerido por proveedor" (sin necesidad de columna extra)
    if (productosAdicionales.length > 0) {
      const validos = productosAdicionales.filter(p => p.nombre?.trim())
      if (validos.length > 0) {
        const basePayload = validos.map(p => ({
          purchase_order_id: id,
          nombre: p.nombre.trim(),
          cantidad_solicitada: 0,
          cantidad_recibida: 0,
          precio_unitario: p.precio || 0,
          subtotal: 0,                          // NOT NULL en schema
          costo_envio_prorrateado: 0,
          precio_cotizado: p.precio || null,
          nota_proveedor: p.nota?.trim() || null,
          disponible_proveedor: true,
        }))
        // Intentar con sugerido_proveedor; si la columna no existe aún, reintentar sin ella
        const { error: insErr } = await supabase.from('purchase_order_items')
          .insert(basePayload.map(row => ({ ...row, sugerido_proveedor: true })))
        if (insErr) {
          await supabase.from('purchase_order_items').insert(basePayload)
        }
      }
    }

    // Paso 4: siempre actualizar estado (columna que siempre existe)
    await supabase.from('purchase_orders')
      .update({ estado: 'proveedor_respondio' })
      .eq('id', id)

    // Paso 5: intentar confirmado_proveedor_at (columna de migración, puede no existir)
    await supabase.from('purchase_orders')
      .update({ confirmado_proveedor_at: new Date().toISOString() })
      .eq('id', id)
    // error silenciado

    // Notificación al admin
    const { data: orden } = await supabase
      .from('purchase_orders')
      .select('numero_oc, suppliers(nombre)')
      .eq('id', id)
      .single()

    const totalDisponibles = Object.values(disponibles).filter(Boolean).length
    const totalItems = Object.keys(disponibles).length
    const ocNum = (orden as Record<string, unknown>)?.numero_oc as string ?? 'OC'
    const proveedor = ((orden as Record<string, unknown>)?.suppliers as { nombre: string } | null)?.nombre ?? 'Proveedor'
    const extras = productosAdicionales.filter(p => p.nombre?.trim()).length

    await supabase.from('notifications').insert({
      tipo: 'envio_proveedor',
      titulo: `${proveedor} respondió la cotización`,
      mensaje: `${totalDisponibles}/${totalItems} productos disponibles en ${ocNum}${extras > 0 ? ` · ${extras} producto(s) adicional(es) sugerido(s)` : ''}. Revisa y confirma.`,
      url: `/compras/orden/${id}`,
      leida: false,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[confirmar pedido]', e)
    return NextResponse.json({ error: 'Error al confirmar' }, { status: 500 })
  }
}
