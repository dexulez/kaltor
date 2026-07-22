import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { CATEGORIAS, esCategoriaValida, fraseConfirmacion } from '@/lib/respaldo/categorias'

type ProfileResult = {
  store_id?: string | null
  nombre_completo?: string | null
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

function getRoleName(profile: ProfileResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

type Body = {
  categoria?: string
  motivo?: string
  confirmacionTexto?: string
  pin?: string
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('store_id, nombre_completo, roles(nombre)')
    .eq('id', user.id)
    .single()

  const storeId = (profile as ProfileResult | null)?.store_id ?? null
  if (!storeId) return NextResponse.json({ error: 'Usuario sin tienda asociada' }, { status: 400 })

  const rolNombre = getRoleName(profile as ProfileResult | null) ?? ''
  if (rolNombre !== 'administrador') {
    return NextResponse.json({ error: 'Solo un administrador puede borrar datos del sistema' }, { status: 403 })
  }

  const categoria = body.categoria ?? ''
  if (!esCategoriaValida(categoria)) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  const motivo = (body.motivo ?? '').trim()
  if (motivo.length < 10) {
    return NextResponse.json({ error: 'El motivo debe tener al menos 10 caracteres' }, { status: 400 })
  }

  const fraseEsperada = fraseConfirmacion(categoria)
  if ((body.confirmacionTexto ?? '').trim().toUpperCase() !== fraseEsperada) {
    return NextResponse.json({ error: `Debes escribir exactamente "${fraseEsperada}" para confirmar` }, { status: 400 })
  }

  const admin = createServiceClient()

  // El PIN de autorización siempre es obligatorio para esta acción, incluso para
  // administradores — es la operación más destructiva del sistema.
  const { data: sysConfig } = await admin
    .from('system_config')
    .select('pin_autorizacion')
    .eq('store_id', storeId)
    .maybeSingle()
  const pinAdmin = (sysConfig as { pin_autorizacion?: string | null } | null)?.pin_autorizacion ?? null
  if (!pinAdmin || !body.pin || body.pin.trim() !== pinAdmin.trim()) {
    return NextResponse.json({ error: 'PIN de autorización incorrecto o no configurado' }, { status: 403 })
  }

  const { data: conteos } = await admin.rpc('fn_contar_categoria', { p_categoria: categoria, p_store_id: storeId })

  const { error: errorBorrado } = await admin.rpc('fn_borrar_categoria', { p_categoria: categoria, p_store_id: storeId })
  if (errorBorrado) {
    return NextResponse.json({
      error: 'No se pudo borrar la categoría (probablemente porque otra categoría todavía tiene datos que la referencian): ' + errorBorrado.message,
    }, { status: 409 })
  }

  await admin.from('audit_logs').insert({
    store_id: storeId,
    usuario_id: user.id,
    usuario_nombre: (profile as ProfileResult | null)?.nombre_completo ?? '',
    modulo: 'configuracion',
    accion: 'limpieza_categoria',
    entidad_desc: `Categoría "${CATEGORIAS[categoria].label}" borrada. Motivo: ${motivo}`,
    metadata: { categoria, motivo, conteos },
  })

  return NextResponse.json({ ok: true, conteos })
}
