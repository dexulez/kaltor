import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/flow/client'
import { procesarPago } from '@/lib/vendedores/procesarPago'

// Flow envía webhooks como POST con form-urlencoded
export async function POST(req: NextRequest) {
  const text = await req.text()
  const params = Object.fromEntries(new URLSearchParams(text))

  // Verificar firma
  if (!verifyWebhookSignature(params)) {
    console.error('[flow/webhook] firma inválida', params)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const event          = params.event ?? ''
  const subscriptionId = params.resourceId ?? params.subscriptionId ?? ''
  const status         = Number(params.status ?? 0)

  console.log('[flow/webhook]', event, subscriptionId, status)

  const admin = createServiceClient()

  // Registrar evento en audit
  await admin.from('flow_events').insert({
    event,
    subscription_id: subscriptionId,
    status,
    raw_payload: params,
  }).then(({ error }) => {
    if (error) console.error('[flow/webhook] error guardando evento:', error.message)
  })

  // ── subscription_payment (pago de cuota mensual) ──────────────────────────
  if (event === 'subscription_payment') {
    if (status === 2) {
      // Pago exitoso → activar tienda hasta el próximo mes
      const hoy = new Date()
      const proximo = new Date(hoy)
      proximo.setMonth(proximo.getMonth() + 1)

      const { data: storeActualizada } = await admin.from('stores')
        .update({
          billing_status:    'active',
          ultimo_pago_at:    hoy.toISOString(),
          proximo_cobro_at:  proximo.toISOString(),
        })
        .eq('flow_subscription_id', subscriptionId)
        .select('id')
        .maybeSingle()

      if (storeActualizada) {
        const montoParam = Number(params.amount)
        const proveedorRef = params.flowOrder || subscriptionId
        await procesarPago(admin, {
          storeId: storeActualizada.id,
          proveedor: 'flow',
          proveedorRef,
          montoOverride: Number.isFinite(montoParam) && montoParam > 0 ? montoParam : undefined,
        }).catch(err => console.error('[flow/webhook] error procesando pago:', err instanceof Error ? err.message : err))
      }

    } else if (status === 3) {
      // Pago rechazado
      await admin.from('stores')
        .update({ billing_status: 'past_due' })
        .eq('flow_subscription_id', subscriptionId)
    }
  }

  // ── subscription_cancellation ─────────────────────────────────────────────
  if (event === 'subscription_cancellation') {
    await admin.from('stores')
      .update({ billing_status: 'cancelled' })
      .eq('flow_subscription_id', subscriptionId)
  }

  // ── subscription_failed (sin tarjeta / expirada) ──────────────────────────
  if (event === 'subscription_failed') {
    await admin.from('stores')
      .update({ billing_status: 'past_due' })
      .eq('flow_subscription_id', subscriptionId)
  }

  return NextResponse.json({ ok: true })
}
