export type FlowEnvironment = 'sandbox' | 'production'

export interface FlowPlan {
  planId: string
  name: string
  amount: number
  currency: string
  interval: number
  intervalo: 'mes' | 'año'
  trialPeriodDays?: number
}

export interface FlowCustomer {
  customerId: string
  name: string
  email: string
  externalId: string
  status?: string
  registerDate?: string
}

export interface FlowSubscription {
  subscriptionId: string
  planId: string
  customerId: string
  status: number // 1=active, 2=suspended, 3=cancelled
  currentPeriodStart: string
  currentPeriodEnd: string
  trial: number
  trialPeriodDays: number
  morose: number
}

export interface FlowCreateSubscriptionResponse {
  subscriptionId: string
  planId: string
  customerId: string
  status: number
  url?: string       // redirect URL para registrar tarjeta (primera vez)
  token?: string
}

export interface FlowCustomerRegisterResponse {
  url: string
  token: string
}

export interface FlowWebhookPayload {
  event: string
  resourceId: string
  status?: number
  subscriptionId?: string
  customerId?: string
  planId?: string
  requestDate?: string
  flowOrder?: number
  amount?: number
  currency?: string
}
