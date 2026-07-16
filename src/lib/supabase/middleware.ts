import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { moduloRequeridoPara } from '@/lib/modulos'
import { detectarTipoDispositivo } from '@/lib/deviceType'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/registro') ||
    request.nextUrl.pathname.startsWith('/recuperar') ||
    request.nextUrl.pathname.startsWith('/auth')
  // Siempre accesible: no requiere sesión previa ni redirige si ya tiene sesión
  const isOpenRoute = request.nextUrl.pathname.startsWith('/crear-password')
  const isPublicRoute = request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/seguimiento') ||
    request.nextUrl.pathname.startsWith('/pedido') ||
    request.nextUrl.pathname.startsWith('/pagar') ||
    request.nextUrl.pathname.startsWith('/acceso-b2b')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')

  if (!user && !isAuthRoute && !isPublicRoute && !isApiRoute && !isOpenRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Límite de 2 dispositivos por usuario (1 móvil/tablet + 1 computador): si esta
  // sesión fue desplazada por un login posterior del mismo tipo de dispositivo,
  // se cierra en su próxima navegación (chequeo perezoso, no en tiempo real).
  if (user && !isAuthRoute && !isPublicRoute && !isApiRoute) {
    try {
      const userAgent = request.headers.get('user-agent')
      const tipoDispositivo = detectarTipoDispositivo(userAgent)
      const cookieToken = request.cookies.get('kaltor_session_token')?.value
      const admin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false }, global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }) } }
      )
      const { data: sesion } = await admin
        .from('user_active_sessions')
        .select('session_token')
        .eq('user_id', user.id)
        .eq('tipo_dispositivo', tipoDispositivo)
        .maybeSingle()

      if (!sesion) {
        // Sesión previa a esta funcionalidad: se adopta silenciosamente, sin expulsar a nadie.
        const token = cookieToken ?? crypto.randomUUID()
        await admin.from('user_active_sessions').upsert(
          { user_id: user.id, tipo_dispositivo: tipoDispositivo, session_token: token, user_agent: userAgent },
          { onConflict: 'user_id,tipo_dispositivo' }
        )
        if (!cookieToken) {
          supabaseResponse.cookies.set('kaltor_session_token', token, {
            httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365, path: '/',
          })
        }
      } else if (!cookieToken || sesion.session_token !== cookieToken) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.search = ''
        url.searchParams.set('motivo', 'sesion_reemplazada')
        return NextResponse.redirect(url)
      }
    } catch {
      // Tabla aún no creada (SQL pendiente) u otro error transitorio: no bloquea el sistema.
    }
  }

  // La pantalla de venta directa (caja) nunca debe expulsar al usuario a /dashboard
  // por una revalidación de fondo (router.refresh() disparado por Realtime o por el
  // propio POS tras cobrar) — solo la navegación explícita a otra ruta puede sacarlo.
  const isPosVentaDirecta = request.nextUrl.pathname === '/caja/venta-directa'

  // Bloquea el acceso directo (por URL) a módulos que no correspondan al plan
  // de la tienda del usuario — no basta con ocultar el ítem del menú.
  if (user && !isAuthRoute && !isPublicRoute && !isApiRoute && !isPosVentaDirecta) {
    const moduloRequerido = moduloRequeridoPara(request.nextUrl.pathname)
    if (moduloRequerido) {
      const admin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false }, global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }) } }
      )
      const { data: profile } = await admin.from('user_profiles').select('store_id').eq('id', user.id).single()
      const storeId = (profile as { store_id?: string } | null)?.store_id
      if (storeId) {
        const { data: storeModules } = await admin
          .from('store_modules')
          .select('module_key')
          .eq('store_id', storeId)
          .eq('activo', true)
        if (storeModules && storeModules.length > 0) {
          const activos = new Set(storeModules.map((m: { module_key: string }) => m.module_key))
          if (!activos.has(moduloRequerido)) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
          }
        }
      }
    }
  }

  return supabaseResponse
}
