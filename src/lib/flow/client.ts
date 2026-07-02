import crypto from 'crypto'
import type {
  FlowCustomer,
  FlowCustomerRegisterResponse,
  FlowCreateSubscriptionResponse,
  FlowSubscription,
  FlowPlan,
} from './types'

const BASE_URL =
  process.env.FLOW_ENVIRONMENT === 'production'
    ? 'https://www.flow.cl/api'
    : 'https://sandbox.flow.cl/api'

// ── Firma HMAC-SHA256 ─────────────────────────────────────────────────────────
function sign(params: Record<string, string>): string {
  const secret = process.env.FLOW_SECRET_KEY!
  const str = Object.keys(params)
    .sort()
    .map(k => k + params[k])
    .join('')
  return crypto.createHmac('sha256', secret).update(str).digest('hex')
}

// ── POST a Flow API ───────────────────────────────────────────────────────────
async function post<T>(endpoint: string, data: Record<string, string>): Promise<T> {
  const params: Record<string, string> = { ...data, apiKey: process.env.FLOW_API_KEY! }
  params.s = sign(params)

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })

  const json = await res.json()
  if (!res.ok || json.code) {
    throw new Error(`Flow ${endpoint} error ${json.code ?? res.status}: ${json.message ?? 'Error desconocido'}`)
  }
  return json as T
}

// ── GET a Flow API ────────────────────────────────────────────────────────────
async function get<T>(endpoint: string, data: Record<string, string>): Promise<T> {
  const params: Record<string, string> = { ...data, apiKey: process.env.FLOW_API_KEY! }
  params.s = sign(params)

  const url = `${BASE_URL}${endpoint}?${new URLSearchParams(params).toString()}`
  const res = await fetch(url, { cache: 'no-store' })

  const json = await res.json()
  if (!res.ok || json.code) {
    throw new Error(`Flow ${endpoint} error ${json.code ?? res.status}: ${json.message ?? 'Error desconocido'}`)
  }
  return json as T
}

// ─────────────────────────────────────────────────────────────────────────────
// Planes
// ─────────────────────────────────────────────────────────────────────────────

export async function createPlan(params: {
  planId: string
  name: string
  amount: number
  currency?: string
  interval?: number
  intervalo?: string
  trialPeriodDays?: number
}): Promise<FlowPlan> {
  return post<FlowPlan>('/plan/create', {
    planId:          params.planId,
    name:            params.name,
    amount:          String(params.amount),
    currency:        params.currency ?? 'CLP',
    interval:        String(params.interval ?? 1),
    intervalo:       params.intervalo ?? 'mes',
    trial_period_days: String(params.trialPeriodDays ?? 0),
  })
}

export async function getPlan(planId: string): Promise<FlowPlan> {
  return get<FlowPlan>('/plan/get', { planId })
}

// ─────────────────────────────────────────────────────────────────────────────
// Clientes
// ─────────────────────────────────────────────────────────────────────────────

export async function createCustomer(params: {
  name: string
  email: string
  externalId: string
}): Promise<FlowCustomer> {
  return post<FlowCustomer>('/customer/create', {
    name:       params.name,
    email:      params.email,
    externalId: params.externalId,
  })
}

export async function getCustomer(customerId: string): Promise<FlowCustomer> {
  return get<FlowCustomer>('/customer/get', { customerId })
}

// URL de Flow para que el cliente registre su tarjeta
export async function customerRegisterUrl(params: {
  customerId: string
  url_return: string   // URL de vuelta después de registrar tarjeta
}): Promise<FlowCustomerRegisterResponse> {
  return post<FlowCustomerRegisterResponse>('/customer/register', {
    customerId: params.customerId,
    url_return: params.url_return,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Suscripciones
// ─────────────────────────────────────────────────────────────────────────────

export async function createSubscription(params: {
  planId: string
  customerId: string
  couponId?: string
  trialPeriodDays?: number
}): Promise<FlowCreateSubscriptionResponse> {
  const data: Record<string, string> = {
    planId:     params.planId,
    customerId: params.customerId,
  }
  if (params.couponId)        data.couponId        = params.couponId
  if (params.trialPeriodDays) data.trial_period_days = String(params.trialPeriodDays)

  return post<FlowCreateSubscriptionResponse>('/subscription/create', data)
}

export async function getSubscription(subscriptionId: string): Promise<FlowSubscription> {
  return get<FlowSubscription>('/subscription/get', { subscriptionId })
}

export async function cancelSubscription(subscriptionId: string): Promise<{ subscriptionId: string; status: number }> {
  return post('/subscription/cancel', { subscriptionId })
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificar webhook (la firma de Flow viene en el parámetro 's')
// ─────────────────────────────────────────────────────────────────────────────
export function verifyWebhookSignature(params: Record<string, string>): boolean {
  const { s, ...rest } = params
  if (!s) return false
  const expected = sign(rest)
  return crypto.timingSafeEqual(Buffer.from(s, 'hex'), Buffer.from(expected, 'hex'))
}
