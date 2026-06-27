import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    const formData = await req.formData()
    const foto = formData.get('foto') as File | null
    const preciosRaw = formData.get('precios') as string | null

    let fotoUrl: string | null = null

    if (foto) {
      const path = `pedidos/${id}/${Date.now()}.jpg`
      const buffer = Buffer.from(await foto.arrayBuffer())
      const { error: upErr } = await supabase.storage
        .from('ot-fotos')
        .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

      if (upErr) {
        return NextResponse.json({ error: 'Error al subir foto' }, { status: 500 })
      }
      const { data } = supabase.storage.from('ot-fotos').getPublicUrl(path)
      fotoUrl = data.publicUrl
    }

    // Corrección de precio final del proveedor justo antes de despachar: se guarda como
    // precio_aceptado (el campo que ya prioriza el resto del sistema) y se recalculan
    // subtotal y total de la OC para que coincidan con lo que el proveedor está cobrando.
    if (preciosRaw) {
      try {
        const preciosCorregidos = JSON.parse(preciosRaw) as Record<string, number>
        const { data: itemsOC } = await supabase
          .from('purchase_order_items')
          .select('id, cantidad_solicitada, disponible_proveedor, precio_aceptado, precio_cotizado, precio_unitario')
          .eq('purchase_order_id', id)

        if (itemsOC && itemsOC.length > 0) {
          await Promise.all(itemsOC.map(item => {
            const nuevoPrecio = preciosCorregidos[item.id]
            if (!(nuevoPrecio > 0)) return null
            return supabase.from('purchase_order_items')
              .update({ precio_aceptado: nuevoPrecio, subtotal: nuevoPrecio * item.cantidad_solicitada })
              .eq('id', item.id)
          }))

          const { data: ordenActual } = await supabase
            .from('purchase_orders').select('costo_envio_total').eq('id', id).single()
          const costoEnvio = (ordenActual as { costo_envio_total?: number } | null)?.costo_envio_total ?? 0
          const nuevoTotal = itemsOC
            .filter(i => i.cantidad_solicitada > 0 && i.disponible_proveedor !== false)
            .reduce((s, item) => {
              const precio = preciosCorregidos[item.id] > 0
                ? preciosCorregidos[item.id]
                : (item.precio_aceptado ?? item.precio_cotizado ?? item.precio_unitario)
              return s + precio * item.cantidad_solicitada
            }, 0) + costoEnvio
          await supabase.from('purchase_orders').update({ total: nuevoTotal }).eq('id', id)
        }
      } catch (e) {
        console.error('[confirmar envio] error al recalcular precios finales', e)
      }
    }

    // Guardar URL del comprobante y avanzar estado
    await supabase.from('purchase_orders')
      .update({ comprobante_envio_url: fotoUrl, estado: 'en_transito' })
      .eq('id', id)

    // Obtener datos para notificación
    const { data: orden } = await supabase
      .from('purchase_orders')
      .select('numero_oc, suppliers(nombre)')
      .eq('id', id)
      .single()

    const ocNum = (orden as Record<string, unknown>)?.numero_oc as string ?? 'OC'
    const proveedor = ((orden as Record<string, unknown>)?.suppliers as { nombre: string } | null)?.nombre ?? 'Proveedor'

    // Notificación de envío confirmado
    await supabase.from('notifications').insert({
      tipo: 'envio_proveedor',
      titulo: `🚚 ${proveedor} confirmó el envío`,
      mensaje: `${ocNum} — Comprobante de envío recibido. Esperar llegada de mercancía.`,
      url: `/compras/orden/${id}`,
      leida: false,
    })

    return NextResponse.json({ ok: true, fotoUrl })
  } catch (e) {
    console.error('[confirmar envio]', e)
    return NextResponse.json({ error: 'Error al confirmar envío' }, { status: 500 })
  }
}
