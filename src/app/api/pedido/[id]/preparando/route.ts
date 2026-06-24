import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    await supabase.from('purchase_orders').update({ estado: 'preparando' }).eq('id', id)

    const { data: orden } = await supabase
      .from('purchase_orders')
      .select('numero_oc, suppliers(nombre)')
      .eq('id', id)
      .single()

    const ocNum = (orden as Record<string, unknown>)?.numero_oc as string ?? 'OC'
    const proveedor = ((orden as Record<string, unknown>)?.suppliers as { nombre: string } | null)?.nombre ?? 'Proveedor'

    await supabase.from('notifications').insert({
      tipo: 'preparando_pedido',
      titulo: `📦 ${proveedor} está preparando el pedido`,
      mensaje: `${ocNum} — En preparación, próximamente confirmará el envío.`,
      url: `/compras/orden/${id}`,
      leida: false,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[marcar preparando]', e)
    return NextResponse.json({ error: 'Error al actualizar el estado' }, { status: 500 })
  }
}
