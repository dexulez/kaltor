import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/paypal/client'
import type { PayPalWebhookEvent } from '@/lib/paypal/types'

// PayPal envía webhooks como POST con JSON
export async function POST(req: NextRequest) {
  const text = await req.text()
  const event = JSON.parse(text) as PayPalWebhookEvent

  const headers = {
    transmissionId: req.headers.get('paypal-transmission-id') ?? '',
    transmissionTime: req.headers.get('paypal-transmission-time') ?? '',
    certUrl: req.headers.get('paypal-cert-url') ?? '',
    authAlgo: req.headers.get('paypal-auth-algo') ?? '',
    transmissionSig: req.headers.get('paypal-transmission-sig') ?? '',
  }

  const valido = await verifyWebhookSignature(headers, event).catch(err => {
    console.error('[paypal/webhook] error verificando firma:', err.message)
    return false
  })

  if (!valido) {
    console.error('[paypal/webhook] firma inválida', event.event_type)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const eventType = event.event_type
  // En eventos de suscripción, el id del recurso ES el subscriptionId.
  // En PAYMENT.SALE.COMPLETED (cobro recurrente), viene en billing_agreement_id.
  const subscriptionId = event.resource?.billing_agreement_id ?? event.resource?.id ?? ''

  console.log('[paypal/webhook]', eventType, subscriptionId)

  const admin = createServiceClient()

  // Registrar evento en audit
  await admin.from('paypal_events').insert({
    event_type: eventType,
    subscription_id: subscriptionId,
    raw_payload: event,
  }).then(({ error }) => {
    if (error) console.error('[paypal/webhook] error guardando evento:', error.message)
  })

  if (!subscriptionId) return NextResponse.json({ ok: true })

  switch (eventType) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'PAYMENT.SALE.COMPLETED': {
      // Pago exitoso → activar tienda hasta el próximo mes
      const hoy = new Date()
      const proximo = new Date(hoy)
      proximo.setMonth(proximo.getMonth() + 1)

      await admin.from('stores')
        .update({
          billing_status:   'active',
          ultimo_pago_at:   hoy.toISOString(),
          proximo_cobro_at: proximo.toISOString(),
        })
        .eq('paypal_subscription_id', subscriptionId)
      break
    }

    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
      await admin.from('stores')
        .update({ billing_status: 'past_due' })
        .eq('paypal_subscription_id', subscriptionId)
      break
    }

    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED': {
      await admin.from('stores')
        .update({ billing_status: 'cancelled' })
        .eq('paypal_subscription_id', subscriptionId)
      break
    }

    case 'BILLING.SUBSCRIPTION.SUSPENDED': {
      await admin.from('stores')
        .update({ billing_status: 'suspended' })
        .eq('paypal_subscription_id', subscriptionId)
      break
    }
  }

  return NextResponse.json({ ok: true })
}
