import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('store_users')
    .select('store_id, stores(id, nombre, slug, plan_id, plans(nombre))')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const empresas = (data ?? [])
    .map(row => row.stores)
    .filter(Boolean)

  return NextResponse.json({ empresas })
}
