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
