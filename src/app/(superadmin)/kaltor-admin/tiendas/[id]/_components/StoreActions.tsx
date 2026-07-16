'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Plan = { id: string; nombre: string; precio_mensual: number }

const BILLING_OPTS = [
  { value: 'trial',     label: 'En trial' },
  { value: 'active',    label: 'Activa' },
  { value: 'pending',   label: 'Pendiente' },
  { value: 'past_due',  label: 'Pago vencido' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'suspended', label: 'Suspendida' },
]

type PlanEspecial = {
  nombre: string
  precio_mensual: number
  precio_mensual_usd: number
  flow_plan_id: string | null
  paypal_plan_id: string | null
}

export default function StoreActions({
  storeId, currentPlanId, billingStatus, activo, plans, dolarClp, planEspecialActual,
}: {
  storeId: string
  currentPlanId: string | null
  billingStatus: string
  activo: boolean
  plans: Plan[]
  dolarClp: number | null
  planEspecialActual?: PlanEspecial | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [trialDays, setTrialDays]     = useState('14')
  const [planSel, setPlanSel]         = useState(currentPlanId ?? '')
  const [statusSel, setStatusSel]     = useState(billingStatus)

  const [nombreEspecial, setNombreEspecial]   = useState('')
  const [precioClpEspecial, setPrecioClpEspecial] = useState('')
  const [precioUsdEspecial, setPrecioUsdEspecial] = useState('')
  const [maxUsuariosEspecial, setMaxUsuariosEspecial] = useState('')
  const [sesionUnicaEspecial, setSesionUnicaEspecial] = useState(false)
  const [basadoEnPlanId, setBasadoEnPlanId]   = useState('')

  function onPrecioClpChange(v: string) {
    setPrecioClpEspecial(v)
    const num = Number(v)
    if (dolarClp && v !== '' && !isNaN(num)) {
      setPrecioUsdEspecial((num / dolarClp).toFixed(2))
    } else if (v === '') {
      setPrecioUsdEspecial('')
    }
  }

  function onPrecioUsdChange(v: string) {
    setPrecioUsdEspecial(v)
    const num = Number(v)
    if (dolarClp && v !== '' && !isNaN(num)) {
      setPrecioClpEspecial(String(Math.round(num * dolarClp)))
    } else if (v === '') {
      setPrecioClpEspecial('')
    }
  }

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
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        data.warnings.forEach((w: string) => toast.warning(w))
      }
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
                {p.nombre} — ${p.precio_mensual.toLocaleString('es-CL')}/mes
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

      {/* Plan especial (precio personalizado) */}
      <section className="pt-4 border-t border-gray-100">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
          Plan especial (precio personalizado)
        </p>

        {planEspecialActual ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{planEspecialActual.nombre}</span> — $
              {planEspecialActual.precio_mensual.toLocaleString('es-CL')}/mes
              · US${planEspecialActual.precio_mensual_usd}/mes
            </p>
            <div className="flex gap-2 text-xs">
              <span className={`px-2 py-1 rounded-lg font-semibold ${planEspecialActual.flow_plan_id ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                {planEspecialActual.flow_plan_id ? '✓ Flow' : '⚠ Flow pendiente'}
              </span>
              <span className={`px-2 py-1 rounded-lg font-semibold ${planEspecialActual.paypal_plan_id ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                {planEspecialActual.paypal_plan_id ? '✓ PayPal' : '⚠ PayPal pendiente'}
              </span>
            </div>
            {(!planEspecialActual.flow_plan_id || !planEspecialActual.paypal_plan_id) && (
              <button
                onClick={() => act('retry_special_plan_billing')}
                disabled={!!busy}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {is('retry_special_plan_billing') ? '...' : 'Reintentar generar cobro'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text" placeholder="Nombre del plan"
              value={nombreEspecial}
              onChange={e => setNombreEspecial(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
            />
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-gray-400 text-xs">$</span>
                <input
                  type="number" min="0" step="10" placeholder="Precio CLP/mes"
                  value={precioClpEspecial}
                  onChange={e => onPrecioClpChange(e.target.value)}
                  className="w-full text-sm focus:outline-none"
                />
              </div>
              <div className="flex-1 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-gray-400 text-xs">US$</span>
                <input
                  type="number" min="0" step="0.5" placeholder="Precio USD/mes"
                  value={precioUsdEspecial}
                  onChange={e => onPrecioUsdChange(e.target.value)}
                  className="w-full text-sm focus:outline-none"
                />
              </div>
            </div>
            {dolarClp ? (
              <p className="text-[11px] text-gray-400 -mt-1">
                Conversión automática con dólar ${dolarClp.toLocaleString('es-CL')} CLP (mindicador.cl).
              </p>
            ) : (
              <p className="text-[11px] text-amber-600 -mt-1">
                No se pudo obtener el valor del dólar — completa ambos precios manualmente.
              </p>
            )}
            <div className="flex gap-2 items-center">
              <input
                type="number" min="1" placeholder="Máx. usuarios (vacío = ilimitado)"
                value={maxUsuariosEspecial}
                onChange={e => setMaxUsuariosEspecial(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
              />
              <label className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={sesionUnicaEspecial}
                  onChange={e => setSesionUnicaEspecial(e.target.checked)}
                />
                Sesión única
              </label>
            </div>
            <select
              value={basadoEnPlanId}
              onChange={e => setBasadoEnPlanId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
            >
              <option value="">Módulos basados en...</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <button
              onClick={() => act('create_special_plan', {
                nombre: nombreEspecial,
                precio_mensual: Number(precioClpEspecial),
                precio_mensual_usd: Number(precioUsdEspecial),
                max_usuarios: maxUsuariosEspecial,
                sesion_unica: sesionUnicaEspecial,
                basado_en_plan_id: basadoEnPlanId,
              })}
              disabled={!!busy || !nombreEspecial || !precioClpEspecial || !precioUsdEspecial || !basadoEnPlanId}
              className="w-full bg-[#FF7A1A]/10 hover:bg-[#FF7A1A]/20 text-[#C05010] border border-[#FF7A1A]/25 px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {is('create_special_plan') ? '...' : 'Crear y asignar plan especial'}
            </button>
            <p className="text-xs text-gray-400">
              Crea un plan exclusivo para esta tienda con el precio que definas, e intenta
              generar automáticamente su cobro recurrente en Flow y PayPal.
            </p>
          </div>
        )}
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
