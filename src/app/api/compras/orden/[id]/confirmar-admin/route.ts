import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface ItemSeleccion {
  aceptado: boolean
  cantidadAceptada: number
  precioAceptado: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    const body = await req.json() as { items: Record<string, ItemSeleccion> }
    const { items } = body

    // Paso 1: disponible_proveedor (siempre existe)
    await Promise.all(
      Object.entries(items).map(([itemId, sel]) =>
        supabase.from('purchase_order_items')
          .update({ disponible_proveedor: sel.aceptado })
          .eq('id', itemId)
      )
    )

    // Paso 2: cada columna extendida por separado para evitar que el fallo de
    // una columna inexistente bloquee el guardado de las otras
    await Promise.all(
      Object.entries(items).map(async ([itemId, sel]) => {
        const tryUpdate = (payload: Record<string, unknown>) =>
          supabase.from('purchase_order_items').update(payload).eq('id', itemId)

        await tryUpdate({ precio_cotizado: sel.aceptado ? sel.precioAceptado : null })
        await tryUpdate({ cantidad_disponible_proveedor: sel.aceptado ? sel.cantidadAceptada : 0 })
        await tryUpdate({ precio_aceptado: sel.aceptado ? sel.precioAceptado : null })
        // La cantidad y el precio que el admin confirma pasan a ser los
        // definitivos del ítem (lo que se va a recibir y a cobrar). Si el
        // ítem no se acepta, se deja en 0 para que no se siga cobrando.
        if (sel.aceptado) {
          await tryUpdate({ cantidad_solicitada: sel.cantidadAceptada, subtotal: sel.cantidadAceptada * sel.precioAceptado })
        } else {
          await tryUpdate({ subtotal: 0 })
        }
      })
    )

    // Calcular total confirmado (solo ítems aceptados)
    const totalConfirmado = Object.values(items)
      .filter(s => s.aceptado)
      .reduce((acc, s) => acc + (s.cantidadAceptada * s.precioAceptado), 0)

    // Actualizar orden con columnas existentes
    await supabase.from('purchase_orders')
      .update({
        estado: 'confirmada',
        total: totalConfirmado,
      })
      .eq('id', id)

    // Notificación interna
    const { data: orden } = await supabase
      .from('purchase_orders')
      .select('numero_oc, suppliers(nombre)')
      .eq('id', id)
      .single()

    const ocNum = (orden as Record<string, unknown>)?.numero_oc as string ?? 'OC'
    const proveedor = ((orden as Record<string, unknown>)?.suppliers as { nombre: string } | null)?.nombre ?? 'Proveedor'
    const aceptados = Object.values(items).filter(s => s.aceptado).length
    const total = Object.keys(items).length

    await supabase.from('notifications').insert({
      tipo: 'envio_proveedor',
      titulo: `${ocNum} confirmada — esperando envío`,
      mensaje: `${aceptados}/${total} ítems confirmados a ${proveedor}. Total: $${totalConfirmado.toLocaleString('es-CL')}`,
      url: `/compras/orden/${id}`,
      leida: false,
    })

    return NextResponse.json({ ok: true, totalConfirmado })
  } catch (e) {
    console.error('[confirmar-admin]', e)
    return NextResponse.json({ error: 'Error al confirmar' }, { status: 500 })
  }
}
