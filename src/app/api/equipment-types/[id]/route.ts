import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAuthClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('store_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const { error } = await admin
    .from('equipment_types')
    .delete()
    .eq('id', id)
    .eq('store_id', profile.store_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
