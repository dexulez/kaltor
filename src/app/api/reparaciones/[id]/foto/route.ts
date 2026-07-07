import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    const { historialId } = await req.json() as { historialId: string }
    if (!historialId) throw new Error('Falta historialId')

    const { data: historial, error: fetchErr } = await supabase
      .from('repair_status_history')
      .select('id, foto_url')
      .eq('id', historialId)
      .eq('repair_order_id', id)
      .single()

    if (fetchErr || !historial) throw fetchErr ?? new Error('Foto no encontrada')

    const fotoUrl = (historial as { foto_url?: string | null }).foto_url
    const path = fotoUrl?.split('/ot-fotos/')[1]
    if (path) {
      await supabase.storage.from('ot-fotos').remove([path])
    }

    const { error: delErr } = await supabase
      .from('repair_status_history')
      .delete()
      .eq('id', historialId)

    if (delErr) throw delErr
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[foto OT delete]', e)
    return NextResponse.json({ error: 'Error al borrar la foto' }, { status: 500 })
  }
}
