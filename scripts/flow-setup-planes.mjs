// Crea (una sola vez) los 7 planes de Kaltor en Flow.cl, usando el precio_mensual
// (CLP sin IVA) ya cargado en la tabla `plans`, cobrando el monto CON IVA (19%)
// que es lo que realmente se le cobra al cliente en su tarjeta.
//
// Los planId son fijos (no se generan) porque ya están hardcodeados en
// src/app/api/flow/subscribe/route.ts (FLOW_PLAN_IDS). Si un plan ya existe en
// Flow, el script lo detecta y lo salta (idempotente, se puede correr de nuevo).
//
// Requisitos previos:
//   - FLOW_API_KEY / FLOW_SECRET_KEY / FLOW_ENVIRONMENT en .env.local
//
// Uso:
//   node --env-file=.env.local scripts/flow-setup-planes.mjs

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiKey = process.env.FLOW_API_KEY
const secretKey = process.env.FLOW_SECRET_KEY
const environment = process.env.FLOW_ENVIRONMENT ?? 'sandbox'

if (!url || !serviceKey) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
if (!apiKey || !secretKey) throw new Error('Faltan FLOW_API_KEY o FLOW_SECRET_KEY (revisa .env.local)')

const BASE_URL = environment === 'production' ? 'https://www.flow.cl/api' : 'https://sandbox.flow.cl/api'

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

// slug de Kaltor -> planId fijo usado en src/app/api/flow/subscribe/route.ts
const PLAN_ID_POR_SLUG = {
  'basico':              'kaltor_basico',
  'pro':                 'kaltor_pro',
  'taller-basico':       'kaltor_taller_basico',
  'taller-basico-5u':    'kaltor_taller_basico_5u',
  'taller-multiusuario': 'kaltor_taller_multiusuario',
  'taller-pro':          'kaltor_taller_pro',
  'taller-multi-tienda': 'kaltor_taller_multi',
}

function sign(params) {
  const str = Object.keys(params).sort().map(k => k + params[k]).join('')
  return crypto.createHmac('sha256', secretKey).update(str).digest('hex')
}

async function post(endpoint, data) {
  const params = { ...data, apiKey }
  params.s = sign(params)
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  const json = await res.json()
  return { ok: res.ok && !json.code, status: res.status, json }
}

async function get(endpoint, data) {
  const params = { ...data, apiKey }
  params.s = sign(params)
  const res = await fetch(`${BASE_URL}${endpoint}?${new URLSearchParams(params).toString()}`, { cache: 'no-store' })
  const json = await res.json()
  return { ok: res.ok && !json.code, status: res.status, json }
}

async function main() {
  console.log(`Entorno Flow: ${environment} (${BASE_URL})\n`)

  const { data: plans, error } = await admin
    .from('plans')
    .select('nombre, slug, precio_mensual')
    .order('precio_mensual', { ascending: true })
  if (error) throw error

  for (const plan of plans) {
    const planId = PLAN_ID_POR_SLUG[plan.slug]
    if (!planId) { console.warn(`  ! Slug "${plan.slug}" sin mapeo de planId, se omite`); continue }

    const montoConIva = Math.round(plan.precio_mensual * 1.19)

    const existente = await get('/plan/get', { planId })
    if (existente.ok) {
      console.log(`  ${plan.nombre}: ya existe en Flow (${planId}), se omite`)
      continue
    }

    const creado = await post('/plan/create', {
      planId,
      name: `Kaltor - ${plan.nombre}`,
      amount: String(montoConIva),
      currency: 'CLP',
      interval: '1',
      intervalo: 'mes',
      trial_period_days: '0',
    })

    if (!creado.ok) {
      console.error(`  ✗ ${plan.nombre}: error creando plan ${planId}: ${creado.json.message ?? creado.status}`)
      continue
    }
    console.log(`  ✓ ${plan.nombre} ($${montoConIva} CLP con IVA/mes) -> ${planId}`)
  }

  console.log('\nListo. Los planId ya están hardcodeados en src/app/api/flow/subscribe/route.ts, no hace falta pegar nada en .env.local.')
}

main().catch(err => {
  console.error('Error:', err.message ?? err)
  process.exit(1)
})
