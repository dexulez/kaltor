import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { esCategoriaValida } from '@/lib/respaldo/categorias'

type ProfileResult = {
  store_id?: string | null
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

function getRoleName(profile: ProfileResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('store_id, roles(nombre)')
    .eq('id', user.id)
    .single()

  const storeId = (profile as ProfileResult | null)?.store_id ?? null
  if (!storeId) return NextResponse.json({ error: 'Usuario sin tienda asociada' }, { status: 400 })

  const rolNombre = getRoleName(profile as ProfileResult | null) ?? ''
  if (rolNombre !== 'administrador') {
    return NextResponse.json({ error: 'Solo un administrador puede ver esta información' }, { status: 403 })
  }

  const categoria = req.nextUrl.searchParams.get('categoria') ?? ''
  if (!esCategoriaValida(categoria)) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { data, error } = await admin.rpc('fn_contar_categoria', { p_categoria: categoria, p_store_id: storeId })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, conteos: data ?? [] })
}
