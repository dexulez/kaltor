import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    const body = await req.json() as { tipo: string; valor: string; notas?: string }
    const clave = { tipo: body.tipo, valor: body.valor, notas: body.notas ?? null }

    const { error } = await supabase
      .from('repair_orders')
      .update({ clave_dispositivo: clave } as Record<string, unknown>)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[clave dispositivo]', e)
    return NextResponse.json({ error: 'Error al guardar clave' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  try {
    const { error } = await supabase
      .from('repair_orders')
      .update({ clave_dispositivo: null } as Record<string, unknown>)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[clave dispositivo delete]', e)
    return NextResponse.json({ error: 'Error al borrar clave' }, { status: 500 })
  }
}
