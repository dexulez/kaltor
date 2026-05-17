'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCLP } from '@/lib/calculations'

const TZ = 'America/Santiago'

interface OTComision {
  id: string
  numero_ot: string
  precio_servicio: number
  tipo_reparacion: string | null
  metodo_pago: string | null
  costoRep: number
  comBanco: number
  base: number
  pct: number
  comision: number
  ganancia: number
  equipo: string
}

interface Props {
  userId: string
  ivaRate?: number
  comisionDebito?: number
  comisionCredito?: number
}

export default function MisComisionesHoy({ userId, ivaRate = 19, comisionDebito = 1.5, comisionCredito = 2.5 }: Props) {
  const supabase = createClient()
  const [ots, setOts] = useState<OTComision[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())

  useEffect(() => {
    async function cargar() {
      setLoading(true)
      // OTs entregadas hoy por este técnico
      const [{ data: otsRaw }, { data: perfil }] = await Promise.all([
        supabase.from('repair_orders')
          .select('id, numero_ot, precio_servicio, tipo_reparacion, metodo_pago, equipment(marca, modelo)')
          .eq('tecnico_id', userId)
          .eq('estado', 'entregado')
          .gte('fecha_entrega', `${hoy}T00:00:00.000Z`)
          .lte('fecha_entrega', `${hoy}T23:59:59.999Z`),
        supabase.from('user_profiles')
          .select('comision_base, comision_pantalla, comision_bateria, comision_placa, comision_software, comision_camara, comision_conector, comision_otro')
          .eq('id', userId).single(),
      ])

      const otIds = (otsRaw ?? []).map(o => o.id)
      let costosPorOT: Record<string, number> = {}
      if (otIds.length > 0) {
        const { data: items } = await supabase.from('repair_items')
          .select('repair_order_id, cantidad, precio_costo, costo_envio')
          .in('repair_order_id', otIds)
        ;(items ?? []).forEach(it => {
          costosPorOT[it.repair_order_id] = (costosPorOT[it.repair_order_id] ?? 0) + (it.cantidad ?? 1) * (it.precio_costo ?? 0) + (it.costo_envio ?? 0)
        })
      }

      const p = perfil as Record<string, number> | null
      const pctPorTipo: Record<string, number> = {
        pantalla: p?.comision_pantalla ?? 0, bateria: p?.comision_bateria ?? 0,
        placa: p?.comision_placa ?? 0, software: p?.comision_software ?? 0,
        camara: p?.comision_camara ?? 0, conector: p?.comision_conector ?? 0,
      }
      const pctBase = p?.comision_base ?? 0

      const lista: OTComision[] = (otsRaw ?? []).map(o => {
        const eqRaw = o.equipment as unknown
        const eq = Array.isArray(eqRaw) ? (eqRaw[0] as { marca: string; modelo: string } | undefined) ?? null : eqRaw as { marca: string; modelo: string } | null
        const bruto = o.precio_servicio ?? 0
        const neto = Math.round(bruto / (1 + ivaRate / 100))
        const costoRep = costosPorOT[o.id] ?? 0
        const metodo = o.metodo_pago ?? ''
        const pctBco = metodo === 'credito' ? comisionCredito : metodo === 'debito' ? comisionDebito : 0
        const comBanco = Math.round(bruto * pctBco / 100)
        const base = Math.max(0, neto - costoRep - comBanco)
        const tipo = o.tipo_reparacion ?? ''
        const pct = (pctPorTipo[tipo] ?? 0) > 0 ? (pctPorTipo[tipo] ?? 0) : pctBase
        const comision = Math.round(base * pct / 100)
        return {
          id: o.id, numero_ot: o.numero_ot, precio_servicio: bruto,
          tipo_reparacion: tipo || null, metodo_pago: metodo || null,
          equipo: eq ? `${eq.marca} ${eq.modelo}` : '—',
          costoRep, comBanco, base, pct, comision, ganancia: base - comision,
        }
      })

      setOts(lista)
      setLoading(false)
    }
    cargar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hoy])

  const totalComision = ots.reduce((s, o) => s + o.comision, 0)
  const totalBruto    = ots.reduce((s, o) => s + o.precio_servicio, 0)
  const totalBase     = ots.reduce((s, o) => s + o.base, 0)

  if (loading) return <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 animate-pulse h-20" />

  return (
    <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
      {/* Header */}
      <div
        className="bg-purple-700 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div>
          <p className="font-bold text-sm">💼 Mis comisiones hoy</p>
          <p className="text-xs text-purple-200">{ots.length} OT{ots.length !== 1 ? 's' : ''} entregada{ots.length !== 1 ? 's' : ''} · {new Date().toLocaleDateString('es-CL')}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{formatCLP(totalComision)}</p>
          <p className="text-xs text-purple-200">{expanded ? '▲ Ocultar' : '▼ Ver detalle'}</p>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 divide-x border-b">
        {[
          { label: 'Bruto generado', value: formatCLP(totalBruto), color: 'text-gray-900' },
          { label: 'Base de comisión', value: formatCLP(totalBase), color: 'text-blue-700' },
          { label: 'Mi comisión', value: formatCLP(totalComision), color: 'text-purple-700 font-bold text-lg' },
        ].map((k, i) => (
          <div key={i} className="px-3 py-2.5 text-center">
            <p className="text-xs text-gray-500 mb-0.5">{k.label}</p>
            <p className={`text-base font-semibold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Detalle OT por OT */}
      {expanded && (
        <div>
          {ots.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">Sin OTs entregadas hoy</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['OT', 'Equipo', 'Bruto', 'Repuestos', 'Com.banco', 'Base', '%', 'Mi comisión'].map((h, i) => (
                      <th key={i} className={`px-3 py-2 text-gray-500 font-medium ${i <= 1 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ots.map(o => (
                    <tr key={o.id} className="hover:bg-purple-50">
                      <td className="px-3 py-2 font-mono font-semibold text-blue-700">{o.numero_ot}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[120px] truncate">{o.equipo}</td>
                      <td className="px-3 py-2 text-right">{formatCLP(o.precio_servicio)}</td>
                      <td className="px-3 py-2 text-right text-red-600">-{formatCLP(o.costoRep)}</td>
                      <td className="px-3 py-2 text-right text-orange-600">-{formatCLP(o.comBanco)}</td>
                      <td className="px-3 py-2 text-right text-blue-700">{formatCLP(o.base)}</td>
                      <td className="px-3 py-2 text-right">{o.pct}%</td>
                      <td className="px-3 py-2 text-right font-bold text-purple-700">{formatCLP(o.comision)}</td>
                    </tr>
                  ))}
                  <tr className="bg-purple-50 font-semibold border-t-2 border-purple-200">
                    <td colSpan={6} className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right">—</td>
                    <td className="px-3 py-2 text-right text-purple-700 text-sm">{formatCLP(totalComision)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-2 border-t bg-purple-50 text-xs text-purple-700">
            Base = Neto (sin IVA) − Repuestos − Comisión bancaria · Tu comisión = Base × % configurado por tipo de reparación
          </div>
        </div>
      )}
    </div>
  )
}
