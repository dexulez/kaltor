import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import StoreActions from './_components/StoreActions'
import StoreModuleToggles from './_components/StoreModuleToggles'

export const dynamic = 'force-dynamic'

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  trial:     { label: 'En trial',      cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Activa',        cls: 'bg-green-100 text-green-700' },
  pending:   { label: 'Pendiente',     cls: 'bg-yellow-100 text-yellow-700' },
  past_due:  { label: 'Pago vencido',  cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelada',     cls: 'bg-gray-100 text-gray-500' },
  suspended: { label: 'Suspendida',    cls: 'bg-orange-100 text-orange-700' },
}

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createServiceClient()

  // ── Queries separadas (sin FK joins para evitar errores de schema cache) ──
  const [
    { data: storeBase, error: storeErr },
    { data: users },
    { data: plans },
    { data: storeMods },
  ] = await Promise.all([
    admin.from('stores')
      .select('id, nombre, email, activo, created_at, trial_hasta, plan_id, billing_status, flow_customer_id, flow_subscription_id, ultimo_pago_at, proximo_cobro_at')
      .eq('id', id)
      .single(),
    admin.from('user_profiles')
      .select('id, nombre_completo, email, activo, created_at, roles(nombre)')
      .eq('store_id', id)
      .order('created_at', { ascending: true }),
    admin.from('plans')
      .select('id, nombre, slug, precio_mensual')
      .order('precio_mensual', { ascending: true }),
    admin.from('store_modules')
      .select('module_key, activo')
      .eq('store_id', id),
  ])

  if (storeErr || !storeBase) notFound()

  // Plan info (del arreglo plans ya cargado)
  const planInfo = (plans ?? []).find((p: { id: string }) => p.id === storeBase.plan_id) ?? null

  const store = { ...storeBase, plans: planInfo }

  // Eventos de pago (tabla opcional — requiere kaltor_flow_billing.sql)
  let flowEvents: Record<string, unknown>[] = []
  const { data: evData } = await admin
    .from('flow_events')
    .select('id, event_type, status, amount, created_at')
    .eq('store_id', id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (evData) flowEvents = evData as Record<string, unknown>[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = store as any
  const billingStatus: string = s.billing_status ?? 'trial'
  const trialHasta: string | null = s.trial_hasta ?? null
  const plan = s.plans ?? null

  const activeModules = (storeMods ?? [])
    .filter((m: { module_key: string; activo: boolean }) => m.activo)
    .map((m: { module_key: string; activo: boolean }) => m.module_key)

  const effectiveStatus = billingStatus === 'trial' && trialHasta && new Date(trialHasta) <= new Date()
    ? 'vencido'
    : billingStatus

  const diasTrial = trialHasta
    ? Math.max(0, Math.ceil((new Date(trialHasta).getTime() - Date.now()) / 86400000))
    : null

  const statusCfg = STATUS_CFG[effectiveStatus] ?? STATUS_CFG.trial

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/kaltor-admin" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">
          ← Volver
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{s.nombre}</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
          {statusCfg.label}
        </span>
        {!s.activo && (
          <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">
            Suspendida
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Info de la tienda */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-5">Información de la tienda</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <Field label="Nombre" value={s.nombre} />
              <Field label="Email" value={s.email} />
              <Field label="Plan actual" value={plan?.nombre ?? '—'} />
              <Field
                label="Precio del plan"
                value={plan?.precio_mensual ? `$${plan.precio_mensual.toLocaleString('es-CL')}/mes + IVA` : '—'}
              />
              <Field
                label="Trial hasta"
                value={trialHasta
                  ? `${new Date(trialHasta).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}${diasTrial !== null ? ` (${diasTrial === 0 ? 'vencido' : `${diasTrial} días`})` : ''}`
                  : '—'}
              />
              {s.ultimo_pago_at && (
                <Field label="Último pago" value={new Date(s.ultimo_pago_at).toLocaleDateString('es-CL')} />
              )}
              {s.proximo_cobro_at && (
                <Field label="Próximo cobro" value={new Date(s.proximo_cobro_at).toLocaleDateString('es-CL')} />
              )}
              <Field
                label="Registro"
                value={new Date(s.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
              />
              {s.flow_customer_id && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500 mb-0.5">Flow Customer ID</dt>
                  <dd className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{s.flow_customer_id}</dd>
                </div>
              )}
              {s.flow_subscription_id && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500 mb-0.5">Flow Subscription ID</dt>
                  <dd className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">{s.flow_subscription_id}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Usuarios */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">
              Usuarios
              <span className="ml-2 text-sm font-normal text-gray-400">({users?.length ?? 0})</span>
            </h2>
            {!users || users.length === 0 ? (
              <p className="text-gray-400 text-sm">Sin usuarios registrados aún.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {users.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.nombre_completo}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded-full">
                        {u.roles?.nombre ?? '—'}
                      </span>
                      {!u.activo && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          <StoreActions
            storeId={id}
            currentPlanId={s.plan_id ?? null}
            billingStatus={billingStatus}
            activo={s.activo}
            plans={(plans ?? []) as { id: string; nombre: string; precio_mensual: number }[]}
          />

          {/* Eventos de pago */}
          {flowEvents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Eventos de pago</h2>
              <div className="space-y-2">
                {flowEvents.map((ev) => (
                  <div key={ev.id as string} className="p-3 bg-gray-50 rounded-lg text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-700">{ev.event_type as string}</span>
                      <span className="text-gray-400">
                        {new Date(ev.created_at as string).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${
                        ev.status === 2 ? 'bg-green-100 text-green-700' :
                        ev.status === 3 ? 'bg-red-100 text-red-700' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {ev.status === 2 ? 'Exitoso' : ev.status === 3 ? 'Rechazado' : `Status ${ev.status}`}
                      </span>
                      {!!ev.amount && (
                        <span className="text-gray-600">${(ev.amount as number).toLocaleString('es-CL')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Módulos — interruptores activables/desactivables */}
          <StoreModuleToggles storeId={id} activeModules={activeModules} />
        </div>
      </div>
    </div>
  )
}


function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}
