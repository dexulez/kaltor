'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PAIS_MONEDA, formatPrecioPais } from '@/lib/currency'

type Plan = {
  id: string
  nombre: string
  slug: string
  precio_mensual: number
  precio_anual: number
  precio_mensual_usd: number
  precios_pais: Record<string, number>
  activo: boolean
}

const PAISES_TABLA: { region: string; pais: string; nombre: string }[] = [
  { region: 'Sudamérica',    pais: 'AR', nombre: 'Argentina' },
  { region: 'Sudamérica',    pais: 'BO', nombre: 'Bolivia' },
  { region: 'Sudamérica',    pais: 'CO', nombre: 'Colombia' },
  { region: 'Sudamérica',    pais: 'PY', nombre: 'Paraguay' },
  { region: 'Sudamérica',    pais: 'PE', nombre: 'Perú' },
  { region: 'Sudamérica',    pais: 'UY', nombre: 'Uruguay' },
  { region: 'Sudamérica',    pais: 'VE', nombre: 'Venezuela' },
  { region: 'Brasil',        pais: 'BR', nombre: 'Brasil' },
  { region: 'Centroamérica', pais: 'GT', nombre: 'Guatemala' },
  { region: 'Centroamérica', pais: 'HN', nombre: 'Honduras' },
  { region: 'Centroamérica', pais: 'NI', nombre: 'Nicaragua' },
  { region: 'Centroamérica', pais: 'CR', nombre: 'Costa Rica' },
  { region: 'Centroamérica', pais: 'DO', nombre: 'Rep. Dominicana' },
  { region: 'Norteamérica',  pais: 'MX', nombre: 'México' },
  { region: 'Europa',        pais: 'ES', nombre: 'Europa (EUR)' },
]

// Países dolarizados (sin fila propia: siempre usan el campo USD directamente) y Ecuador/El
// Salvador/Panamá/EEUU se omiten de la tabla editable por esa razón.

export default function PlanesEditor({ plans }: { plans: Plan[] }) {
  const router = useRouter()
  const [valoresClp, setValoresClp] = useState<Record<string, string>>(
    Object.fromEntries(plans.map(p => [p.id, String(p.precio_mensual)]))
  )
  const [valoresUsd, setValoresUsd] = useState<Record<string, string>>(
    Object.fromEntries(plans.map(p => [p.id, String(p.precio_mensual_usd)]))
  )
  const [precioPorPais, setPrecioPorPais] = useState<Record<string, Record<string, string>>>(
    Object.fromEntries(plans.map(p => [
      p.id,
      Object.fromEntries(PAISES_TABLA.map(({ pais }) => [pais, String(p.precios_pais?.[pais] ?? '')])),
    ]))
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [busyPaises, setBusyPaises] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [tasas, setTasas] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    fetch('/api/superadmin/plans/tasas-pais')
      .then(res => res.json())
      .then(data => { if (data?.tasas) setTasas(data.tasas) })
      .catch(() => {})
  }, [])

  function anualEnVivo(planId: string): number {
    const precio = Number(valoresClp[planId]) || 0
    const mensualRedondeado = Math.round(precio / 10) * 10
    return mensualRedondeado * 10
  }

  // Precio que hoy se ve en el landing para ese país (el manual si hay uno cargado, si no la
  // conversión automática desde el USD del plan) junto a su equivalente en USD, para que el
  // admin compare antes de decidir si sube o baja el precio manual.
  function precioActualPais(planId: string, pais: string): { local: string; usd: string } | null {
    const moneda = PAIS_MONEDA[pais]
    const tasa = tasas?.[moneda?.codigo]
    if (!moneda || !tasa) return null

    const manual = Number(precioPorPais[planId]?.[pais])
    let valorLocal: number
    if (Number.isFinite(manual) && manual > 0) {
      valorLocal = manual
    } else {
      const usd = Number(valoresUsd[planId])
      if (!Number.isFinite(usd) || usd <= 0) return null
      valorLocal = usd * tasa
    }
    return { local: formatPrecioPais(valorLocal, pais), usd: (valorLocal / tasa).toFixed(2) }
  }

  async function guardar(plan: Plan) {
    const precioClp = Number(valoresClp[plan.id])
    const precioUsd = Number(valoresUsd[plan.id])
    if (!Number.isFinite(precioClp) || precioClp <= 0) {
      toast.error('Precio CLP inválido')
      return
    }
    if (!Number.isFinite(precioUsd) || precioUsd <= 0) {
      toast.error('Precio USD inválido')
      return
    }
    setBusy(plan.id)
    try {
      const res = await fetch(`/api/superadmin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precio_mensual: precioClp, precio_mensual_usd: precioUsd }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); return }
      if (data.plan?.precios_pais) {
        setPrecioPorPais(prev => ({
          ...prev,
          [plan.id]: Object.fromEntries(PAISES_TABLA.map(({ pais }) => [pais, String(data.plan.precios_pais?.[pais] ?? '')])),
        }))
      }
      toast.success(`${plan.nombre} actualizado`)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setBusy(null)
    }
  }

  async function guardarPorPais(plan: Plan) {
    const precios: Record<string, number> = {}
    for (const { pais } of PAISES_TABLA) {
      const valor = Number(precioPorPais[plan.id]?.[pais])
      if (Number.isFinite(valor) && valor > 0) precios[pais] = valor
    }
    setBusyPaises(plan.id)
    try {
      const res = await fetch(`/api/superadmin/plans/${plan.id}/precios-pais`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precios_pais: precios }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); return }
      toast.success(`Precios por país de ${plan.nombre} guardados`)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setBusyPaises(null)
    }
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
              <th className="px-4 py-3 font-medium">Precio USD /mes</th>
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
                        value={valoresClp[p.id] ?? ''}
                        onChange={e => setValoresClp(v => ({ ...v, [p.id]: e.target.value }))}
                        className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">${anualEnVivo(p.id).toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 text-xs">US$</span>
                      <input
                        type="number" min="0" step="0.5"
                        value={valoresUsd[p.id] ?? ''}
                        onChange={e => setValoresUsd(v => ({ ...v, [p.id]: e.target.value }))}
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                        className="text-[#C05010] hover:underline text-xs font-medium"
                      >
                        {expandido === p.id ? 'Ocultar' : 'Ver por país'}
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
                {expandido === p.id && (
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <td colSpan={5} className="px-4 py-4">
                      <p className="text-xs text-gray-500 mb-3">
                        Precio manual por país (moneda local). Estos valores son el precio real
                        que verá el visitante de ese país. Si se deja vacío, se usa la conversión
                        automática hasta que guardes un valor. Chile y los países dolarizados
                        (EE.UU., Ecuador, El Salvador, Panamá) no aparecen aquí porque usan
                        directamente el precio en CLP o USD de arriba.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-4 mb-4">
                        {['Sudamérica', 'Brasil', 'Centroamérica', 'Norteamérica', 'Europa'].map(region => {
                          const items = PAISES_TABLA.filter(d => d.region === region)
                          if (items.length === 0) return null
                          return (
                            <div key={region} className="space-y-1.5">
                              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{region}</p>
                              {items.map(item => {
                                const actual = precioActualPais(p.id, item.pais)
                                return (
                                <div key={item.pais} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="text-gray-500">{item.nombre}</span>
                                  <div className="flex items-center gap-1.5">
                                    {actual && (
                                      <span className="text-gray-400 whitespace-nowrap" title="Precio actual en el landing (manual o automático) y su equivalente en USD">
                                        {actual.local} · US${actual.usd}
                                      </span>
                                    )}
                                    <input
                                      type="number" min="0" step="any"
                                      placeholder="auto"
                                      value={precioPorPais[p.id]?.[item.pais] ?? ''}
                                      onChange={e => setPrecioPorPais(v => ({
                                        ...v,
                                        [p.id]: { ...v[p.id], [item.pais]: e.target.value },
                                      }))}
                                      className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 focus:border-[#FF7A1A]"
                                    />
                                  </div>
                                </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => guardarPorPais(p)}
                        disabled={busyPaises === p.id}
                        className="bg-[#FF7A1A]/10 hover:bg-[#FF7A1A]/20 text-[#C05010] border border-[#FF7A1A]/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {busyPaises === p.id ? '...' : 'Guardar precios por país'}
                      </button>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 px-4 py-3 border-t border-gray-100">
        El precio en CLP y el precio en USD se editan de forma independiente. Al cambiar y
        guardar el precio en USD, todos los precios manuales por país se recalculan desde ese
        nuevo valor (se pierden los ajustes manuales anteriores) — luego puedes volver a
        ajustarlos país por país en &quot;Ver por país&quot;.
      </p>
    </div>
  )
}
