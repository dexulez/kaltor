import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { CATEGORIAS, CATEGORIA_KEYS, esCategoriaValida } from '@/lib/respaldo/categorias'

type ProfileResult = {
  store_id?: string | null
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

function getRoleName(profile: ProfileResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

async function fetchTabla(admin: ReturnType<typeof createServiceClient>, tabla: string, storeId: string) {
  if (tabla === 'technician_commissions') {
    const { data: ordenes } = await admin.from('repair_orders').select('id').eq('store_id', storeId)
    const ids = (ordenes ?? []).map(o => o.id as string)
    if (ids.length === 0) return []
    const { data } = await admin.from('technician_commissions').select('*').in('repair_order_id', ids)
    return data ?? []
  }
  const { data } = await admin.from(tabla).select('*').eq('store_id', storeId)
  return data ?? []
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
    return NextResponse.json({ error: 'Solo un administrador puede generar respaldos' }, { status: 403 })
  }

  const categoriaParam = req.nextUrl.searchParams.get('categoria') ?? 'todo'
  if (categoriaParam !== 'todo' && !esCategoriaValida(categoriaParam)) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  const admin = createServiceClient()
  const categorias = categoriaParam === 'todo' ? CATEGORIA_KEYS : [categoriaParam]

  const tablas: Record<string, unknown[]> = {}
  for (const cat of categorias) {
    for (const tabla of CATEGORIAS[cat].tablas) {
      if (tabla in tablas) continue
      tablas[tabla] = await fetchTabla(admin, tabla, storeId)
    }
  }

  const payload = {
    sistema: 'Kaltor',
    store_id: storeId,
    categoria: categoriaParam,
    generado_at: new Date().toISOString(),
    tablas,
  }

  const fecha = new Date().toISOString().slice(0, 10)
  const filename = `respaldo_${categoriaParam}_${fecha}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
