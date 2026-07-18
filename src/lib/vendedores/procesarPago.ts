import { createServiceClient } from '@/lib/supabase/server'
import { cancelSubscription as cancelFlowSubscription } from '@/lib/flow/client'
import { cancelSubscription as cancelPaypalSubscription } from '@/lib/paypal/client'

type Admin = ReturnType<typeof createServiceClient>

// Comisión en los pagos 1, 2, 6, 7, 12, 13, 18, 19... (medio monto cada uno, 2 veces por ciclo de 6 meses, de por vida)
function correspondeComision(numeroPago: number): boolean {
  if (numeroPago === 1 || numeroPago === 2) return true
  return numeroPago >= 6 && numeroPago % 6 <= 1
}

export async function procesarPago(admin: Admin, params: {
  storeId: string
  proveedor: 'flow' | 'paypal'
  proveedorRef: string
  montoOverride?: number
}): Promise<void> {
  const { storeId, proveedor, proveedorRef, montoOverride } = params

  const { data: store } = await admin
    .from('stores')
    .select('id, plan_id, vendedor_id, descuento_vendedor_expira_en_pago, flow_subscription_id, paypal_subscription_id')
    .eq('id', storeId)
    .single()

  if (!store || !store.plan_id) return

  const { data: plan } = await admin
    .from('plans')
    .select('id, precio_mensual, precio_mensual_usd, comision_vendedor_monto, plan_base_id')
    .eq('id', store.plan_id)
    .single()

  if (!plan) return

  const moneda = proveedor === 'flow' ? 'CLP' : 'USD'
  // La suscripción cobra el precio del plan vigente; se usa como monto salvo que
  // el webhook informe uno explícito (Flow lo incluye en algunos eventos).
  const monto = montoOverride ?? (proveedor === 'flow' ? plan.precio_mensual : plan.precio_mensual_usd)

  const { data: ultimoPago } = await admin
    .from('pagos')
    .select('numero_pago')
    .eq('store_id', storeId)
    .order('numero_pago', { ascending: false })
    .limit(1)
    .maybeSingle()

  const numeroPago = (ultimoPago?.numero_pago ?? 0) + 1

  const { data: pago, error: pagoErr } = await admin
    .from('pagos')
    .insert({
      store_id: storeId,
      plan_id: plan.id,
      monto,
      moneda,
      proveedor,
      proveedor_ref: proveedorRef,
      numero_pago: numeroPago,
    })
    .select('id')
    .single()

  if (pagoErr || !pago) {
    console.error('[procesarPago] error registrando pago:', pagoErr?.message)
    return
  }

  // Comisión del vendedor externo, si corresponde según el ciclo
  if (store.vendedor_id && plan.comision_vendedor_monto && correspondeComision(numeroPago)) {
    const montoComision = Math.round((Number(plan.comision_vendedor_monto) / 2) * 100) / 100
    await admin.from('comisiones_vendedor').insert({
      vendedor_id: store.vendedor_id,
      store_id: storeId,
      pago_id: pago.id,
      monto: montoComision,
    }).then(({ error }) => {
      if (error) console.error('[procesarPago] error registrando comisión:', error.message)
    })
  }

  // Fin del descuento de referido: se cancela la suscripción especial y la tienda
  // vuelve al plan estándar; el dueño ve el flujo normal de "suscribirse" al precio full.
  if (store.descuento_vendedor_expira_en_pago && numeroPago === store.descuento_vendedor_expira_en_pago) {
    try {
      if (proveedor === 'flow' && store.flow_subscription_id) {
        await cancelFlowSubscription(store.flow_subscription_id)
      } else if (proveedor === 'paypal' && store.paypal_subscription_id) {
        await cancelPaypalSubscription(store.paypal_subscription_id, 'Fin del período promocional de referido')
      }
    } catch (err) {
      console.error('[procesarPago] error cancelando suscripción especial:', err instanceof Error ? err.message : err)
    }

    await admin.from('stores').update({
      plan_id: plan.plan_base_id ?? plan.id,
      descuento_vendedor_expira_en_pago: null,
      descuento_vendedor_pct: null,
      descuento_vendedor_monto: null,
      billing_status: 'cancelled',
    }).eq('id', storeId)
  }
}
