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

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('roles(nombre), store_id').eq('id', user.id).single()
  const rol = getRoleName(profile as ProfileRoleResult | null)
  if (rol !== 'administrador') return NextResponse.json({ error: 'Solo los administradores pueden invitar usuarios' }, { status: 403 })
  const storeId = (profile as { store_id?: string | null } | null)?.store_id ?? null

  const { email, nombre, rol_id, telefono, vincular_cliente } = await req.json()
  if (!email || !nombre) return NextResponse.json({ error: 'Email y nombre son requeridos' }, { status: 400 })
  if (vincular_cliente && !telefono) return NextResponse.json({ error: 'El teléfono es requerido para compradores externos' }, { status: 400 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/crear-password`,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (data.user) {
    await admin.from('user_profiles').update({
      nombre_completo: nombre.trim(),
      ...(telefono ? { telefono: telefono.trim() } : {}),
      ...(rol_id ? { rol_id } : {}),
      ...(storeId ? { store_id: storeId } : {}),
    }).eq('id', data.user.id)

    // Vincula al usuario invitado con la misma empresa del administrador que invita
    if (storeId) {
      await admin.from('store_users').upsert({
        user_id: data.user.id,
        store_id: storeId,
        ...(rol_id ? { rol_id } : {}),
      }, { onConflict: 'user_id,store_id' })
    }

    // Compradores externos: vincular (o crear) una ficha de cliente, para que
    // sus compras también aparezcan en Clientes/Informes.
    if (vincular_cliente) {
      const { data: cliente, error: clienteErr } = await admin.from('customers').insert({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email,
      }).select('id').single()

      if (!clienteErr && cliente) {
        await admin.from('user_profiles').update({ customer_id: cliente.id }).eq('id', data.user.id)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
