import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

type ProfileRoleResult = {
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

function getRoleName(profile: ProfileRoleResult | null) {
  if (Array.isArray(profile?.roles)) return profile.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('roles(nombre)').eq('id', user.id).single()
  const rol = getRoleName(profile as ProfileRoleResult | null)
  if (rol !== 'administrador') return NextResponse.json({ error: 'Solo los administradores pueden eliminar usuarios' }, { status: 403 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  if (userId === user.id) return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // No se borra de verdad: repair_orders/sales/stock_movements/etc. referencian
  // user_profiles sin ON DELETE CASCADE, así que un borrado físico falla apenas
  // el usuario tiene cualquier historial. En vez de eso: se bloquea el login
  // (ban) y se marca como eliminado, dejando intacto todo su rastro.
  const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
  if (banError) return NextResponse.json({ error: banError.message }, { status: 400 })

  const { error: updError } = await admin
    .from('user_profiles')
    .update({ activo: false, eliminado_at: new Date().toISOString() })
    .eq('id', userId)
  if (updError) return NextResponse.json({ error: updError.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
