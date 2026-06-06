import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Verificar que el usuario está autenticado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Verificar que la OC existe y está en estado pendiente
  const { data: oc } = await supabase
    .from('purchase_orders')
    .select('id, estado')
    .eq('id', id)
    .single()

  if (!oc) return NextResponse.json({ error: 'OC no encontrada' }, { status: 404 })
  if (oc.estado !== 'pendiente') return NextResponse.json({ ok: true, skipped: true })

  const { error } = await supabase
    .from('purchase_orders')
    .update({ estado: 'enviada' })
    .eq('id', id)

  if (error) {
    console.error('[marcar-enviada]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
