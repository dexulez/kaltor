import { NextResponse } from 'next/server'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

// Mapeo slug de Kaltor → planId en PayPal
// Los planes se crean una sola vez con scripts/paypal-setup-planes.mjs
const PAYPAL_PLAN_IDS: Record<string, string> = {
  'basico':              process.env.PAYPAL_PLAN_BASICO ?? '',
  'pro':                 process.env.PAYPAL_PLAN_PRO ?? '',
  'taller-basico':       process.env.PAYPAL_PLAN_TALLER_BASICO ?? '',
  'taller-basico-5u':    process.env.PAYPAL_PLAN_TALLER_BASICO_5U ?? '',
  'taller-multiusuario': process.env.PAYPAL_PLAN_TALLER_MULTIUSUARIO ?? '',
  'taller-pro':          process.env.PAYPAL_PLAN_TALLER_PRO ?? '',
  'taller-multi-tienda': process.env.PAYPAL_PLAN_TALLER_MULTI ?? '',
}

export async function GET() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createServiceClient()

  const { data: profile } = await admin
    .from('user_profiles')
    .select('store_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const { data: store } = await admin
    .from('stores')
    .select('plans(slug, precio_mensual_usd, paypal_plan_id)')
    .eq('id', profile.store_id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planSlug = (store?.plans as any)?.slug as string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paypalPlanId = (store?.plans as any)?.paypal_plan_id as string | null | undefined
  const planId = paypalPlanId || (planSlug ? PAYPAL_PLAN_IDS[planSlug] : undefined)

  if (!planId) {
    return NextResponse.json({ error: `Plan '${planSlug}' no configurado en PayPal` }, { status: 400 })
  }

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'PayPal no está configurado (falta client id)' }, { status: 500 })
  }

  return NextResponse.json({ clientId, planId })
}
