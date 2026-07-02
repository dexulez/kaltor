import { createServiceClient } from '@/lib/supabase/server'
import StoresTable, { StoreRow } from './_components/StoresTable'

export const dynamic = 'force-dynamic'

async function loadStores(admin: ReturnType<typeof createServiceClient>): Promise<StoreRow[]> {
  // Intentar con columnas de billing (requiere supabase/kaltor_flow_billing.sql)
  const { data, error } = await admin
    .from('stores')
    .select('id, nombre, email, activo, created_at, trial_hasta, billing_status, flow_subscription_id, proximo_cobro_at, plans(nombre, precio_mes), user_profiles(count)')
    .order('created_at', { ascending: false })

  if (!error) return (data ?? []) as unknown as StoreRow[]

  // Fallback sin columnas de billing
  const { data: fallback } = await admin
    .from('stores')
    .select('id, nombre, email, activo, created_at, trial_hasta, plans(nombre, precio_mes), user_profiles(count)')
    .order('created_at', { ascending: false })

  return ((fallback ?? []) as unknown[])
    .map(s => ({ ...(s as Record<string, unknown>), billing_status: 'trial', flow_subscription_id: null, proximo_cobro_at: null })) as StoreRow[]
}

export default async function KaltorAdminPage() {
  const admin = createServiceClient()
  const stores = await loadStores(admin)

  const ahora = new Date()
  const total       = stores.length
  const enTrial     = stores.filter(s => (s.billing_status ?? 'trial') === 'trial' && s.trial_hasta && new Date(s.trial_hasta) > ahora).length
  const trialVencido= stores.filter(s => (s.billing_status ?? 'trial') === 'trial' && s.trial_hasta && new Date(s.trial_hasta) <= ahora).length
  const activas     = stores.filter(s => s.billing_status === 'active').length
  const sinPago     = stores.filter(s => s.billing_status === 'past_due' || s.billing_status === 'cancelled' || s.billing_status === 'suspended').length
  const mrr         = stores.filter(s => s.billing_status === 'active').reduce((acc, s) => acc + (s.plans?.precio_mes ?? 0), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Plataforma</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Total" value={total}      color="slate"  />
        <MetricCard label="En trial" value={enTrial}   color="blue"   />
        <MetricCard label="Trial vencido" value={trialVencido} color="red" />
        <MetricCard label="Activas" value={activas}    color="green"  />
        <MetricCard label="Problemas" value={sinPago}   color="orange" />
        <MetricCard
          label="MRR estimado"
          value={mrr > 0 ? `$${mrr.toLocaleString('es-CL')}` : '$0'}
          sub="+IVA/mes"
          color="kaltor"
        />
      </div>

      {/* Tabla de tiendas */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Todas las empresas</h2>
        <StoresTable stores={stores} />
      </div>
    </div>
  )
}

function MetricCard({
  label, value, color, sub,
}: {
  label: string
  value: number | string
  color: 'slate' | 'blue' | 'red' | 'green' | 'orange' | 'kaltor'
  sub?: string
}) {
  const cls = {
    slate:  'bg-white border-gray-200 text-gray-800',
    blue:   'bg-blue-50 border-blue-200 text-blue-800',
    red:    'bg-red-50 border-red-200 text-red-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    kaltor: 'bg-[#FF7A1A]/8 border-[#FF7A1A]/25 text-[#C05010]',
  }[color]

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cls}`}>
      <p className="text-xs font-medium opacity-60 mb-1 leading-tight">{label}</p>
      <p className="text-2xl font-extrabold leading-none tracking-tight">{value}</p>
      {sub && <p className="text-[11px] opacity-50 mt-1">{sub}</p>}
    </div>
  )
}
