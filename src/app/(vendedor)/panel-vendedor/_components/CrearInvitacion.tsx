'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type Plan = { slug: string; nombre: string; precio_mensual: number }

export default function CrearInvitacion({ codigo, plans, topePct }: {
  codigo: string
  plans: Plan[]
  topePct: number
}) {
  const [planSlug, setPlanSlug] = useState(plans[0]?.slug ?? '')
  const [dtipo, setDtipo] = useState<'pct' | 'monto'>('pct')
  const [dval, setDval] = useState(String(topePct))

  const plan = plans.find(p => p.slug === planSlug) ?? null

  const topeMonto = plan ? Math.round((topePct / 100) * plan.precio_mensual) : 0
  const maxPermitido = dtipo === 'pct' ? topePct : topeMonto

  const dvalClamped = useMemo(() => {
    const n = Number(dval)
    if (!Number.isFinite(n) || n <= 0) return 0
    return Math.min(n, maxPermitido)
  }, [dval, maxPermitido])

  const link = useMemo(() => {
    if (!plan || dvalClamped <= 0) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kaltorpos.com'
    const params = new URLSearchParams({
      ref: codigo,
      dtipo,
      dval: String(dvalClamped),
      plan: plan.slug,
    })
    return `${origin}/registro?${params.toString()}`
  }, [plan, dtipo, dvalClamped, codigo])

  const descuentoTexto = dtipo === 'pct' ? `${dvalClamped}%` : `$${dvalClamped.toLocaleString('es-CL')}`

  const mensaje = link
    ? `¡Hola! Te invito a probar Kaltor, el sistema de gestión para tu negocio 🚀\n\nCon este link tienes ${descuentoTexto} de descuento por tus primeros 6 pagos:\n${link}`
    : ''

  function copiarMensaje() {
    if (!mensaje) return
    navigator.clipboard.writeText(mensaje)
    toast.success('Mensaje copiado')
  }

  function copiarLink() {
    if (!link) return
    navigator.clipboard.writeText(link)
    toast.success('Link copiado')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <h2 className="font-semibold text-gray-800">Crear invitación</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Plan a ofrecer</label>
          <select
            value={planSlug}
            onChange={e => setPlanSlug(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
          >
            {plans.map(p => (
              <option key={p.slug} value={p.slug}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500">Tipo de descuento</label>
          <select
            value={dtipo}
            onChange={e => setDtipo(e.target.value as 'pct' | 'monto')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
          >
            <option value="pct">Porcentaje</option>
            <option value="monto">Monto fijo (CLP)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500">
            Valor (máx. {dtipo === 'pct' ? `${topePct}%` : `$${topeMonto.toLocaleString('es-CL')}`})
          </label>
          <input
            type="number" min="0" step={dtipo === 'pct' ? '1' : '100'}
            value={dval}
            onChange={e => setDval(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
          />
        </div>
      </div>

      {link ? (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 break-all">
            {link}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
              target="_blank" rel="noopener noreferrer"
              className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Enviar por WhatsApp
            </a>
            <button
              onClick={copiarMensaje}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Copiar mensaje para correo
            </button>
            <button
              onClick={copiarLink}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Copiar solo el link
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">Ingresa un valor de descuento mayor a 0 para generar el link.</p>
      )}
    </div>
  )
}
