import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { tieneSubPermiso } from '@/lib/modulos'

type ProfileResult = {
  store_id?: string | null
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
  permisos_modulos?: Record<string, boolean> | null
}

function getRoleName(profile: ProfileResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

type VentaManual = {
  monto: number
  metodo_pago: string
  tipo_documento: string
  customer_id?: string | null
}

type Body = {
  modo: 'apertura_retroactiva' | 'edicion_cierre'
  sesionId?: string
  fecha?: string
  motivo: string
  pin?: string
  efectivo_apertura?: number
  efectivo_cierre?: number
  transbank_cierre?: number
  transferencia_cierre?: number
  otros_cierre?: number
  venta?: VentaManual | null
}

const METODOS_VALIDOS = ['efectivo', 'transferencia', 'debito', 'credito']

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

  const motivo = (body.motivo ?? '').trim()
  if (motivo.length < 10) {
    return NextResponse.json({ error: 'La nota de justificación debe tener al menos 10 caracteres' }, { status: 400 })
  }
  if (body.modo !== 'apertura_retroactiva' && body.modo !== 'edicion_cierre') {
    return NextResponse.json({ error: 'Modo inválido' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('store_id, permisos_modulos, roles(nombre)')
    .eq('id', user.id)
    .single()

  const storeId = (profile as ProfileResult | null)?.store_id ?? null
  if (!storeId) return NextResponse.json({ error: 'Usuario sin tienda asociada' }, { status: 400 })

  const rolNombre = getRoleName(profile as ProfileResult | null) ?? ''
  const permisos = (profile as ProfileResult | null)?.permisos_modulos ?? null

  const admin = createServiceClient()

  if (!tieneSubPermiso('caja.corregir_caja', rolNombre, permisos)) {
    const { data: sysConfig } = await admin
      .from('system_config')
      .select('pin_autorizacion')
      .eq('store_id', storeId)
      .maybeSingle()
    const pinAdmin = (sysConfig as { pin_autorizacion?: string | null } | null)?.pin_autorizacion ?? null
    if (!pinAdmin || !body.pin || body.pin.trim() !== pinAdmin.trim()) {
      return NextResponse.json({ error: 'Se requiere autorización de un administrador (PIN incorrecto o no configurado)' }, { status: 403 })
    }
  }

  if (body.venta) {
    if (!METODOS_VALIDOS.includes(body.venta.metodo_pago)) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 })
    }
    if (!(body.venta.monto > 0)) {
      return NextResponse.json({ error: 'El monto de la venta manual debe ser mayor a 0' }, { status: 400 })
    }
  }

  let sesion: {
    id: string; fecha: string; estado: string
    efectivo_apertura: number; efectivo_cierre: number | null
    transbank_cierre: number | null; transferencia_cierre: number | null; otros_cierre: number | null
    diferencia_efectivo: number | null; observaciones_cierre: string | null
  } | null = null
  let valoresAnteriores: Record<string, unknown> | null = null

  if (body.modo === 'apertura_retroactiva') {
    const fecha = body.fecha
    const TZ = 'America/Santiago'
    const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
    if (!fecha || fecha >= hoy) {
      return NextResponse.json({ error: 'Debes indicar una fecha anterior a hoy' }, { status: 400 })
    }
    const { data: existente } = await admin
      .from('sesiones_caja')
      .select('id')
      .eq('store_id', storeId)
      .eq('fecha', fecha)
      .maybeSingle()
    if (existente) {
      return NextResponse.json({ error: 'Ya existe una caja registrada para esa fecha' }, { status: 400 })
    }

    const efectivoApertura = body.efectivo_apertura ?? 0
    const efectivoCierre = body.efectivo_cierre ?? 0
    const { data: nueva, error } = await admin.from('sesiones_caja').insert({
      store_id: storeId,
      fecha,
      estado: 'cerrada',
      efectivo_apertura: efectivoApertura,
      apertura_at: `${fecha}T09:00:00`,
      efectivo_cierre: efectivoCierre,
      transbank_cierre: body.transbank_cierre ?? 0,
      transferencia_cierre: body.transferencia_cierre ?? 0,
      otros_cierre: body.otros_cierre ?? 0,
      diferencia_efectivo: efectivoCierre - efectivoApertura,
      observaciones_cierre: motivo,
      cierre_at: `${fecha}T23:59:00`,
      usuario_id: user.id,
      usuario_cierre_id: user.id,
    }).select().single()

    if (error || !nueva) {
      return NextResponse.json({ error: 'Error al crear la caja: ' + (error?.message ?? '') }, { status: 500 })
    }
    sesion = nueva
  } else {
    if (!body.sesionId) return NextResponse.json({ error: 'Falta el id de la sesión a corregir' }, { status: 400 })
    const { data: existente } = await admin
      .from('sesiones_caja')
      .select('*')
      .eq('id', body.sesionId)
      .eq('store_id', storeId)
      .single()
    if (!existente) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    if (existente.estado !== 'cerrada') {
      return NextResponse.json({ error: 'Solo se pueden corregir cajas ya cerradas' }, { status: 400 })
    }

    valoresAnteriores = {
      efectivo_cierre: existente.efectivo_cierre,
      transbank_cierre: existente.transbank_cierre,
      transferencia_cierre: existente.transferencia_cierre,
      otros_cierre: existente.otros_cierre,
      diferencia_efectivo: existente.diferencia_efectivo,
      observaciones_cierre: existente.observaciones_cierre,
    }

    const efectivoCierre = body.efectivo_cierre ?? existente.efectivo_cierre ?? 0
    const { data: actualizada, error } = await admin.from('sesiones_caja').update({
      efectivo_cierre: efectivoCierre,
      transbank_cierre: body.transbank_cierre ?? existente.transbank_cierre,
      transferencia_cierre: body.transferencia_cierre ?? existente.transferencia_cierre,
      otros_cierre: body.otros_cierre ?? existente.otros_cierre,
      diferencia_efectivo: efectivoCierre - existente.efectivo_apertura,
      observaciones_cierre: `${existente.observaciones_cierre ? existente.observaciones_cierre + ' — ' : ''}Corregido: ${motivo}`,
    }).eq('id', body.sesionId).select().single()

    if (error || !actualizada) {
      return NextResponse.json({ error: 'Error al corregir la caja: ' + (error?.message ?? '') }, { status: 500 })
    }
    sesion = actualizada
  }

  let ventaId: string | null = null
  if (body.venta && sesion) {
    const horaVenta = body.modo === 'apertura_retroactiva' ? `${sesion.fecha}T12:00:00` : new Date(`${sesion.fecha}T12:00:00`).toISOString()
    const { data: ventaCreada, error: ventaError } = await admin.from('sales').insert({
      store_id: storeId,
      tipo: 'directa',
      customer_id: body.venta.customer_id ?? null,
      subtotal: body.venta.monto,
      iva: 0,
      ppm: 0,
      total: body.venta.monto,
      metodo_pago: body.venta.metodo_pago,
      tipo_documento: body.venta.tipo_documento,
      usuario_id: user.id,
      notas: `Venta manual — corrección de caja (${sesion.fecha}). Motivo: ${motivo}`,
      created_at: horaVenta,
    }).select().single()

    if (ventaError || !ventaCreada) {
      return NextResponse.json({ error: 'La caja se guardó pero la venta manual falló: ' + (ventaError?.message ?? '') }, { status: 500 })
    }
    ventaId = ventaCreada.id
    await admin.from('sale_items').insert({
      sale_id: ventaId,
      store_id: storeId,
      nombre: 'Venta manual (corrección de caja)',
      cantidad: 1,
      precio_unitario: body.venta.monto,
      subtotal: body.venta.monto,
    })
  }

  await admin.from('correcciones_caja').insert({
    store_id: storeId,
    sesion_id: sesion!.id,
    tipo: body.modo,
    motivo,
    valores_anteriores: valoresAnteriores,
    valores_nuevos: {
      efectivo_apertura: sesion!.efectivo_apertura,
      efectivo_cierre: sesion!.efectivo_cierre,
      transbank_cierre: sesion!.transbank_cierre,
      transferencia_cierre: sesion!.transferencia_cierre,
      otros_cierre: sesion!.otros_cierre,
    },
    venta_id: ventaId,
    usuario_id: user.id,
  })

  return NextResponse.json({ ok: true, sesionId: sesion!.id, ventaId })
}
