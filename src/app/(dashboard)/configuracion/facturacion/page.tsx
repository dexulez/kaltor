'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type BillingStatus = 'trial' | 'pending' | 'active' | 'past_due' | 'cancelled' | 'suspended'

type StoreInfo = {
  nombre:               string
  billing_status:       BillingStatus
  trial_hasta:          string | null
  proximo_cobro_at:     string | null
  ultimo_pago_at:       string | null
  flow_subscription_id: string | null
  plans: { nombre: string; precio_mes: number } | null
}

const STATUS_LABEL: Record<BillingStatus, string> = {
  trial:     'En período de prueba',
  pending:   'Pendiente de pago',
  active:    'Activa',
  past_due:  'Pago vencido',
  cancelled: 'Cancelada',
  suspended: 'Suspendida',
}

const STATUS_COLOR: Record<BillingStatus, string> = {
  trial:     'bg-blue-100 text-blue-700',
  pending:   'bg-yellow-100 text-yellow-700',
  active:    'bg-green-100 text-green-700',
  past_due:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  suspended: 'bg-orange-100 text-orange-700',
}

function clp(n: number) {
  return '$' + n.toLocaleString('es-CL')
}

function diasRestantes(fecha: string | null): number {
  if (!fecha) return 0
  return Math.max(0, Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000))
}

export default function FacturacionPage() {
  const router      = useRouter()
  const params      = useSearchParams()
  const supabase    = createClient()
  const [store, setStore]       = useState<StoreInfo | null>(null)
  const [loading, setLoading]   = useState(true)
  const [subscribing, setSub]   = useState(false)
  const [cancelling, setCancel] = useState(false)

  useEffect(() => {
    if (params.get('flow_result') === 'success') {
      toast.success('¡Método de pago registrado! Tu suscripción quedará activa al confirmarse el cobro.')
    }
  }, [params])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('store_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const { data } = await supabase
        .from('stores')
        .select('nombre, billing_status, trial_hasta, proximo_cobro_at, ultimo_pago_at, flow_subscription_id, plans(nombre, precio_mes)')
        .eq('id', profile.store_id)
        .single()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStore(data as any)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  async function handleSubscribe() {
    setSub(true)
    try {
      const res  = await fetch('/api/flow/subscribe', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      if (data.redirect_url) window.location.href = data.redirect_url
    } finally {
      setSub(false)
    }
  }

  async function handleCancel() {
    if (!confirm('¿Confirmas cancelar la suscripción? Seguirás teniendo acceso hasta el fin del período pagado.')) return
    setCancel(true)
    try {
      const res  = await fetch('/api/flow/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Suscripción cancelada.')
      router.refresh()
    } finally {
      setCancel(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7A1A]" />
      </div>
    )
  }

  if (!store) return null

  const status   = store.billing_status
  const diasTrial = diasRestantes(store.trial_hasta)
  const plan     = store.plans

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturación y suscripción</h1>
        <p className="text-gray-500 mt-1">Gestiona tu plan y método de pago</p>
      </div>

      {/* Estado actual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado de tu suscripción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Plan actual</span>
            <span className="font-semibold text-gray-900">{plan?.nombre ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Precio</span>
            <span className="font-semibold text-gray-900">
              {plan ? `${clp(plan.precio_mes)} + IVA/mes` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Estado</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>

          {status === 'trial' && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Período de prueba</span>
              <span className="font-semibold text-gray-900">
                {diasTrial > 0 ? `${diasTrial} días restantes` : 'Vencido'}
              </span>
            </div>
          )}

          {status === 'active' && store.proximo_cobro_at && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Próximo cobro</span>
              <span className="font-semibold text-gray-900">
                {new Date(store.proximo_cobro_at).toLocaleDateString('es-CL')}
              </span>
            </div>
          )}

          {store.ultimo_pago_at && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Último pago</span>
              <span className="text-gray-900">
                {new Date(store.ultimo_pago_at).toLocaleDateString('es-CL')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerta si trial vencido o pago vencido */}
      {(status === 'trial' && diasTrial === 0) || status === 'past_due' ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-semibold mb-1">
            {status === 'past_due' ? '⚠️ Pago vencido' : '⏰ Período de prueba terminado'}
          </p>
          <p>Activa tu suscripción para seguir usando Kaltor sin interrupciones.</p>
        </div>
      ) : null}

      {/* Alerta si trial próximo a vencer */}
      {status === 'trial' && diasTrial > 0 && diasTrial <= 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
          <p className="font-semibold mb-1">⏳ Tu prueba vence en {diasTrial} días</p>
          <p>Suscríbete ahora para no perder acceso.</p>
        </div>
      )}

      {/* Acción principal */}
      {status !== 'active' && (
        <Card className="border-[#FF7A1A]/30 bg-[#FF7A1A]/5">
          <CardHeader>
            <CardTitle className="text-base text-[#FF7A1A]">Activar suscripción</CardTitle>
            <CardDescription>
              Paga con tarjeta de crédito/débito, WebPay o transferencia vía Flow.cl.
              El cobro es mensual en CLP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="w-full bg-[#FF7A1A] hover:bg-[#E06010] text-white font-semibold"
            >
              {subscribing ? 'Redirigiendo a Flow...' : `Suscribirme por ${plan ? clp(plan.precio_mes) : '—'} + IVA/mes →`}
            </Button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Serás redirigido a Flow.cl para registrar tu método de pago de forma segura.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Suscripción activa — mostrar botón cancelar */}
      {status === 'active' && store.flow_subscription_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cancelar suscripción</CardTitle>
            <CardDescription>
              Seguirás teniendo acceso hasta el final del período ya pagado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={cancelling}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {cancelling ? 'Cancelando...' : 'Cancelar suscripción'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info Flow */}
      <div className="flex items-center gap-3 text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border">
        <svg className="shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
        <span>Los pagos son procesados de forma segura por <strong>Flow.cl</strong>. Kaltor no almacena datos de tu tarjeta.</span>
      </div>
    </div>
  )
}
