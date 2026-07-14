'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Plan = {
  id: string
  nombre: string
  slug: string
  precio_mensual: number
  precio_anual: number
  precio_mensual_usd: number
  activo: boolean
}

type PrevisualizacionPrecio = {
  region: string
  pais: string
  nombre: string
  codigo: string
  formateado: string
}

export default function PlanesEditor({ plans }: { plans: Plan[] }) {
  const router = useRouter()
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(plans.map(p => [p.id, String(p.precio_mensual)]))
  )
  const [dolarClp, setDolarClp] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [previewPlanId, setPreviewPlanId] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState<PrevisualizacionPrecio[] | null>(null)

  useEffect(() => {
    fetch('/api/superadmin/plans/tasa-dolar')
      .then(res => res.json())
      .then(data => { if (typeof data?.dolarClp === 'number') setDolarClp(data.dolarClp) })
      .catch(() => {})
  }, [])

  async function guardar(plan: Plan) {
    const precio = Number(valores[plan.id])
    if (!Number.isFinite(precio) || precio <= 0) {
      toast.error('Precio CLP inválido')
      return
    }
    setBusy(plan.id)
    try {
      const res = await fetch(`/api/superadmin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio_mensual: precio }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); return }
      toast.success(`${plan.nombre} → US$${data.plan.precio_mensual_usd} /mes`)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setBusy(null)
    }
  }

  async function verConversiones(plan: Plan) {
    if (previewPlanId === plan.id) {
      setPreviewPlanId(null)
      return
    }
    const precio = Number(valores[plan.id])
    if (!Number.isFinite(precio) || precio <= 0) {
      toast.error('Precio CLP inválido')
      return
    }
    setPreviewPlanId(plan.id)
    setPreviewData(null)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/superadmin/plans/conversiones?clp=${precio}`)
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); setPreviewPlanId(null); return }
      setPreviewData(data.precios)
    } catch {
      toast.error('Error de conexión')
      setPreviewPlanId(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  function usdEnVivo(planId: string): string {
    const precio = Number(valores[planId])
    if (!dolarClp || !Number.isFinite(precio) || precio <= 0) return '—'
    return (precio / dolarClp).toFixed(2)
  }

  // Mismo redondeo que aplica la API al guardar (mensual a la decena más cercana, anual = mensual × 10)
  function anualEnVivo(planId: string): number {
    const precio = Number(valores[planId]) || 0
    const mensualRedondeado = Math.round(precio / 10) * 10
    return mensualRedondeado * 10
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Precio CLP /mes</th>
              <th className="px-4 py-3 font-medium">CLP /año (calculado)</th>
              <th className="px-4 py-3 font-medium">US$ /mes (automático)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <Fragment key={p.id}>
                <tr className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-semibold text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 text-xs">$</span>
                      <input
                        type="number" min="0" step="10"
                        value={valores[p.id] ?? ''}
                        onChange={e => setValores(v => ({ ...v, [p.id]: e.target.value }))}
                        className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">${anualEnVivo(p.id).toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3 text-gray-600">US${usdEnVivo(p.id)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => verConversiones(p)}
                        className="text-[#C05010] hover:underline text-xs font-medium"
                      >
                        {previewPlanId === p.id ? 'Ocultar' : 'Ver por país'}
                      </button>
                      <button
                        onClick={() => guardar(p)}
                        disabled={busy === p.id}
                        className="bg-[#FF7A1A]/10 hover:bg-[#FF7A1A]/20 text-[#C05010] border border-[#FF7A1A]/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {busy === p.id ? '...' : 'Guardar'}
                      </button>
                    </div>
                  </td>
                </tr>
                {previewPlanId === p.id && (
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <td colSpan={5} className="px-4 py-4">
                      {previewLoading && <p className="text-xs text-gray-400">Calculando conversiones...</p>}
                      {!previewLoading && previewData && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-4">
                          {['Sudamérica', 'Brasil', 'Centroamérica', 'Norteamérica', 'Europa'].map(region => {
                            const items = previewData.filter(d => d.region === region)
                            if (items.length === 0) return null
                            return (
                              <div key={region} className="space-y-1">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{region}</p>
                                {items.map(item => (
                                  <div key={item.pais} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="text-gray-500">{item.nombre}</span>
                                    <span className="font-medium text-gray-700">{item.formateado}</span>
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 px-4 py-3 border-t border-gray-100">
        El precio en CLP es el precio base. El precio en USD (usado para el cobro por PayPal) se
        calcula automáticamente con el tipo de cambio vigente (mindicador.cl) y se guarda al hacer clic
        en &quot;Guardar&quot;. Usa &quot;Ver por país&quot; para previsualizar cómo se ve el precio actual en otras monedas.
      </p>
    </div>
  )
}
