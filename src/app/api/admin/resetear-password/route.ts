import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

type ProfileRoleResult = {
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}
function getRoleName(p: ProfileRoleResult | null) {
  if (Array.isArray(p?.roles)) return p.roles[0]?.nombre ?? null
  return p?.roles?.nombre ?? null
}

function generarPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let pwd = 'TR-'
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('roles(nombre)').eq('id', user.id).single()
  if (getRoleName(profile as ProfileRoleResult | null) !== 'administrador')
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const password = generarPassword()
  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ password })
}
