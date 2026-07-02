import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/flow/client'

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

      await admin.from('stores')
        .update({
          billing_status:    'active',
          ultimo_pago_at:    hoy.toISOString(),
          proximo_cobro_at:  proximo.toISOString(),
        })
        .eq('flow_subscription_id', subscriptionId)

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
