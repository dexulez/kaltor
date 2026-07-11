// Crea (una sola vez) el Producto y los 7 Billing Plans de Kaltor en PayPal,
// usando el precio_mensual_usd ya cargado en la tabla `plans`. Imprime al final
// las variables PAYPAL_PLAN_* listas para pegar en .env.local y en Vercel.
//
// Requisitos previos:
//   - PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENVIRONMENT en .env.local
//   - supabase/add_precio_usd_planes.sql ya ejecutado (columna precio_mensual_usd)
//
// Uso:
//   node --env-file=.env.local scripts/paypal-setup-planes.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const clientId = process.env.PAYPAL_CLIENT_ID
const secret = process.env.PAYPAL_CLIENT_SECRET
const environment = process.env.PAYPAL_ENVIRONMENT ?? 'sandbox'

if (!url || !serviceKey) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
if (!clientId || !secret) throw new Error('Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET (revisa .env.local)')

const BASE_URL = environment === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

// slug de Kaltor -> nombre de variable de entorno
const ENV_VAR_POR_SLUG = {
  'basico':              'PAYPAL_PLAN_BASICO',
  'pro':                 'PAYPAL_PLAN_PRO',
  'taller-basico':       'PAYPAL_PLAN_TALLER_BASICO',
  'taller-basico-5u':    'PAYPAL_PLAN_TALLER_BASICO_5U',
  'taller-multiusuario': 'PAYPAL_PLAN_TALLER_MULTIUSUARIO',
  'taller-pro':          'PAYPAL_PLAN_TALLER_PRO',
  'taller-multi-tienda': 'PAYPAL_PLAN_TALLER_MULTI',
}

async function getAccessToken() {
  const basic = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`oauth2/token: ${json.error_description ?? res.status}`)
  return json.access_token
}

async function post(token, endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`${endpoint}: ${json.message ?? res.status} ${JSON.stringify(json.details ?? '')}`)
  return json
}

async function main() {
  console.log(`Entorno PayPal: ${environment} (${BASE_URL})\n`)
  const token = await getAccessToken()

  console.log('Creando producto "Kaltor SaaS"...')
  const product = await post(token, '/v1/catalogs/products', {
    name: 'Kaltor SaaS',
    description: 'Suscripción mensual a la plataforma Kaltor',
    type: 'SERVICE',
    category: 'SOFTWARE',
  })
  console.log(`  Producto creado: ${product.id}\n`)

  const { data: plans, error } = await admin
    .from('plans')
    .select('nombre, slug, precio_mensual_usd')
    .order('precio_mensual_usd', { ascending: true })
  if (error) throw error

  const resultado = {}

  for (const plan of plans) {
    const envVar = ENV_VAR_POR_SLUG[plan.slug]
    if (!envVar) { console.warn(`  ! Slug "${plan.slug}" sin mapeo de variable de entorno, se omite`); continue }

    const billingPlan = await post(token, '/v1/billing/plans', {
      product_id: product.id,
      name: `Kaltor - ${plan.nombre}`,
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: Number(plan.precio_mensual_usd).toFixed(2), currency_code: 'USD' } },
      }],
      payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 2 },
    })

    resultado[envVar] = billingPlan.id
    console.log(`  ${plan.nombre} (US$${plan.precio_mensual_usd}/mes) -> ${billingPlan.id}`)
  }

  console.log('\nPega estas líneas en .env.local y en Vercel → Environment Variables:\n')
  for (const [k, v] of Object.entries(resultado)) console.log(`${k}=${v}`)
}

main().catch(err => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
