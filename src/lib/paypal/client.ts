import type { PayPalProduct, PayPalPlan, PayPalSubscription, PayPalWebhookHeaders } from './types'

const BASE_URL =
  process.env.PAYPAL_ENVIRONMENT === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

// ── Token OAuth2 (client_credentials), cacheado en memoria hasta que expire ──
let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!
  const secret = process.env.PAYPAL_CLIENT_SECRET!
  const basic = Buffer.from(`${clientId}:${secret}`).toString('base64')

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(`PayPal oauth2/token error: ${json.error_description ?? res.status}`)
  }

  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return cachedToken.value
}

async function request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const token = await getAccessToken()

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return {} as T

  const json = await res.json()
  if (!res.ok) {
    const detail = json.details?.map((d: { issue?: string }) => d.issue).join(', ')
    throw new Error(`PayPal ${method} ${endpoint} error: ${json.message ?? res.status}${detail ? ` (${detail})` : ''}`)
  }
  return json as T
}

// ─────────────────────────────────────────────────────────────────────────────
// Productos y planes (setup único, ver scripts/paypal-setup-planes.mjs)
// ─────────────────────────────────────────────────────────────────────────────

export async function createProduct(params: { name: string; description?: string }): Promise<PayPalProduct> {
  return request<PayPalProduct>('POST', '/v1/catalogs/products', {
    name: params.name,
    description: params.description,
    type: 'SERVICE',
    category: 'SOFTWARE',
  })
}

export async function createPlan(params: {
  productId: string
  name: string
  amountUsd: number
  intervalUnit?: 'MONTH' | 'YEAR'
}): Promise<PayPalPlan> {
  return request<PayPalPlan>('POST', '/v1/billing/plans', {
    product_id: params.productId,
    name: params.name,
    billing_cycles: [
      {
        frequency: { interval_unit: params.intervalUnit ?? 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: { value: params.amountUsd.toFixed(2), currency_code: 'USD' },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      payment_failure_threshold: 2,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Suscripciones
// ─────────────────────────────────────────────────────────────────────────────

export async function getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
  return request<PayPalSubscription>('GET', `/v1/billing/subscriptions/${subscriptionId}`)
}

export async function cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
  await request('POST', `/v1/billing/subscriptions/${subscriptionId}/cancel`, { reason })
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificar firma de webhook
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyWebhookSignature(
  headers: PayPalWebhookHeaders,
  body: unknown,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID!

  const result = await request<{ verification_status: string }>(
    'POST',
    '/v1/notifications/verify-webhook-signature',
    {
      transmission_id: headers.transmissionId,
      transmission_time: headers.transmissionTime,
      cert_url: headers.certUrl,
      auth_algo: headers.authAlgo,
      transmission_sig: headers.transmissionSig,
      webhook_id: webhookId,
      webhook_event: body,
    },
  )

  return result.verification_status === 'SUCCESS'
}
