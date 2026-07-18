import { NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createServiceClient()
  const { data } = await admin
    .from('vendedores_externos')
    .select('estado')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ esVendedor: !!data, estado: data?.estado ?? null })
}
