import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'

type ProfileRoleResult = {
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

function getRoleName(profile: ProfileRoleResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

const ROLES_AUTORIZADOS = ['administrador', 'vendedor', 'supervisor_ventas']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: callerProfile } = await supabase.from('user_profiles').select('roles(nombre)').eq('id', user.id).single()
  const rolLlamador = getRoleName(callerProfile as ProfileRoleResult | null) ?? ''
  if (!ROLES_AUTORIZADOS.includes(rolLlamador)) {
    return NextResponse.json({ error: 'No tienes permiso para esta acción' }, { status: 403 })
  }

  let body: { nota?: string | null }
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const nota = (body.nota ?? '').trim() || null

  const admin = createServiceClient()
  const { error } = await admin.from('sales_orders').update({ notas_internas: nota }).eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo guardar la nota' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
