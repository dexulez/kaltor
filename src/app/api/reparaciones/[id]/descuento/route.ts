import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    const { descuento, precioFinal } = await req.json() as { descuento: number; precioFinal: number }

    const { error } = await supabase
      .from('repair_orders')
      .update({ descuento, precio_servicio: precioFinal } as Record<string, unknown>)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[descuento OT]', e)
    return NextResponse.json({ error: 'Error al guardar descuento' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    const { data: ot, error: fetchErr } = await supabase
      .from('repair_orders')
      .select('precio_servicio, descuento')
      .eq('id', id)
      .single()

    if (fetchErr || !ot) throw fetchErr

    const precioOriginal = (ot.precio_servicio ?? 0) + ((ot as Record<string, unknown>).descuento as number ?? 0)

    const { error } = await supabase
      .from('repair_orders')
      .update({ descuento: 0, precio_servicio: precioOriginal } as Record<string, unknown>)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[descuento OT delete]', e)
    return NextResponse.json({ error: 'Error al eliminar descuento' }, { status: 500 })
  }
}
