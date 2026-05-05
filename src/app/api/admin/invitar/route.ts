import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('roles(nombre)').eq('id', user.id).single()
  const rol = Array.isArray(profile?.roles) ? profile.roles[0]?.nombre : undefined
  if (rol !== 'administrador') return NextResponse.json({ error: 'Solo los administradores pueden invitar usuarios' }, { status: 403 })

  const { email, nombre, rol_id } = await req.json()
  if (!email || !nombre) return NextResponse.json({ error: 'Email y nombre son requeridos' }, { status: 400 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (data.user) {
    await admin.from('user_profiles').update({
      nombre_completo: nombre.trim(),
      ...(rol_id ? { rol_id } : {}),
    }).eq('id', data.user.id)
  }

  return NextResponse.json({ ok: true })
}
