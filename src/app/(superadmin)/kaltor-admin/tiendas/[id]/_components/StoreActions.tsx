'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Plan = { id: string; nombre: string; precio_mes: number }

const BILLING_OPTS = [
  { value: 'trial',     label: 'En trial' },
  { value: 'active',    label: 'Activa' },
  { value: 'pending',   label: 'Pendiente' },
  { value: 'past_due',  label: 'Pago vencido' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'suspended', label: 'Suspendida' },
]

export default function StoreActions({
  storeId, currentPlanId, billingStatus, activo, plans,
}: {
  storeId: string
  currentPlanId: string | null
  billingStatus: string
  activo: boolean
  plans: Plan[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [trialDays, setTrialDays]     = useState('14')
  const [planSel, setPlanSel]         = useState(currentPlanId ?? '')
  const [statusSel, setStatusSel]     = useState(billingStatus)

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(action)
    try {
      const res  = await fetch(`/api/superadmin/stores/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); return }
      toast.success('Actualizado')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setBusy(null)
    }
  }

  const is = (a: string) => busy === a

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
      <h2 className="font-semibold text-gray-800">Acciones administrativas</h2>

      {/* Extender trial */}
      <section>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Extender trial</p>
        <div className="flex gap-2 items-center">
          <input
            type="number" min="1" max="365"
            value={trialDays}
            onChange={e => setTrialDays(e.target.value)}
            className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
          />
          <span className="text-sm text-gray-500">días</span>
          <button
            onClick={() => act('extend_trial', { days: Number(trialDays) })}
            disabled={!!busy}
            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {is('extend_trial') ? '...' : 'Extender'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Se suma desde el último día de trial (o desde hoy si ya venció).
        </p>
      </section>

      {/* Cambiar plan */}
      <section>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Cambiar plan</p>
        <div className="flex gap-2">
          <select
            value={planSel}
            onChange={e => setPlanSel(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
          >
            <option value="">Selecciona plan...</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} — ${p.precio_mes.toLocaleString('es-CL')}/mes
              </option>
            ))}
          </select>
          <button
            onClick={() => act('change_plan', { plan_id: planSel })}
            disabled={!!busy || !planSel}
            className="bg-[#FF7A1A]/10 hover:bg-[#FF7A1A]/20 text-[#C05010] border border-[#FF7A1A]/25 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {is('change_plan') ? '...' : 'Cambiar'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Actualiza también los módulos disponibles en el menú.
        </p>
      </section>

      {/* Estado de facturación */}
      <section>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Estado de facturación</p>
        <div className="flex gap-2">
          <select
            value={statusSel}
            onChange={e => setStatusSel(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
          >
            {BILLING_OPTS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => act('set_billing_status', { status: statusSel })}
            disabled={!!busy}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {is('set_billing_status') ? '...' : 'Aplicar'}
          </button>
        </div>
      </section>

      {/* Suspender / Activar */}
      <section className="pt-4 border-t border-gray-100">
        <button
          onClick={() => act('toggle_active')}
          disabled={!!busy}
          className={`w-full px-4 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
            activo
              ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
              : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
          }`}
        >
          {is('toggle_active') ? 'Procesando...' : activo ? '⏸ Suspender tienda' : '▶ Reactivar tienda'}
        </button>
        <p className="text-xs text-gray-400 mt-1 text-center">
          {activo ? 'Bloquea el acceso a todos los usuarios de esta tienda.' : 'Permite el acceso nuevamente.'}
        </p>
      </section>
    </div>
  )
}
