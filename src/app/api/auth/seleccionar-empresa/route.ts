import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { store_id } = await req.json()
  if (!store_id) return NextResponse.json({ error: 'store_id es requerido' }, { status: 400 })

  // Verifica que el usuario realmente pertenezca a esa tienda antes de cambiarla
  const { data: membresia, error: membresiaErr } = await supabase
    .from('store_users')
    .select('store_id')
    .eq('user_id', user.id)
    .eq('store_id', store_id)
    .maybeSingle()

  if (membresiaErr) return NextResponse.json({ error: membresiaErr.message }, { status: 400 })
  if (!membresia) return NextResponse.json({ error: 'No perteneces a esa empresa' }, { status: 403 })

  const admin = createServiceClient()
  const { error } = await admin.from('user_profiles').update({ store_id }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
