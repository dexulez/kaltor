import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tieneSubPermiso } from '@/lib/modulos'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Esta acción se expone desde una página pública (sin login) además del panel admin,
  // así que la autorización se valida acá en el servidor, no solo ocultando el botón.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user.id)
    .single()
  const rolesData = perfil?.roles as { nombre?: string } | { nombre?: string }[] | null
  const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
  const permisos = perfil?.permisos_modulos as Record<string, boolean> | null
  if (!tieneSubPermiso('compras.pagar', rolNombre, permisos)) {
    return NextResponse.json({ error: 'Sin permiso para pagar órdenes de compra' }, { status: 403 })
  }

  try {
    const body = await req.json() as { ordenIds?: string[]; metodoPago?: string; nota?: string }
    const ordenIds = body.ordenIds ?? []
    const metodoPago = body.metodoPago || 'transferencia'
    if (ordenIds.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos una orden' }, { status: 400 })
    }

    const { data: ordenes } = await supabase
      .from('purchase_orders')
      .select('id, numero_oc, total, monto_pagado, metodo_pago, supplier_id')
      .in('id', ordenIds)

    if (!ordenes || ordenes.length === 0) {
      return NextResponse.json({ error: 'Órdenes no encontradas' }, { status: 404 })
    }

    const fecha = new Date().toISOString().split('T')[0]
    const notaConjunta = ordenes.length > 1
      ? `Pago consolidado junto a ${ordenes.map(o => o.numero_oc).join(', ')}${body.nota ? ` — ${body.nota}` : ''}`
      : (body.nota || null)

    let totalPagado = 0
    const abonoPorProveedor = new Map<string, number>()

    for (const oc of ordenes) {
      const pendiente = Math.max(0, (oc.total ?? 0) - (oc.monto_pagado ?? 0))
      if (pendiente <= 0) continue

      const { error: errPago } = await supabase.from('purchase_order_payments').insert({
        purchase_order_id: oc.id,
        monto: pendiente,
        metodo_pago: metodoPago,
        fecha,
        nota: notaConjunta,
      })
      if (errPago) throw errPago

      const { error: errOC } = await supabase.from('purchase_orders')
        .update({ monto_pagado: (oc.monto_pagado ?? 0) + pendiente, fecha_pago: new Date().toISOString() })
        .eq('id', oc.id)
      if (errOC) throw errOC

      totalPagado += pendiente
      if (oc.metodo_pago === 'credito' && oc.supplier_id) {
        abonoPorProveedor.set(oc.supplier_id, (abonoPorProveedor.get(oc.supplier_id) ?? 0) + pendiente)
      }
    }

    for (const [supplierId, monto] of abonoPorProveedor) {
      const { data: prov } = await supabase.from('suppliers').select('saldo_deudor').eq('id', supplierId).single()
      const saldoActual = prov?.saldo_deudor ?? 0
      await supabase.from('suppliers').update({ saldo_deudor: Math.max(0, saldoActual - monto) }).eq('id', supplierId)
    }

    return NextResponse.json({ ok: true, totalPagado, ordenesPagadas: ordenes.length })
  } catch (e) {
    console.error('[pago consolidado]', e)
    return NextResponse.json({ error: 'Error al registrar el pago' }, { status: 500 })
  }
}
