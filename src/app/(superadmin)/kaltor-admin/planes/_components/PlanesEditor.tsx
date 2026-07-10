'use client'

import { useState } from 'react'
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

export default function PlanesEditor({ plans }: { plans: Plan[] }) {
  const router = useRouter()
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(plans.map(p => [p.id, String(p.precio_mensual_usd)]))
  )
  const [busy, setBusy] = useState<string | null>(null)

  async function guardar(plan: Plan) {
    const precio = Number(valores[plan.id])
    if (!Number.isFinite(precio) || precio <= 0) {
      toast.error('Precio USD inválido')
      return
    }
    setBusy(plan.id)
    try {
      const res = await fetch(`/api/superadmin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio_mensual_usd: precio }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); return }
      toast.success(`${plan.nombre} → $${data.plan.precio_mensual.toLocaleString('es-CL')} CLP/mes`)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Precio USD /mes</th>
              <th className="px-4 py-3 font-medium">CLP /mes (calculado)</th>
              <th className="px-4 py-3 font-medium">CLP /año (calculado)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-gray-800">{p.nombre}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 text-xs">US$</span>
                    <input
                      type="number" min="0" step="0.01"
                      value={valores[p.id] ?? ''}
                      onChange={e => setValores(v => ({ ...v, [p.id]: e.target.value }))}
                      className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">${p.precio_mensual.toLocaleString('es-CL')}</td>
                <td className="px-4 py-3 text-gray-600">${p.precio_anual.toLocaleString('es-CL')}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => guardar(p)}
                    disabled={busy === p.id}
                    className="bg-[#FF7A1A]/10 hover:bg-[#FF7A1A]/20 text-[#C05010] border border-[#FF7A1A]/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {busy === p.id ? '...' : 'Guardar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 px-4 py-3 border-t border-gray-100">
        El precio en CLP se recalcula automáticamente con el tipo de cambio vigente (mindicador.cl) al guardar.
        Los visitantes de otros países ven el precio convertido a su moneda local según el tipo de cambio del día.
      </p>
    </div>
  )
}
