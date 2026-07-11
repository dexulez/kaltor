import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cancelSubscription } from '@/lib/paypal/client'

export async function POST(req: NextRequest) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createServiceClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('store_id, roles(nombre)')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!profile || (profile.roles as any)?.nombre !== 'administrador') {
    return NextResponse.json({ error: 'Solo el administrador puede cancelar la suscripción' }, { status: 403 })
  }

  const { data: store } = await admin
    .from('stores')
    .select('id, paypal_subscription_id, billing_status')
    .eq('id', profile.store_id)
    .single()

  if (!store?.paypal_subscription_id) {
    return NextResponse.json({ error: 'No hay suscripción de PayPal activa para cancelar' }, { status: 400 })
  }

  try {
    await cancelSubscription(store.paypal_subscription_id as string, 'Cancelada por el administrador de la tienda')
    await admin.from('stores').update({ billing_status: 'cancelled' }).eq('id', store.id)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al cancelar en PayPal'
    console.error('[paypal/cancel]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
