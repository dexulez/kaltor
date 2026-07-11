import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSubscription } from '@/lib/paypal/client'

// El botón de PayPal (JS SDK) crea la suscripción directamente contra PayPal
// y nos entrega el subscriptionID en el cliente (onApprove). Este endpoint
// verifica esa suscripción contra la API de PayPal (nunca confiar en el
// cliente) antes de guardarla.
export async function POST(req: NextRequest) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { subscriptionId } = await req.json()
  if (!subscriptionId) return NextResponse.json({ error: 'Falta subscriptionId' }, { status: 400 })

  const admin = createServiceClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('store_id, roles(nombre)')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!profile || (profile.roles as any)?.nombre !== 'administrador') {
    return NextResponse.json({ error: 'Solo el administrador puede gestionar la suscripción' }, { status: 403 })
  }

  const { data: store } = await admin
    .from('stores')
    .select('id, billing_status')
    .eq('id', profile.store_id)
    .single()

  if (!store) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })

  if (store.billing_status === 'active') {
    return NextResponse.json({ error: 'La tienda ya tiene una suscripción activa' }, { status: 409 })
  }

  try {
    const subscription = await getSubscription(subscriptionId)

    if (subscription.status !== 'ACTIVE' && subscription.status !== 'APPROVAL_PENDING') {
      return NextResponse.json({ error: `Suscripción en estado inesperado: ${subscription.status}` }, { status: 400 })
    }

    await admin.from('stores').update({
      paypal_subscription_id: subscription.id,
      payment_provider:       'paypal',
      billing_status:         subscription.status === 'ACTIVE' ? 'active' : 'pending',
    }).eq('id', store.id)

    return NextResponse.json({ ok: true, status: subscription.status })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al confirmar con PayPal'
    console.error('[paypal/confirm]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
