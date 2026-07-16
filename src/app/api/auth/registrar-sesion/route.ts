import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { detectarTipoDispositivo } from '@/lib/deviceType'

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userAgent = request.headers.get('user-agent')
  const tipoDispositivo = detectarTipoDispositivo(userAgent)
  const sessionToken = crypto.randomUUID()

  const admin = createServiceClient()
  const { error } = await admin
    .from('user_active_sessions')
    .upsert(
      { user_id: user.id, tipo_dispositivo: tipoDispositivo, session_token: sessionToken, user_agent: userAgent, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,tipo_dispositivo' }
    )

  // Si la tabla aún no existe (SQL pendiente de ejecutar), no bloquea el login.
  if (error && !error.message.includes('user_active_sessions')) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Métricas internas: registra este acceso (best-effort, no bloquea el login
  // si la tabla `user_login_events` aún no existe).
  const { data: perfil } = await admin.from('user_profiles').select('store_id').eq('id', user.id).single()
  const storeId = (perfil as { store_id?: string } | null)?.store_id ?? null
  await admin.from('user_login_events').insert({
    user_id: user.id,
    store_id: storeId,
    tipo_dispositivo: tipoDispositivo,
    user_agent: userAgent,
  })

  if (!error) {
    const cookieStore = await cookies()
    cookieStore.set('kaltor_session_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
  }

  return NextResponse.json({ ok: true })
}
