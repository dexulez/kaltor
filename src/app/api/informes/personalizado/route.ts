import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tieneAccesoModulo, tieneSubPermiso } from '@/lib/modulos'
import { fuentesPermitidas, obtenerFuente, obtenerValorPorRuta } from '@/lib/informes/fuentes'

const LIMITE_FILAS = 2000

async function contextoUsuario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user.id)
    .single()

  const rolesRel = profile?.roles as { nombre?: string } | { nombre?: string }[] | null | undefined
  const rol = (Array.isArray(rolesRel) ? rolesRel[0]?.nombre : rolesRel?.nombre) ?? ''
  const permisos = (profile?.permisos_modulos as Record<string, boolean> | null) ?? null

  return { supabase, user, rol, permisos }
}

export async function GET() {
  const ctx = await contextoUsuario()
  if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!tieneAccesoModulo('informes', ctx.rol, ctx.permisos)) {
    return NextResponse.json({ error: 'Sin acceso al módulo de informes' }, { status: 403 })
  }

  const fuentes = fuentesPermitidas(ctx.rol, ctx.permisos).map(f => ({
    key: f.key,
    label: f.label,
    campos: f.campos,
    filtro: f.filtro ? { label: f.filtro.label, opciones: f.filtro.opciones } : null,
  }))

  return NextResponse.json({ fuentes })
}

interface BodyPersonalizado {
  fuente?: string
  columnas?: string[]
  desde?: string
  hasta?: string
  filtroValor?: string
}

export async function POST(req: NextRequest) {
  const ctx = await contextoUsuario()
  if (!ctx) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!tieneAccesoModulo('informes', ctx.rol, ctx.permisos)) {
    return NextResponse.json({ error: 'Sin acceso al módulo de informes' }, { status: 403 })
  }

  let body: BodyPersonalizado
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const fuente = obtenerFuente(body.fuente ?? '')
  if (!fuente) return NextResponse.json({ error: 'Fuente de datos desconocida' }, { status: 400 })

  if (fuente.permiso && ctx.rol !== 'administrador' && !tieneSubPermiso(fuente.permiso, ctx.rol, ctx.permisos)) {
    return NextResponse.json({ error: 'Sin acceso a esta fuente de datos' }, { status: 403 })
  }

  const clavesValidas = new Set(fuente.campos.map(c => c.key))
  const columnas = (body.columnas ?? []).filter(c => clavesValidas.has(c))
  if (columnas.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos una columna válida' }, { status: 400 })
  }

  let query = ctx.supabase.from(fuente.tabla).select(fuente.select)

  if (fuente.campoFecha && body.desde && body.hasta) {
    const soloDia = fuente.campoFecha === 'fecha'
    const desdeVal = soloDia ? body.desde : `${body.desde}T00:00:00.000Z`
    const hastaVal = soloDia ? body.hasta : `${body.hasta}T23:59:59.999Z`
    query = query.gte(fuente.campoFecha, desdeVal).lte(fuente.campoFecha, hastaVal)
  }

  if (fuente.filtro && body.filtroValor) {
    const opcionValida = fuente.filtro.opciones.some(o => o.value === body.filtroValor)
    if (opcionValida) {
      const valor: string | boolean = body.filtroValor === 'true' ? true : body.filtroValor === 'false' ? false : body.filtroValor
      query = query.eq(fuente.filtro.columna, valor)
    }
  }

  const soloPropios = ctx.rol !== 'administrador' && tieneSubPermiso('informes.solo_propios', ctx.rol, ctx.permisos)
  if (soloPropios && fuente.soloPropiosColumna) {
    query = query.eq(fuente.soloPropiosColumna, ctx.user.id)
  }

  if (fuente.campoFecha) query = query.order(fuente.campoFecha, { ascending: false })
  query = query.limit(LIMITE_FILAS)

  const { data, error } = await query
  if (error) {
    console.error('[informes/personalizado]', error)
    return NextResponse.json({ error: `No se pudo generar el reporte: ${error.message}` }, { status: 500 })
  }

  const camposSeleccionados = fuente.campos.filter(c => columnas.includes(c.key))
  const filas = (data ?? []) as unknown as Record<string, unknown>[]
  const rows = filas.map(fila => {
    const row: Record<string, unknown> = {}
    camposSeleccionados.forEach(c => { row[c.key] = obtenerValorPorRuta(fila, c.key) })
    return row
  })

  return NextResponse.json({
    campos: camposSeleccionados,
    rows,
    truncado: rows.length === LIMITE_FILAS,
  })
}
