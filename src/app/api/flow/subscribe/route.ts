import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAuthClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createCustomer, customerRegisterUrl, createSubscription } from '@/lib/flow/client'

// Mapeo slug de Kaltor → planId en Flow
// Los planes deben crearse manualmente en el dashboard de Flow o con /api/flow/setup-plans
const FLOW_PLAN_IDS: Record<string, string> = {
  'basico':              'kaltor_basico',
  'pro':                 'kaltor_pro',
  'taller-basico':       'kaltor_taller_basico',
  'taller-basico-5u':    'kaltor_taller_basico_5u',
  'taller-multiusuario': 'kaltor_taller_multiusuario',
  'taller-pro':          'kaltor_taller_pro',
  'taller-multi-tienda': 'kaltor_taller_multi',
}

export async function POST(req: NextRequest) {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createServiceClient()

  // Obtener perfil + tienda
  const { data: profile } = await admin
    .from('user_profiles')
    .select('store_id, nombre_completo, email, roles(nombre)')
    .eq('id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!profile || (profile.roles as any)?.nombre !== 'administrador') {
    return NextResponse.json({ error: 'Solo el administrador puede gestionar la suscripción' }, { status: 403 })
  }

  const { data: store } = await admin
    .from('stores')
    .select('id, nombre, email, plan_id, flow_customer_id, flow_subscription_id, billing_status, plans(slug)')
    .eq('id', profile.store_id)
    .single()

  if (!store) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planSlug = (store.plans as any)?.slug as string
  const flowPlanId = FLOW_PLAN_IDS[planSlug]

  if (!flowPlanId) {
    return NextResponse.json({ error: `Plan '${planSlug}' no configurado en Flow` }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.kaltorpos.com'

  try {
    // 1. Crear o reusar cliente en Flow
    let flowCustomerId = store.flow_customer_id as string | null

    if (!flowCustomerId) {
      const customer = await createCustomer({
        name:       (store.nombre as string),
        email:      (store.email as string),
        externalId: store.id as string,
      })
      flowCustomerId = customer.customerId

      await admin.from('stores').update({ flow_customer_id: flowCustomerId }).eq('id', store.id)
    }

    // 2. ¿Ya tiene suscripción activa?
    if (store.flow_subscription_id && store.billing_status === 'active') {
      return NextResponse.json({ error: 'La tienda ya tiene una suscripción activa' }, { status: 409 })
    }

    // 3. Crear suscripción en Flow
    const subscription = await createSubscription({
      planId:     flowPlanId,
      customerId: flowCustomerId,
    })

    await admin.from('stores').update({
      flow_subscription_id: subscription.subscriptionId,
      billing_status:       'pending',
    }).eq('id', store.id)

    // 4. Si Flow devuelve URL (primera vez sin tarjeta registrada), redirigir ahí
    if (subscription.url) {
      return NextResponse.json({ redirect_url: subscription.url })
    }

    // 5. Si no hay URL, el cliente ya tiene tarjeta registrada → flujo directo
    // Registrar tarjeta si es necesario
    const regResp = await customerRegisterUrl({
      customerId: flowCustomerId,
      url_return: `${appUrl}/configuracion/facturacion?flow_result=success`,
    })

    return NextResponse.json({ redirect_url: regResp.url })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al conectar con Flow'
    console.error('[flow/subscribe]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
