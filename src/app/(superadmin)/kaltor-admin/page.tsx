import { createServiceClient } from '@/lib/supabase/server'
import StoresTable, { StoreRow } from './_components/StoresTable'

export const dynamic = 'force-dynamic'

async function loadStores(admin: ReturnType<typeof createServiceClient>): Promise<StoreRow[]> {
  // ── 1. Tiendas (sin joins) ────────────────────────────────────────────────
  const { data: stores, error: storesErr } = await admin
    .from('stores')
    .select('id, nombre, email, activo, created_at, trial_hasta, plan_id, billing_status, flow_subscription_id, proximo_cobro_at')
    .order('created_at', { ascending: false })

  if (storesErr) {
    // billing columns might not exist yet → fallback without them
    console.error('[superadmin] stores query error:', storesErr.message)
    const { data: base } = await admin
      .from('stores')
      .select('id, nombre, email, activo, created_at, trial_hasta, plan_id')
      .order('created_at', { ascending: false })
    if (!base || base.length === 0) return []
    return buildRows(base.map(s => ({ ...s, billing_status: 'trial', flow_subscription_id: null, proximo_cobro_at: null })), admin)
  }

  if (!stores || stores.length === 0) return []
  return buildRows(stores, admin)
}

async function buildRows(
  stores: Record<string, unknown>[],
  admin: ReturnType<typeof createServiceClient>
): Promise<StoreRow[]> {
  // ── 2. Planes (query separada, sin depender de join) ─────────────────────
  const planIds = [...new Set(stores.map(s => s.plan_id as string).filter(Boolean))]
  const planMap: Record<string, { nombre: string; precio_mensual: number }> = {}
  if (planIds.length > 0) {
    const { data: plans } = await admin
      .from('plans')
      .select('id, nombre, precio_mensual')
      .in('id', planIds)
    if (plans) {
      for (const p of plans as { id: string; nombre: string; precio_mensual: number }[]) {
        planMap[p.id] = { nombre: p.nombre, precio_mensual: p.precio_mensual }
      }
    }
  }

  // ── 3. Conteo de usuarios por tienda ─────────────────────────────────────
  const countMap: Record<string, number> = {}
  const { data: profiles } = await admin.from('user_profiles').select('store_id')
  if (profiles) {
    for (const p of profiles as { store_id: string }[]) {
      countMap[p.store_id] = (countMap[p.store_id] ?? 0) + 1
    }
  }

  return stores.map(s => ({
    id:                   s.id as string,
    nombre:               s.nombre as string,
    email:                s.email as string,
    activo:               s.activo as boolean,
    created_at:           s.created_at as string,
    trial_hasta:          (s.trial_hasta as string | null) ?? null,
    billing_status:       (s.billing_status as string | null) ?? 'trial',
    flow_subscription_id: (s.flow_subscription_id as string | null) ?? null,
    proximo_cobro_at:     (s.proximo_cobro_at as string | null) ?? null,
    plans:                planMap[s.plan_id as string] ?? null,
    user_profiles:        [{ count: countMap[s.id as string] ?? 0 }],
  }))
}

export default async function KaltorAdminPage() {
  const admin  = createServiceClient()
  const stores = await loadStores(admin)

  const ahora        = new Date()
  const total        = stores.length
  const enTrial      = stores.filter(s => (s.billing_status ?? 'trial') === 'trial' && !!s.trial_hasta && new Date(s.trial_hasta) > ahora).length
  const trialVencido = stores.filter(s => (s.billing_status ?? 'trial') === 'trial' && !!s.trial_hasta && new Date(s.trial_hasta) <= ahora).length
  const activas      = stores.filter(s => s.billing_status === 'active').length
  const sinPago      = stores.filter(s => ['past_due', 'cancelled', 'suspended'].includes(s.billing_status ?? '')).length
  const mrr          = stores.filter(s => s.billing_status === 'active').reduce((acc, s) => acc + (s.plans?.precio_mensual ?? 0), 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de Plataforma</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="Total"         value={total}        color="slate"  />
        <MetricCard label="En trial"      value={enTrial}      color="blue"   />
        <MetricCard label="Trial vencido" value={trialVencido} color="red"    />
        <MetricCard label="Activas"       value={activas}      color="green"  />
        <MetricCard label="Problemas"     value={sinPago}      color="orange" />
        <MetricCard
          label="MRR estimado"
          value={mrr > 0 ? `$${mrr.toLocaleString('es-CL')}` : '$0'}
          sub="+IVA/mes"
          color="kaltor"
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Todas las empresas
          {total > 0 && <span className="ml-2 font-normal text-gray-400">({total})</span>}
        </h2>
        <StoresTable stores={stores} />
      </div>
    </div>
  )
}

function MetricCard({ label, value, color, sub }: {
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
