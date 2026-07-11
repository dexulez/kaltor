export type PayPalEnvironment = 'sandbox' | 'production'

export interface PayPalProduct {
  id: string
  name: string
  type: string
}

export interface PayPalPlan {
  id: string
  product_id: string
  name: string
  status: 'CREATED' | 'ACTIVE' | 'INACTIVE'
}

export interface PayPalSubscriber {
  email_address?: string
  name?: { given_name?: string; surname?: string }
}

export interface PayPalSubscription {
  id: string
  plan_id: string
  status: 'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED'
  subscriber?: PayPalSubscriber
  billing_info?: {
    next_billing_time?: string
    last_payment?: { time?: string; amount?: { value: string; currency_code: string } }
  }
  custom_id?: string
}

export interface PayPalWebhookHeaders {
  transmissionId: string
  transmissionTime: string
  certUrl: string
  authAlgo: string
  transmissionSig: string
}

export interface PayPalWebhookEvent {
  id: string
  event_type: string
  resource: {
    id?: string
    billing_agreement_id?: string
    status?: string
    plan_id?: string
    custom_id?: string
  }
}
