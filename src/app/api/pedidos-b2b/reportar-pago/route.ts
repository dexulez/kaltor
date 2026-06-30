import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { enviarWAServer } from '@/lib/whatsapp-server'
import { msgPagoB2BReportado } from '@/lib/whatsapp'

type ProfileRoleResult = {
  nombre_completo?: string | null
  roles?: { nombre?: string | null } | { nombre?: string | null }[] | null
}

function getRoleName(profile: ProfileRoleResult | null) {
  if (Array.isArray(profile?.roles)) return profile?.roles[0]?.nombre ?? null
  return profile?.roles?.nombre ?? null
}

const BUCKET = 'comprobantes-pago'
const ESTADOS_PAGABLES = ['confirmado', 'preparando', 'en_camino', 'entregado']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('nombre_completo, roles(nombre)').eq('id', user.id).single()
  if (getRoleName(profile as ProfileRoleResult | null) !== 'comprador_externo') {
    return NextResponse.json({ error: 'Solo compradores externos pueden reportar pagos' }, { status: 403 })
  }

  const formData = await req.formData()

  let pedidoIds: string[]
  try {
    pedidoIds = JSON.parse((formData.get('pedido_ids') as string) ?? '[]')
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }
  if (!Array.isArray(pedidoIds) || pedidoIds.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos un pedido' }, { status: 400 })
  }

  const metodoPago = (formData.get('metodo_pago') as string) || 'transferencia'
  const nota = (formData.get('nota') as string) || null
  const archivos = formData.getAll('archivos') as File[]
  if (!archivos.length) return NextResponse.json({ error: 'Adjunta al menos un comprobante de pago' }, { status: 400 })

  const admin = createServiceClient()
  const { data: pedidos } = await admin.from('sales_orders').select('*').in('id', pedidoIds)
  if (!pedidos || pedidos.length !== pedidoIds.length) {
    return NextResponse.json({ error: 'Uno o más pedidos no fueron encontrados' }, { status: 404 })
  }

  for (const p of pedidos) {
    if (p.comprador_id !== user.id) return NextResponse.json({ error: 'No tienes permiso sobre uno de los pedidos seleccionados' }, { status: 403 })
    if (!ESTADOS_PAGABLES.includes(p.estado)) return NextResponse.json({ error: `El pedido ${p.numero_pedido} no admite pagos en su estado actual` }, { status: 400 })
    if (p.pagado) return NextResponse.json({ error: `El pedido ${p.numero_pedido} ya está pagado` }, { status: 400 })
    if (p.pago_en_revision) return NextResponse.json({ error: `El pedido ${p.numero_pedido} ya tiene un pago en revisión` }, { status: 400 })
  }

  const saldos = pedidos.map(p => (p.total_estimado ?? 0) - (p.monto_pagado ?? 0))
  const sumaSaldos = saldos.reduce((s, v) => s + v, 0)

  const montoRaw = Number(formData.get('monto'))
  const monto = montoRaw > 0 ? Math.min(Math.round(montoRaw), sumaSaldos) : sumaSaldos
  if (!monto || monto <= 0) return NextResponse.json({ error: 'Ingresa un monto válido' }, { status: 400 })

  // Reparte el abono entre los pedidos seleccionados proporcionalmente a su saldo pendiente
  const montosAsignados = pedidos.map((_, i) => Math.round(monto * (saldos[i] / sumaSaldos)))
  const diferencia = monto - montosAsignados.reduce((s, v) => s + v, 0)
  montosAsignados[montosAsignados.length - 1] += diferencia

  const urls: string[] = []
  for (const file of archivos) {
    if (!file.size) continue
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const path = `b2b-pago-${user.id}/${safeName}`
    const bytes = await file.arrayBuffer()
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false })
    if (error) continue
    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)
    urls.push(publicUrl)
  }
  if (urls.length === 0) return NextResponse.json({ error: 'No se pudo subir el comprobante' }, { status: 500 })

  for (let i = 0; i < pedidos.length; i++) {
    const p = pedidos[i]
    const existing = (p.comprobante_pago_urls as string[] | null) ?? []
    const { error: updateErr } = await admin.from('sales_orders').update({
      comprobante_pago_urls: [...existing, ...urls],
      pago_en_revision: true,
      metodo_pago_reportado: metodoPago,
      nota_pago_comprador: nota,
      monto_reportado: montosAsignados[i],
    }).eq('id', p.id)
    if (updateErr) return NextResponse.json({ error: 'Error al registrar el pago: ' + updateErr.message }, { status: 500 })
  }

  const nombreComprador = (profile as ProfileRoleResult | null)?.nombre_completo ?? 'Comprador'

  await admin.from('notifications').insert({
    tipo: 'pago_b2b',
    titulo: `${nombreComprador} reportó un pago`,
    mensaje: `${pedidos.map(p => p.numero_pedido).join(', ')} · Monto: $${monto.toLocaleString('es-CL')}`,
    url: `/pedidos-b2b/${pedidos[0].id}`,
    leida: false,
  })

  const { data: cfg } = await admin.from('system_config').select('whatsapp').single()
  if (cfg?.whatsapp) {
    await enviarWAServer(cfg.whatsapp, msgPagoB2BReportado(nombreComprador, pedidos.map(p => p.numero_pedido), monto))
  }

  return NextResponse.json({ ok: true })
}
