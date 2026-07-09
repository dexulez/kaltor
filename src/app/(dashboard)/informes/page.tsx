import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCLP, calcularPrecioSinIva, calcularIva } from '@/lib/calculations'
import { Suspense, type ReactNode } from 'react'
import FiltroFechas from '@/components/informes/FiltroFechas'
import {
  GraficoBarrasCLP,
  GraficoBarrasNum,
  GraficoPastel,
  GraficoArea,
} from '@/components/informes/Charts'
import ExportButtons from '@/components/informes/ExportButtons'
import ImprimirInformeTecnico from '@/components/informes/ImprimirInformeTecnico'
import AuditoriaLog from '@/components/informes/AuditoriaLog'
import { tieneSubPermiso, type ModuloNegocio } from '@/lib/modulos'

// Módulo requerido para cada pestaña de Informes (null = siempre disponible)
const MODULO_POR_TAB: Record<string, ModuloNegocio | null> = {
  resumen: null,
  ventas: 'ventas',
  taller: 'taller',
  clientes: null,
  inventario: null,
  rentabilidad: 'taller',
  servicios: 'servicios',
  compras: 'compras',
  gastos: null,
  auditoria: null,
  equilibrio: null,
  movimientos: 'contabilidad',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function hace30Dias() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return formatDate(d)
}

function kpiColor(idx: number) {
  const c = ['text-blue-700','text-green-700','text-orange-600','text-purple-700','text-rose-700','text-cyan-700']
  return c[idx % c.length]
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, colorIdx = 0, href }: { label: string; value: string; sub?: string; colorIdx?: number; href?: string }) {
  const content = (
    <div className={`bg-white rounded-xl border p-4 h-full ${href ? 'hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer' : ''}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${kpiColor(colorIdx)}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {href && <p className="text-xs text-blue-600 mt-2">Ver detalle →</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-gray-50 border-b px-4 py-3">
        <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Tabla({ headers, rows }: { headers: string[]; rows: (string | number | ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={`px-3 py-2 text-gray-500 font-medium text-xs ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="px-3 py-6 text-center text-gray-400 text-xs">Sin datos en el período</td></tr>
          ) : rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-gray-50">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-3 py-2 ${ci === 0 ? '' : 'text-right font-medium'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Helpers adicionales ───────────────────────────────────────────────────────

function variacion(actual: number, anterior: number): { pct: string; color: string } {
  if (!anterior) return { pct: '—', color: 'text-gray-400' }
  const pct = Math.round((actual - anterior) * 100 / anterior)
  return {
    pct: pct >= 0 ? `+${pct}%` : `${pct}%`,
    color: pct >= 0 ? 'text-green-600' : 'text-red-600',
  }
}

function KpiCardComp({ label, value, sub, colorIdx = 0, prev, prevLabel, href }: {
  label: string; value: string; sub?: string; colorIdx?: number
  prev?: { value: string; pct: string; color: string }; prevLabel?: string; href?: string
}) {
  const content = (
    <div className={`bg-white rounded-xl border p-4 h-full ${href ? 'hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer' : ''}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${kpiColor(colorIdx)}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {prev && (
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5">
          <span className={`text-xs font-bold ${prev.color}`}>{prev.pct}</span>
          <span className="text-xs text-gray-400">vs {prevLabel ?? 'período anterior'}</span>
        </div>
      )}
      {href && <p className="text-xs text-blue-600 mt-2">Ver detalle →</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

// ── Tab: Resumen General ──────────────────────────────────────────────────────

async function TabResumen({ desde, hasta, puedeExportar, tieneTaller }: { desde: string; hasta: string; puedeExportar: boolean; tieneTaller: boolean }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  // Período anterior (misma duración)
  const diasPeriodo = Math.max(1, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000))
  const prevHastaDate = new Date(new Date(desde).getTime() - 86400000)
  const prevDesdeDate = new Date(prevHastaDate.getTime() - (diasPeriodo - 1) * 86400000)
  const prevDesdeIso = `${prevDesdeDate.toISOString().split('T')[0]}T00:00:00.000Z`
  const prevHastaIso = `${prevHastaDate.toISOString().split('T')[0]}T23:59:59.999Z`

  const [
    { data: ventasAct },   { data: ventasPrev },
    { data: reparAct },    { data: reparActivasNow },
    { data: gastosAct },   { data: gastosPrev },
    { data: stockCrit },   { data: clientesNuevos },
    { data: repItemsAct },
  ] = await Promise.all([
    supabase.from('sales').select('total, created_at, tipo, repair_order_id').eq('anulada', false).gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('sales').select('total').eq('anulada', false).gte('created_at', prevDesdeIso).lte('created_at', prevHastaIso),
    supabase.from('repair_orders').select('estado, precio_servicio, resultado, fecha_estimada_entrega, created_at').gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('repair_orders').select('estado, fecha_estimada_entrega').not('estado', 'in', '(entregado,cancelado,en_garantia)'),
    supabase.from('gastos').select('monto').gte('fecha', desde).lte('fecha', hasta).then(r => r.error ? { data: [] } : r),
    supabase.from('gastos').select('monto').gte('fecha', prevDesdeDate.toISOString().split('T')[0]).lte('fecha', prevHastaDate.toISOString().split('T')[0]).then(r => r.error ? { data: [] } : r),
    supabase.from('products').select('id').eq('activo', true).lte('stock_actual', 5).gt('stock_actual', 0),
    supabase.from('customers').select('id').gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('repair_items').select('repair_order_id, cantidad, precio_costo, costo_envio').gte('created_at', desdeIso).lte('created_at', hastaIso),
  ])

  // Ventas
  const ventaActTotal = (ventasAct ?? []).reduce((s: number, v: Record<string, unknown>) => s + (v.total as number), 0)
  const ventaPrevTotal = (ventasPrev ?? []).reduce((s: number, v: Record<string, unknown>) => s + (v.total as number), 0)

  // Utilidad estimada actual
  const costoRepPorOT: Record<string, number> = {}
  ;(repItemsAct ?? []).forEach((it: Record<string, unknown>) => {
    const k = it.repair_order_id as string
    costoRepPorOT[k] = (costoRepPorOT[k] ?? 0) + (it.cantidad as number ?? 1) * (it.precio_costo as number ?? 0) + (it.costo_envio as number ?? 0)
  })
  const netoAct = Math.round(ventaActTotal / 1.19)
  const ppmAct  = Math.round(netoAct * 0.03)
  const costoRepAct = (ventasAct ?? []).filter((v: Record<string, unknown>) => v.tipo === 'reparacion').reduce((s: number, v: Record<string, unknown>) => s + (costoRepPorOT[v.repair_order_id as string] ?? 0), 0)
  const utilidadEst = netoAct - ppmAct - costoRepAct
  const netoPrev    = Math.round(ventaPrevTotal / 1.19)
  const ppmPrev     = Math.round(netoPrev * 0.03)
  const utilidadPrev = netoPrev - ppmPrev

  // Gastos
  const gastosActTotal  = (gastosAct ?? []).reduce((s: number, g: Record<string, unknown>) => s + (g.monto as number ?? 0), 0)
  const gastosPrevTotal = (gastosPrev ?? []).reduce((s: number, g: Record<string, unknown>) => s + (g.monto as number ?? 0), 0)

  // Reparaciones
  type RR = { estado: string; precio_servicio: number | null; resultado: string | null; fecha_estimada_entrega: string | null; created_at: string }
  const reps = (reparAct ?? []) as unknown as RR[]
  const entregadasP = reps.filter(r => r.estado === 'entregado').length
  const conResult   = reps.filter(r => r.resultado === 'exitosa' || r.resultado === 'no_exitosa')
  const exitosasP   = conResult.filter(r => r.resultado === 'exitosa').length
  const tasaP       = conResult.length ? Math.round(exitosasP * 100 / conResult.length) : null

  // OTs activas ahora
  type RA = { estado: string; fecha_estimada_entrega: string | null }
  const activasAhora = (reparActivasNow ?? []) as unknown as RA[]
  const hoy = new Date().toISOString().split('T')[0]
  const fueraPlazoAhora = activasAhora.filter(r => r.fecha_estimada_entrega && r.fecha_estimada_entrega < hoy).length
  const listasAhora = activasAhora.filter(r => r.estado === 'listo' || r.estado === 'para_entrega').length

  // Gráfico ventas diarias
  const porDia: Record<string, number> = {}
  ;(ventasAct ?? []).forEach((v: Record<string, unknown>) => {
    const d = (v.created_at as string).split('T')[0]
    porDia[d] = (porDia[d] ?? 0) + (v.total as number)
  })
  const areaVentas = Object.entries(porDia).sort().map(([fecha, total]) => ({ fecha: fecha.slice(5), total }))

  const vVar = variacion(ventaActTotal, ventaPrevTotal)
  const uVar = variacion(utilidadEst, utilidadPrev)
  const gVar = variacion(gastosActTotal, gastosPrevTotal)

  const rango = `desde=${desde}&hasta=${hasta}`
  const tabHref = (tab: string) => `/informes?tab=${tab}&${rango}`

  const comparativaData = [
    { label: 'Ventas brutas',      actual: ventaActTotal, prev: ventaPrevTotal, fmt: 'clp' as const },
    { label: 'Utilidad estimada',  actual: utilidadEst,   prev: utilidadPrev,   fmt: 'clp' as const },
    { label: 'Gastos',             actual: gastosActTotal, prev: gastosPrevTotal, fmt: 'clp' as const },
    ...(tieneTaller ? [{ label: 'OTs recibidas', actual: reps.length, prev: 0, fmt: 'num' as const }] : []),
  ]
  const comparativaRows = comparativaData.map(row => {
    const v = variacion(row.actual, row.prev)
    return [
      row.label,
      row.fmt === 'clp' ? formatCLP(row.prev) : (row.prev || '—'),
      row.fmt === 'clp' ? formatCLP(row.actual) : row.actual,
      v.pct,
    ]
  })
  const kpiRows = [
    ['Ventas brutas', formatCLP(ventaActTotal)],
    ['Utilidad estimada', formatCLP(utilidadEst)],
    ['Gastos del período', formatCLP(gastosActTotal)],
    ['Balance estimado', formatCLP(utilidadEst - gastosActTotal)],
    ...(tieneTaller ? [['OTs recibidas', reps.length], ['Tasa de éxito', tasaP !== null ? `${tasaP}%` : '—']] : []),
    ['Clientes nuevos', (clientesNuevos ?? []).length],
    ['Stock crítico', (stockCrit ?? []).length],
  ]

  return (
    <div className="space-y-5">

      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Resumen general"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'KPIs', headers: ['Métrica', 'Valor'], rows: kpiRows },
            { titulo: 'Comparativa vs período anterior', headers: ['Métrica', 'Período anterior', 'Período actual', 'Variación'], rows: comparativaRows },
          ]}
        />
      </div>

      {/* KPIs financieros con comparativa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCardComp
          label="Ventas brutas" value={formatCLP(ventaActTotal)}
          sub={`${(ventasAct ?? []).length} transacciones`} colorIdx={0}
          prev={{ value: formatCLP(ventaPrevTotal), pct: vVar.pct, color: vVar.color }}
          href={tabHref('ventas')}
        />
        <KpiCardComp
          label="Utilidad estimada" value={formatCLP(utilidadEst)}
          sub="neto − PPM − repuestos" colorIdx={1}
          prev={{ value: formatCLP(utilidadPrev), pct: uVar.pct, color: uVar.color }}
          href={tabHref('rentabilidad')}
        />
        <KpiCardComp
          label="Gastos del período" value={formatCLP(gastosActTotal)}
          sub="gastos operacionales" colorIdx={4}
          prev={{ value: formatCLP(gastosPrevTotal), pct: gVar.pct, color: gVar.color }}
          href={tabHref('gastos')}
        />
        <KpiCardComp
          label="Balance estimado" value={formatCLP(utilidadEst - gastosActTotal)}
          sub="utilidad − gastos" colorIdx={utilidadEst - gastosActTotal >= 0 ? 1 : 4}
          href={tabHref('equilibrio')}
        />
      </div>

      {/* KPIs operacionales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tieneTaller && (
          <>
            <KpiCard label="OTs recibidas" value={`${reps.length}`} sub={`${entregadasP} entregadas`} colorIdx={0} href={tabHref('taller')} />
            <KpiCard label="Tasa de éxito" value={tasaP !== null ? `${tasaP}%` : '—'} sub={`${exitosasP} de ${conResult.length} con resultado`} colorIdx={tasaP !== null && tasaP >= 80 ? 1 : tasaP !== null && tasaP >= 60 ? 2 : 4} href={tabHref('taller')} />
          </>
        )}
        <KpiCard label="Clientes nuevos" value={`${(clientesNuevos ?? []).length}`} sub="registrados en el período" colorIdx={5} href={tabHref('clientes')} />
        <KpiCard label="Stock crítico" value={`${(stockCrit ?? []).length}`} sub="productos con stock ≤ 5" colorIdx={4} href={tabHref('inventario')} />
      </div>

      {/* Estado actual del taller */}
      {tieneTaller && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-50 border-b px-4 py-3">
            <h2 className="font-semibold text-gray-800 text-sm">Estado actual del taller (tiempo real)</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0">
            {[
              { label: 'OTs en proceso', value: activasAhora.length - listasAhora, icon: '🔧', color: 'text-blue-700', href: '/reparaciones' },
              { label: 'Listas para cobrar', value: listasAhora, icon: '✅', color: 'text-green-700', href: '/reparaciones?vista=por_cobrar' },
              { label: 'Fuera de plazo', value: fueraPlazoAhora, icon: '⏰', color: fueraPlazoAhora > 0 ? 'text-red-600' : 'text-gray-400', href: '/reparaciones?vista=fuera_plazo' },
              { label: 'Total activas', value: activasAhora.length, icon: '📋', color: 'text-gray-700', href: '/reparaciones' },
            ].map((item, i) => (
              <Link key={i} href={item.href} className="px-5 py-4 text-center hover:bg-gray-50 transition-colors">
                <p className="text-2xl mb-1">{item.icon}</p>
                <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tendencia de ventas */}
      {areaVentas.length > 1 && (
        <Section title="Tendencia de ventas en el período">
          <GraficoArea data={areaVentas} dataKey="total" nameKey="fecha" height={200} />
        </Section>
      )}

      {/* Comparativa numérica */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 border-b px-4 py-3">
          <h2 className="font-semibold text-gray-800 text-sm">Comparativa período actual vs período anterior</h2>
          <p className="text-xs text-gray-400 mt-0.5">Período anterior: {prevDesdeDate.toISOString().split('T')[0]} → {prevHastaDate.toISOString().split('T')[0]}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Métrica', 'Período anterior', 'Período actual', 'Variación'].map((h, i) => (
                  <th key={i} className={`px-4 py-2.5 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {comparativaData.map((row, i) => {
                const v = variacion(row.actual, row.prev)
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.label}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{row.fmt === 'clp' ? formatCLP(row.prev) : row.prev || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{row.fmt === 'clp' ? formatCLP(row.actual) : row.actual}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${v.color}`}>{v.pct}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

// ── Tab: Ventas ───────────────────────────────────────────────────────────────

async function TabVentas({ desde, hasta, puedeExportar, tieneTaller }: { desde: string; hasta: string; puedeExportar: boolean; tieneTaller: boolean }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const [{ data: ventas }, { data: saleItemsRaw }] = await Promise.all([
    supabase.from('sales').select('id, numero_venta, tipo, total, metodo_pago, tipo_documento, created_at, anulada, repair_order_id, comision_bancaria, customer_id, customers(nombre)').gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('sale_items').select('sale_id, nombre, cantidad, precio_unitario, precio_costo, subtotal').gte('created_at', desdeIso).lte('created_at', hastaIso),
  ])

  const activas = (ventas ?? []).filter((v: Record<string, unknown>) => !v.anulada)
  const anuladas = (ventas ?? []).filter((v: Record<string, unknown>) => v.anulada)
  const totalBruto = activas.reduce((s: number, v: Record<string, unknown>) => s + (v.total as number), 0)
  const iva = Math.round(totalBruto - totalBruto / 1.19)
  const neto = totalBruto - iva
  const ppm = Math.round(neto * 0.03)
  // utilidadNeta calculada más abajo como utilRealTotal
  const ticket = activas.length ? Math.round(totalBruto / activas.length) : 0

  // Costos de productos por venta (para venta directa)
  const costoPorVenta: Record<string, number> = {}
  ;(saleItemsRaw ?? []).forEach(it => {
    costoPorVenta[it.sale_id] = (costoPorVenta[it.sale_id] ?? 0) + (it.precio_costo ?? 0) * (it.cantidad ?? 1)
  })

  // Obtener costos de repuestos para ventas de taller
  const idsOT = activas
    .filter((v: Record<string, unknown>) => v.tipo === 'reparacion' && v.repair_order_id)
    .map((v: Record<string, unknown>) => v.repair_order_id as string)

  let costoRepPorOT: Record<string, number> = {}
  let costoEnvioPorOT: Record<string, number> = {}
  let costoPiezasPorOT: Record<string, number> = {}
  if (idsOT.length > 0) {
    const { data: repItems } = await supabase.from('repair_items')
      .select('repair_order_id, cantidad, precio_costo, costo_envio')
      .in('repair_order_id', idsOT)
    ;(repItems ?? []).forEach(ri => {
      const pieza = (ri.cantidad ?? 1) * (ri.precio_costo ?? 0)
      const envio = ri.costo_envio ?? 0
      costoPiezasPorOT[ri.repair_order_id] = (costoPiezasPorOT[ri.repair_order_id] ?? 0) + pieza
      costoEnvioPorOT[ri.repair_order_id]  = (costoEnvioPorOT[ri.repair_order_id]  ?? 0) + envio
      costoRepPorOT[ri.repair_order_id]    = (costoRepPorOT[ri.repair_order_id]    ?? 0) + pieza + envio
    })
  }

  // Desglose diario con costos
  type DiaRow = { bruto: number; costo: number; banco: number; util: number }
  const porDiaCostos: Record<string, DiaRow> = {}
  activas.forEach((v: Record<string, unknown>) => {
    const d = (v.created_at as string).split('T')[0]
    if (!porDiaCostos[d]) porDiaCostos[d] = { bruto: 0, costo: 0, banco: 0, util: 0 }
    const bruto = v.total as number
    const costo = v.tipo === 'reparacion'
      ? (costoRepPorOT[v.repair_order_id as string] ?? 0)
      : (costoPorVenta[v.id as string] ?? 0)
    const banco = (v.comision_bancaria as number) ?? 0
    const neto = Math.round(bruto / 1.19)
    const ppm = Math.round(neto * 0.03)
    porDiaCostos[d].bruto += bruto
    porDiaCostos[d].costo += costo
    porDiaCostos[d].banco += banco
    porDiaCostos[d].util  += neto - ppm - costo - banco
  })

  const porDia: Record<string, number> = {}
  activas.forEach((v: Record<string, unknown>) => {
    const d = (v.created_at as string).split('T')[0]
    porDia[d] = (porDia[d] ?? 0) + (v.total as number)
  })
  const areaData = Object.entries(porDia).sort().map(([fecha, total]) => ({ fecha, total }))

  const porMetodo: Record<string, number> = {}
  activas.forEach((v: Record<string, unknown>) => {
    const m = (v.metodo_pago as string) ?? 'otro'
    porMetodo[m] = (porMetodo[m] ?? 0) + (v.total as number)
  })
  const pieMetodo = Object.entries(porMetodo).map(([name, value]) => ({ name, value }))

  const topProd: Record<string, { nombre: string; qty: number; total: number }> = {}
  ;(saleItemsRaw ?? []).forEach(it => {
    const key = it.nombre ?? '—'
    if (!topProd[key]) topProd[key] = { nombre: key, qty: 0, total: 0 }
    topProd[key].qty += it.cantidad ?? 1
    topProd[key].total += it.subtotal ?? 0
  })
  const topProdRows = Object.values(topProd).sort((a, b) => b.total - a.total).slice(0, 10)
    .map(p => [p.nombre, p.qty, formatCLP(p.total)])

  // ── Taller vs Venta directa con costos reales ────────────────────────────
  const reparaciones = activas.filter((v: Record<string, unknown>) => v.tipo === 'reparacion')
  const directas     = activas.filter((v: Record<string, unknown>) => v.tipo === 'directa')

  const totRep = reparaciones.reduce((s: number, v: Record<string, unknown>) => s + (v.total as number), 0)
  const totDir = directas.reduce((s: number, v: Record<string, unknown>) => s + (v.total as number), 0)
  const netoRep = Math.round(totRep / 1.19); const ivaRep = totRep - netoRep; const ppmRep = Math.round(netoRep * 0.03)
  const netoDir = Math.round(totDir / 1.19); const ivaDir = totDir - netoDir; const ppmDir = Math.round(netoDir * 0.03)

  // Costos reales taller: repuestos + comisión bancaria
  const costoRepTaller = reparaciones.reduce((s: number, v: Record<string, unknown>) => s + (costoRepPorOT[v.repair_order_id as string] ?? 0), 0)
  const comBancoTaller = reparaciones.reduce((s: number, v: Record<string, unknown>) => s + ((v.comision_bancaria as number) ?? 0), 0)
  const utilRealTaller = netoRep - ppmRep - costoRepTaller - comBancoTaller

  // Costos reales venta directa: costo producto + comisión bancaria
  const costoProdDir = directas.reduce((s: number, v: Record<string, unknown>) => s + (costoPorVenta[v.id as string] ?? 0), 0)
  const comBancoDir  = directas.reduce((s: number, v: Record<string, unknown>) => s + ((v.comision_bancaria as number) ?? 0), 0)
  const utilRealDir  = netoDir - ppmDir - costoProdDir - comBancoDir

  const comBancoTotal = comBancoTaller + comBancoDir
  const costoTotal    = costoRepTaller + costoProdDir
  const utilRealTotal = neto - ppm - costoTotal - comBancoTotal

  // ── Por método de pago × canal ───────────────────────────────────────────
  const METODO_LABEL: Record<string, string> = {
    efectivo: '💵 Efectivo', transferencia: '🏦 Transferencia',
    debito: '💳 Débito', credito: '💳 Crédito',
  }
  type CanalNum = { taller: number; tallerN: number; directa: number; directaN: number }
  const porMetodoCanal: Record<string, CanalNum> = {}
  activas.forEach((v: Record<string, unknown>) => {
    const m = (v.metodo_pago as string) ?? 'otro'
    if (!porMetodoCanal[m]) porMetodoCanal[m] = { taller: 0, tallerN: 0, directa: 0, directaN: 0 }
    if (v.tipo === 'reparacion') { porMetodoCanal[m].taller += v.total as number; porMetodoCanal[m].tallerN++ }
    else { porMetodoCanal[m].directa += v.total as number; porMetodoCanal[m].directaN++ }
  })

  // ── Por tipo de documento × canal ────────────────────────────────────────
  const DOC_LABEL: Record<string, string> = {
    boleta: '🧾 Boleta', factura: '📄 Factura', presupuesto: '📋 Presupuesto',
  }
  const porDocCanal: Record<string, CanalNum> = {}
  activas.forEach((v: Record<string, unknown>) => {
    const d = (v.tipo_documento as string) ?? 'boleta'
    if (!porDocCanal[d]) porDocCanal[d] = { taller: 0, tallerN: 0, directa: 0, directaN: 0 }
    if (v.tipo === 'reparacion') { porDocCanal[d].taller += v.total as number; porDocCanal[d].tallerN++ }
    else { porDocCanal[d].directa += v.total as number; porDocCanal[d].directaN++ }
  })

  // ── Datos hoisteados para que la tabla visual y la exportación coincidan ──
  const tallerVsDirectaData = [
    { icono: '🔧', label: 'Taller',        count: reparaciones.length, bruto: totRep, neto: netoRep, iva: ivaRep, ppm: ppmRep, costo: costoRepTaller, banco: comBancoTaller, util: utilRealTaller },
    { icono: '🛒', label: 'Venta directa', count: directas.length,     bruto: totDir, neto: netoDir, iva: ivaDir, ppm: ppmDir, costo: costoProdDir,  banco: comBancoDir,  util: utilRealDir  },
    { icono: '',   label: 'TOTAL',         count: activas.length,      bruto: totalBruto, neto, iva, ppm, costo: costoTotal, banco: comBancoTotal, util: utilRealTotal },
  ]
  const metodoCanalOrdenado = Object.entries(porMetodoCanal).sort((a, b) => (b[1].taller + b[1].directa) - (a[1].taller + a[1].directa))
  const docCanalOrdenado = Object.entries(porDocCanal).sort((a, b) => (b[1].taller + b[1].directa) - (a[1].taller + a[1].directa))
  const porDiaCostosOrdenado = Object.entries(porDiaCostos).sort()
  const anuladasRows = anuladas.map((v: Record<string, unknown>) => [(v.created_at as string).split('T')[0], formatCLP(v.total as number), (v.metodo_pago as string) ?? '—'])

  type DetalleOpRow = { fecha: string; tipo: string; numero: string; cliente: string; bruto: number; pieza: number; envio: number; banco: number; util: number }
  const detalleOperacionesData: DetalleOpRow[] = activas.map((v: Record<string, unknown>) => {
    const esReparacion = v.tipo === 'reparacion'
    const bruto  = v.total as number
    const pieza  = esReparacion ? (costoPiezasPorOT[v.repair_order_id as string] ?? 0) : (costoPorVenta[v.id as string] ?? 0)
    const envio  = esReparacion ? (costoEnvioPorOT[v.repair_order_id as string] ?? 0) : 0
    const banco  = (v.comision_bancaria as number) ?? 0
    const netoV  = Math.round(bruto / 1.19)
    const ppmV   = Math.round(netoV * 0.03)
    const util   = netoV - ppmV - pieza - envio - banco
    const cli    = v.customers as Record<string, unknown> | null
    const nombre = Array.isArray(cli) ? ((cli[0]?.nombre as string) ?? '—') : ((cli?.nombre as string) ?? '—')
    return { fecha: (v.created_at as string).substring(0, 10), tipo: esReparacion ? 'OT' : 'Directa', numero: v.numero_venta as string, cliente: nombre, bruto, pieza, envio, banco, util }
  })

  const clienteMap: Record<string, { nombre: string; total: number; visitas: number }> = {}
  activas.forEach((v: Record<string, unknown>) => {
    const cid = v.customer_id as string | null
    if (!cid) return
    const cli = v.customers as { nombre?: string } | null
    const nom = cli?.nombre ?? '—'
    if (!clienteMap[cid]) clienteMap[cid] = { nombre: nom, total: 0, visitas: 0 }
    clienteMap[cid].total += v.total as number
    clienteMap[cid].visitas += 1
  })
  const topClientesRows = Object.values(clienteMap).sort((a, b) => b.total - a.total).slice(0, 10)

  const resumenVentasRows = [
    ['Total bruto', formatCLP(totalBruto)],
    ['Transacciones', activas.length],
    ['Neto (sin IVA 19%)', formatCLP(neto)],
    ['IVA 19%', formatCLP(iva)],
    ['PPM 3%', formatCLP(ppm)],
    ['Ticket promedio', formatCLP(ticket)],
    ['Utilidad real', formatCLP(utilRealTotal)],
  ]

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Ventas"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'Resumen', headers: ['Métrica', 'Valor'], rows: resumenVentasRows },
            ...(tieneTaller ? [
              { titulo: 'Taller vs Venta directa', headers: ['Canal', 'Transacc.', 'Bruto', 'Neto', 'IVA', 'PPM', 'Costo', 'Com. banco', 'Utilidad real'], rows: tallerVsDirectaData.map(r => [r.label, r.count, formatCLP(r.bruto), formatCLP(r.neto), formatCLP(r.iva), formatCLP(r.ppm), formatCLP(r.costo), formatCLP(r.banco), formatCLP(r.util)]) },
              { titulo: 'Por método de pago', headers: ['Método', 'Taller', 'Venta directa', 'Total'], rows: [...metodoCanalOrdenado.map(([m, v]) => [METODO_LABEL[m] ?? m, formatCLP(v.taller), formatCLP(v.directa), formatCLP(v.taller + v.directa)]), ['TOTAL', formatCLP(totRep), formatCLP(totDir), formatCLP(totalBruto)]] },
              { titulo: 'Por tipo de documento', headers: ['Tipo', 'Taller', 'Venta directa', 'Total'], rows: [...docCanalOrdenado.map(([d, v]) => [DOC_LABEL[d] ?? d, formatCLP(v.taller), formatCLP(v.directa), formatCLP(v.taller + v.directa)]), ['TOTAL', formatCLP(totRep), formatCLP(totDir), formatCLP(totalBruto)]] },
            ] : []),
            { titulo: 'Top productos', headers: ['Producto', 'Unidades', 'Total'], rows: topProdRows },
            { titulo: 'Utilidad real por día', headers: ['Día', 'Bruto', 'Costo', 'Com. banco', 'Utilidad real'], rows: porDiaCostosOrdenado.map(([dia, r]) => [dia, formatCLP(r.bruto), formatCLP(r.costo), formatCLP(r.banco), formatCLP(r.util)]) },
            { titulo: 'Detalle por operación', headers: ['Fecha', 'Tipo', 'N° Venta', 'Cliente', 'Cobrado', 'Costo piezas', 'Envío', 'Com. banco', 'Utilidad'], rows: detalleOperacionesData.map(d => [d.fecha, d.tipo, d.numero, d.cliente, formatCLP(d.bruto), d.pieza > 0 ? formatCLP(d.pieza) : '—', d.envio > 0 ? formatCLP(d.envio) : '—', d.banco > 0 ? formatCLP(d.banco) : '—', formatCLP(d.util)]) },
            { titulo: 'Top clientes', headers: ['#', 'Cliente', 'N° ventas', 'Total cobrado', '% del bruto'], rows: topClientesRows.map((c, i) => [i + 1, c.nombre, c.visitas, formatCLP(c.total), totalBruto ? `${Math.round(c.total * 100 / totalBruto)}%` : '—']) },
            ...(anuladasRows.length ? [{ titulo: 'Ventas anuladas', headers: ['Fecha', 'Monto', 'Método'], rows: anuladasRows }] : []),
          ]}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Total Bruto" value={formatCLP(totalBruto)} sub={`${activas.length} ventas`} colorIdx={0} />
        <KpiCard label="Neto (sin IVA 19%)" value={formatCLP(neto)} colorIdx={1} />
        <KpiCard label="Ticket promedio" value={formatCLP(ticket)} colorIdx={2} />
      </div>
      {/* Desglose impuestos → Utilidad Neta */}
      <div className="bg-white rounded-xl border p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Desglose impuestos y utilidad neta</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Ingreso Neto</p>
            <p className="text-lg font-bold text-blue-700">{formatCLP(neto)}</p>
          </div>
          <div className="flex items-center justify-center text-gray-400 font-bold text-xl">−</div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">IVA 19% (reservar)</p>
            <p className="text-lg font-bold text-red-500">{formatCLP(iva)}</p>
            <p className="text-xs text-gray-400">ya descontado del neto</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">PPM 3% s/neto</p>
            <p className="text-lg font-bold text-orange-500">{formatCLP(ppm)}</p>
            <p className="text-xs text-gray-400">pago provisional SII</p>
          </div>
          <div className="bg-green-50 border-2 border-green-400 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 font-semibold mb-1">= UTILIDAD REAL</p>
            <p className="text-2xl font-bold text-green-700">{formatCLP(utilRealTotal)}</p>
            <p className="text-xs text-gray-400">neto − PPM − costos − banco</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Utilidad real = Neto − PPM − Costo repuestos/productos − Comisiones bancarias.
          No incluye comisiones de técnicos ni gastos operacionales (ver Rentabilidad y Gastos).
        </p>
      </div>
      {tieneTaller && (
        <>
          {/* Taller vs Venta Directa — con costos reales */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-gray-50 border-b px-4 py-3">
              <h2 className="font-semibold text-gray-800 text-sm">🔧 Taller (reparaciones) vs 🛒 Venta directa — costos reales</h2>
              <p className="text-xs text-gray-400 mt-0.5">Taller descuenta repuestos · Venta directa descuenta costo del producto · Ambos descuentan comisión bancaria y PPM</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Canal', 'Transacc.', 'Bruto', 'Neto (sin IVA)', 'IVA 19%', 'PPM 3%', 'Costo (rep./prod.)', 'Com. banco', 'Utilidad real'].map((h, i) => (
                      <th key={i} className={`px-3 py-2 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tallerVsDirectaData.map((row, i) => (
                    <tr key={i} className={i === 2 ? 'bg-gray-50 font-semibold border-t-2 border-gray-300' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2.5">{row.icono} {row.label}</td>
                      <td className="px-3 py-2.5 text-right">{row.count}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-gray-900">{formatCLP(row.bruto)}</td>
                      <td className="px-3 py-2.5 text-right text-blue-700">{formatCLP(row.neto)}</td>
                      <td className="px-3 py-2.5 text-right text-red-500">{formatCLP(row.iva)}</td>
                      <td className="px-3 py-2.5 text-right text-orange-500">{formatCLP(row.ppm)}</td>
                      <td className="px-3 py-2.5 text-right text-red-600 font-medium">{formatCLP(row.costo)}</td>
                      <td className="px-3 py-2.5 text-right text-orange-600">{formatCLP(row.banco)}</td>
                      <td className={`px-3 py-2.5 text-right font-bold text-base ${row.util >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCLP(row.util)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t bg-amber-50 text-xs text-amber-800">
              <strong>Utilidad real</strong> = Neto − PPM − Costo (repuestos/productos) − Comisión bancaria.
              No incluye comisiones de técnicos (ver Rentabilidad) ni gastos operacionales.
            </div>
          </div>

          {/* Desglose por método de pago × canal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-gray-50 border-b px-4 py-3">
                <h2 className="font-semibold text-gray-800 text-sm">💳 Por método de pago</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Método', 'Taller (N)', 'Venta directa (N)', 'Total'].map((h, i) => (
                        <th key={i} className={`px-3 py-2 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {metodoCanalOrdenado.map(([m, v]) => (
                      <tr key={m} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{METODO_LABEL[m] ?? m}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-medium">{formatCLP(v.taller)}</span>
                          {v.tallerN > 0 && <span className="text-xs text-gray-400 ml-1">({v.tallerN})</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-medium">{formatCLP(v.directa)}</span>
                          {v.directaN > 0 && <span className="text-xs text-gray-400 ml-1">({v.directaN})</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-blue-700">{formatCLP(v.taller + v.directa)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold border-t-2">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right">{formatCLP(totRep)}</td>
                      <td className="px-3 py-2 text-right">{formatCLP(totDir)}</td>
                      <td className="px-3 py-2 text-right text-blue-700">{formatCLP(totalBruto)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Desglose por tipo de documento × canal */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="bg-gray-50 border-b px-4 py-3">
                <h2 className="font-semibold text-gray-800 text-sm">🧾 Por tipo de documento</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Tipo', 'Taller (N)', 'Venta directa (N)', 'Total'].map((h, i) => (
                        <th key={i} className={`px-3 py-2 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {docCanalOrdenado.map(([d, v]) => (
                      <tr key={d} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{DOC_LABEL[d] ?? d}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-medium">{formatCLP(v.taller)}</span>
                          {v.tallerN > 0 && <span className="text-xs text-gray-400 ml-1">({v.tallerN})</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-medium">{formatCLP(v.directa)}</span>
                          {v.directaN > 0 && <span className="text-xs text-gray-400 ml-1">({v.directaN})</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-blue-700">{formatCLP(v.taller + v.directa)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold border-t-2">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right">{formatCLP(totRep)}</td>
                      <td className="px-3 py-2 text-right">{formatCLP(totDir)}</td>
                      <td className="px-3 py-2 text-right text-blue-700">{formatCLP(totalBruto)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Section title="Ventas diarias"><GraficoArea data={areaData} dataKey="total" nameKey="fecha" height={220} /></Section>
        </div>
        <Section title="Por método de pago"><GraficoPastel data={pieMetodo} height={220} /></Section>
      </div>
      <Section title="Top 10 productos más vendidos">
        <Tabla headers={['Producto', 'Unidades', 'Total']} rows={topProdRows} />
      </Section>
      {anuladas.length > 0 && (
        <Section title={`Ventas anuladas (${anuladas.length})`}>
          <Tabla headers={['Fecha', 'Monto', 'Método']} rows={anuladasRows} />
        </Section>
      )}

      {/* ── Desglose diario de costos y utilidad ─────────────────────────── */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 border-b px-4 py-3">
          <h2 className="font-semibold text-gray-800 text-sm">📅 Utilidad real por día — con todos los gastos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Bruto − IVA − PPM − Costo producto/repuesto − Comisión bancaria</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Día', 'Bruto cobrado', 'Costo prod./rep.', 'Com. banco', 'Utilidad real'].map((h, i) => (
                  <th key={i} className={`px-3 py-2 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {porDiaCostosOrdenado.map(([dia, r]) => (
                <tr key={dia} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-700">{dia}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{formatCLP(r.bruto)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{formatCLP(r.costo)}</td>
                  <td className="px-3 py-2 text-right text-orange-600">{formatCLP(r.banco)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${r.util >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCLP(r.util)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold border-t-2">
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-3 py-2 text-right">{formatCLP(totalBruto)}</td>
                <td className="px-3 py-2 text-right text-red-600">{formatCLP(costoTotal)}</td>
                <td className="px-3 py-2 text-right text-orange-600">{formatCLP(comBancoTotal)}</td>
                <td className={`px-3 py-2 text-right font-bold text-lg ${utilRealTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCLP(utilRealTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detalle de gastos por cada operación ─────────────────────────── */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 border-b px-4 py-3">
          <h2 className="font-semibold text-gray-800 text-sm">💸 Detalle de gastos por operación ({activas.length} ventas)</h2>
          <p className="text-xs text-gray-400 mt-0.5">Cada venta con su desglose completo de costos y utilidad real</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Fecha', 'Tipo', 'N° Venta', 'Cliente', 'Cobrado', 'Costo piezas', 'Envío rep.', 'Com. banco', 'Utilidad'].map((h, i) => (
                  <th key={i} className={`px-3 py-2 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {detalleOperacionesData.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-400 text-xs">Sin ventas en el período</td></tr>
              ) : detalleOperacionesData.map((d, i) => {
                const esReparacion = d.tipo === 'OT'
                return (
                  <tr key={i} className={`hover:bg-gray-50 ${d.util < 0 ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2 text-xs text-gray-500">{d.fecha}</td>
                    <td className="px-3 py-2"><span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${esReparacion ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{esReparacion ? '🔧 OT' : '🛒 Directa'}</span></td>
                    <td className="px-3 py-2 font-mono text-xs text-right">{d.numero}</td>
                    <td className="px-3 py-2 text-xs max-w-[120px] truncate">{d.cliente}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCLP(d.bruto)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{d.pieza > 0 ? formatCLP(d.pieza) : '—'}</td>
                    <td className="px-3 py-2 text-right text-red-400">{d.envio > 0 ? formatCLP(d.envio) : '—'}</td>
                    <td className="px-3 py-2 text-right text-orange-600">{d.banco > 0 ? formatCLP(d.banco) : '—'}</td>
                    <td className={`px-3 py-2 text-right font-bold ${d.util >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCLP(d.util)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Top 10 clientes por ingresos ─────────────────────────────────── */}
      {topClientesRows.length > 0 && (
        <Section title="Top 10 clientes por ingresos en ventas">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['#', 'Cliente', 'N° ventas', 'Total cobrado', '% del bruto'].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-xs text-gray-500 font-medium ${i <= 1 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {topClientesRows.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 font-bold">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{c.nombre}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{c.visitas}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{formatCLP(c.total)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{totalBruto ? `${Math.round(c.total * 100 / totalBruto)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

    </div>
  )
}

// ── Tab: Taller ───────────────────────────────────────────────────────────────

async function TabTaller({ desde, hasta, puedeExportar }: { desde: string; hasta: string; puedeExportar: boolean }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const { data: ots } = await supabase
    .from('repair_orders')
    .select(`
      id, estado, tipo_reparacion, precio_servicio, presupuesto_estimado, tecnico_id,
      resultado, created_at, fecha_entrega, fecha_estimada_entrega,
      equipment(marca, modelo),
      tecnico:user_profiles(nombre_completo)
    `)
    .gte('created_at', desdeIso)
    .lte('created_at', hastaIso)

  type OTT = {
    id: string; estado: string; tipo_reparacion: string | null
    precio_servicio: number | null; presupuesto_estimado: number | null
    tecnico_id: string | null; resultado: string | null
    created_at: string; fecha_entrega: string | null; fecha_estimada_entrega: string | null
    equipment: { marca: string; modelo: string } | null
    tecnico: { nombre_completo: string } | null
  }
  const lista = (ots ?? []) as unknown as OTT[]

  // ── Métricas base ────────────────────────────────────────────────────────────
  const estadosFinales = new Set(['entregado', 'en_garantia', 'cancelado', 'rechazado'])
  const entregadas     = lista.filter(o => o.estado === 'entregado')
  const activas        = lista.filter(o => !estadosFinales.has(o.estado))

  // Tasa de éxito (solo OTs con resultado definido)
  const conResultado   = lista.filter(o => o.resultado === 'exitosa' || o.resultado === 'no_exitosa')
  const exitosas       = conResultado.filter(o => o.resultado === 'exitosa')
  const sinReparacion  = conResultado.filter(o => o.resultado === 'no_exitosa')
  const tasaExito      = conResultado.length ? Math.round(exitosas.length * 100 / conResultado.length) : null

  // Ingresos totales (entregadas + para_entrega)
  const ingresosTotal  = entregadas.reduce((s, o) => s + (o.precio_servicio ?? 0), 0)

  // Tiempo promedio de resolución
  const tiemposProm = entregadas.filter(o => o.fecha_entrega)
    .map(o => (new Date(o.fecha_entrega!).getTime() - new Date(o.created_at).getTime()) / 86400000)
  const promDias = tiemposProm.length
    ? (tiemposProm.reduce((a, b) => a + b, 0) / tiemposProm.length).toFixed(1) : '—'

  // OTs fuera de plazo (fecha_estimada_entrega < hoy, no cerradas)
  const hoy = new Date().toISOString().split('T')[0]
  const fueraPlazo = lista.filter(o =>
    o.fecha_estimada_entrega && o.fecha_estimada_entrega < hoy && !estadosFinales.has(o.estado)
  )

  // ── Agrupaciones para gráficos ───────────────────────────────────────────────

  // Por estado
  const porEstado: Record<string, number> = {}
  lista.forEach(o => { porEstado[o.estado] = (porEstado[o.estado] ?? 0) + 1 })
  const pieEstado = Object.entries(porEstado).map(([name, value]) => ({ name, value }))

  // Por tipo de reparación (cantidad)
  const porTipo: Record<string, number> = {}
  lista.forEach(o => { const f = o.tipo_reparacion ?? 'otro'; porTipo[f] = (porTipo[f] ?? 0) + 1 })
  const barFalla = Object.entries(porTipo).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // Tiempo promedio por tipo de reparación
  const tiempoPorTipo: Record<string, number[]> = {}
  entregadas.filter(o => o.fecha_entrega).forEach(o => {
    const tipo = o.tipo_reparacion ?? 'otro'
    const dias = (new Date(o.fecha_entrega!).getTime() - new Date(o.created_at).getTime()) / 86400000
    if (!tiempoPorTipo[tipo]) tiempoPorTipo[tipo] = []
    tiempoPorTipo[tipo].push(dias)
  })
  const barTiempoPorTipo = Object.entries(tiempoPorTipo)
    .map(([name, vals]) => ({ name, value: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) }))
    .sort((a, b) => b.value - a.value).slice(0, 8)

  // Tasa de éxito por tipo de reparación
  const exitoPorTipo: Record<string, { exitosa: number; no_exitosa: number }> = {}
  conResultado.forEach(o => {
    const tipo = o.tipo_reparacion ?? 'otro'
    if (!exitoPorTipo[tipo]) exitoPorTipo[tipo] = { exitosa: 0, no_exitosa: 0 }
    if (o.resultado === 'exitosa') exitoPorTipo[tipo].exitosa++
    else exitoPorTipo[tipo].no_exitosa++
  })
  const tasaExitoRows = Object.entries(exitoPorTipo)
    .map(([tipo, v]) => {
      const total = v.exitosa + v.no_exitosa
      const pct = Math.round(v.exitosa * 100 / total)
      return [tipo, total, v.exitosa, v.no_exitosa, `${pct}%`]
    })
    .sort((a, b) => (b[1] as number) - (a[1] as number))

  // Por técnico (detallado con tasa de éxito y tiempo promedio)
  const porTec: Record<string, {
    nombre: string; total: number; entregadas: number; exitosas: number
    noExitosas: number; sinResultado: number; ingresos: number; tiempos: number[]
  }> = {}
  lista.forEach(o => {
    const k = o.tecnico_id ?? 'sin_asignar'
    const nombre = o.tecnico?.nombre_completo ?? 'Sin asignar'
    if (!porTec[k]) porTec[k] = { nombre, total: 0, entregadas: 0, exitosas: 0, noExitosas: 0, sinResultado: 0, ingresos: 0, tiempos: [] }
    porTec[k].total++
    if (o.estado === 'entregado' || o.estado === 'para_entrega') {
      porTec[k].entregadas++
      porTec[k].ingresos += o.precio_servicio ?? 0
      if (o.resultado === 'exitosa') porTec[k].exitosas++
      else if (o.resultado === 'no_exitosa') porTec[k].noExitosas++
      else porTec[k].sinResultado++
      if (o.fecha_entrega) {
        const dias = (new Date(o.fecha_entrega).getTime() - new Date(o.created_at).getTime()) / 86400000
        porTec[k].tiempos.push(dias)
      }
    }
  })
  const tecRows = Object.values(porTec).sort((a, b) => b.entregadas - a.entregadas).map(t => {
    const conRes = t.exitosas + t.noExitosas
    const tasa = conRes > 0 ? `${Math.round(t.exitosas * 100 / conRes)}%` : '—'
    const promT = t.tiempos.length ? `${(t.tiempos.reduce((a, b) => a + b, 0) / t.tiempos.length).toFixed(1)}d` : '—'
    const promIng = t.entregadas > 0 ? formatCLP(Math.round(t.ingresos / t.entregadas)) : '—'
    return [t.nombre, t.total, t.entregadas, tasa, promT, formatCLP(t.ingresos), promIng]
  })

  // Por marca
  const porMarca: Record<string, number> = {}
  lista.forEach(o => { const m = o.equipment?.marca ?? 'Otra'; porMarca[m] = (porMarca[m] ?? 0) + 1 })
  const barMarca = Object.entries(porMarca).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // Tendencia diaria de OTs recibidas
  const porDia: Record<string, number> = {}
  lista.forEach(o => {
    const dia = o.created_at.split('T')[0]
    porDia[dia] = (porDia[dia] ?? 0) + 1
  })
  const tendenciaDiaria = Object.entries(porDia).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, value]) => ({ name: name.slice(5), value })) // "MM-DD"

  // OTs activas: desglose por tiempo sin movimiento
  const ahoraMs = Date.now()
  const enProcesoRows = activas
    .map(o => {
      const diasAbierta = Math.floor((ahoraMs - new Date(o.created_at).getTime()) / 86400000)
      const vencida = o.fecha_estimada_entrega && o.fecha_estimada_entrega < hoy
      return { o, diasAbierta, vencida }
    })
    .sort((a, b) => b.diasAbierta - a.diasAbierta)
    .slice(0, 15)
    .map(({ o, diasAbierta, vencida }) => [
      o.tecnico?.nombre_completo ?? 'Sin asignar',
      o.tipo_reparacion ?? 'otro',
      o.equipment?.marca ?? '—',
      o.estado,
      `${diasAbierta}d`,
      vencida ? '⚠️ Vencida' : (o.fecha_estimada_entrega ?? '—'),
    ])

  const kpiTallerRows = [
    ['Total OTs', lista.length],
    ['Entregadas', entregadas.length],
    ['Tiempo promedio (días)', promDias],
    ['Ingresos taller', formatCLP(ingresosTotal)],
    ['Reparadas OK', exitosas.length],
    ['Sin reparación', sinReparacion.length],
    ['En proceso', activas.length],
    ['Fuera de plazo', fueraPlazo.length],
    ['Tasa de éxito', tasaExito !== null ? `${tasaExito}%` : '—'],
  ]

  return (
    <div className="space-y-5">

      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Taller"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'KPIs', headers: ['Métrica', 'Valor'], rows: kpiTallerRows },
            { titulo: 'Tasa de éxito por tipo', headers: ['Tipo', 'Total', 'OK', 'Sin rep.', 'Éxito'], rows: tasaExitoRows },
            { titulo: 'Rendimiento por técnico', headers: ['Técnico', 'Asignadas', 'Entregadas', 'Tasa éxito', 'T. prom.', 'Ingresos', 'Prom./OT'], rows: tecRows },
            { titulo: 'OTs activas sin resolver', headers: ['Técnico', 'Tipo', 'Equipo', 'Estado', 'Días abierta', 'Entrega est.'], rows: enProcesoRows },
          ]}
        />
      </div>

      {/* ── KPIs principales ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total OTs" value={`${lista.length}`} sub={`${activas.length} activas`} colorIdx={0} />
        <KpiCard label="Entregadas" value={`${entregadas.length}`} sub={`${lista.length ? Math.round(entregadas.length * 100 / lista.length) : 0}% del total`} colorIdx={1} />
        <KpiCard label="Tiempo promedio" value={promDias === '—' ? '—' : `${promDias} días`} sub="recepción → entrega" colorIdx={2} />
        <KpiCard label="Ingresos taller" value={formatCLP(ingresosTotal)} sub={`${entregadas.length} OTs cobradas`} colorIdx={5} />
      </div>

      {/* ── Tasa de éxito (destacada) ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">Tasa de éxito de reparaciones</h2>
          {conResultado.length > 0 && (
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${tasaExito !== null && tasaExito >= 80 ? 'bg-green-100 text-green-700' : tasaExito !== null && tasaExito >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {tasaExito}% de éxito
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KpiCard label="✅ Reparadas OK" value={`${exitosas.length}`} sub={tasaExito !== null ? `${tasaExito}% éxito` : 'Sin datos aún'} colorIdx={1} />
            <KpiCard label="⚠️ Sin reparación" value={`${sinReparacion.length}`} sub={conResultado.length ? `${Math.round(sinReparacion.length * 100 / conResultado.length)}% del total` : '—'} colorIdx={4} />
            <KpiCard label="🔧 En proceso" value={`${activas.length}`} sub="aún sin resultado" colorIdx={0} />
            <KpiCard label="⏰ Fuera de plazo" value={`${fueraPlazo.length}`} sub="con fecha vencida" colorIdx={4} />
          </div>
          {/* Barra visual de tasa de éxito */}
          {conResultado.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Exitosas: {exitosas.length}</span>
                <span>Sin reparar: {sinReparacion.length}</span>
              </div>
              <div className="h-4 rounded-full bg-gray-100 overflow-hidden flex">
                <div className="bg-green-500 h-full transition-all" style={{ width: `${tasaExito ?? 0}%` }} />
                <div className="bg-red-400 h-full transition-all" style={{ width: `${conResultado.length ? Math.round(sinReparacion.length * 100 / conResultado.length) : 0}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">Solo incluye OTs con resultado registrado ({conResultado.length} de {lista.length} totales)</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Gráficos de distribución ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="OTs por estado">
          <GraficoPastel data={pieEstado} height={220} />
        </Section>
        <Section title="Tipo de reparación más frecuente">
          <GraficoBarrasNum data={barFalla} dataKey="value" nameKey="name" color="#8b5cf6" height={220} />
        </Section>
      </div>

      {/* ── Tendencia diaria ──────────────────────────────────────────────────── */}
      {tendenciaDiaria.length > 1 && (
        <Section title="Tendencia de OTs recibidas">
          <GraficoBarrasNum data={tendenciaDiaria} dataKey="value" nameKey="name" color="#3b82f6" height={200} />
        </Section>
      )}

      {/* ── Tiempo promedio y tasa de éxito por tipo ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {barTiempoPorTipo.length > 0 && (
          <Section title="Tiempo promedio de resolución por tipo (días)">
            <GraficoBarrasNum data={barTiempoPorTipo} dataKey="value" nameKey="name" color="#f59e0b" height={220} />
          </Section>
        )}
        <Section title="Tasa de éxito por tipo de reparación">
          <Tabla
            headers={['Tipo', 'Total', '✅ OK', '⚠️ Sin rep.', 'Éxito']}
            rows={tasaExitoRows.length ? tasaExitoRows : []}
          />
        </Section>
      </div>

      {/* ── Rendimiento por técnico (detallado) ──────────────────────────────── */}
      <Section title="Rendimiento por técnico">
        <Tabla
          headers={['Técnico', 'Asignadas', 'Entregadas', 'Tasa éxito', 'T. prom.', 'Ingresos', 'Prom./OT']}
          rows={tecRows}
        />
      </Section>

      {/* ── Marcas ────────────────────────────────────────────────────────────── */}
      <Section title="OTs por marca de equipo">
        <GraficoBarrasNum data={barMarca} dataKey="value" nameKey="name" color="#06b6d4" height={200} />
      </Section>

      {/* ── OTs activas con más tiempo abierto ───────────────────────────────── */}
      {enProcesoRows.length > 0 && (
        <Section title="OTs activas — más tiempo sin resolver (top 15)">
          <Tabla
            headers={['Técnico', 'Tipo', 'Equipo', 'Estado', 'Días abierta', 'Entrega est.']}
            rows={enProcesoRows}
          />
        </Section>
      )}

    </div>
  )
}

// ── Tab: Inventario ───────────────────────────────────────────────────────────

async function TabInventario({ desde, hasta, puedeExportar }: { desde: string; hasta: string; puedeExportar: boolean }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const hace60Iso = new Date(new Date().getTime() - 60 * 86400000).toISOString()

  const [{ data: productos }, { data: movimientos }, { data: comprasRec }, { data: itemsVendidos60 }] = await Promise.all([
    supabase.from('products').select('*, product_categories(nombre)').eq('activo', true),
    supabase.from('stock_movements').select('*').gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('purchase_orders').select('total').in('estado', ['recibida_completa', 'recibida_parcial']),
    supabase.from('sale_items').select('product_id, cantidad').gte('created_at', hace60Iso).not('product_id', 'is', null),
  ])

  const prods = productos ?? []
  const movs = movimientos ?? []
  const totalComprasRecibidas = (comprasRec ?? []).reduce((s, oc) => s + (oc.total ?? 0), 0)

  const valorizacionCosto = prods.reduce((s, p) => s + (p.stock_actual ?? 0) * (p.precio_costo ?? 0), 0)
  const valorizacionVenta = prods.reduce((s, p) => s + (p.stock_actual ?? 0) * (p.precio_venta ?? 0), 0)
  const margen = valorizacionCosto > 0 ? Math.round((valorizacionVenta - valorizacionCosto) * 100 / valorizacionCosto) : 0
  const criticos = prods.filter(p => (p.stock_actual ?? 0) <= (p.stock_minimo ?? 5))
  // Utilidad neta potencial: ventas netas (sin IVA) menos PPM 3% menos costo
  const ventasNetas = Math.round(valorizacionVenta / 1.19)
  const ppmInv = Math.round(ventasNetas * 0.03)
  const utilidadNetaInv = ventasNetas - ppmInv - valorizacionCosto

  const porCat: Record<string, number> = {}
  prods.forEach(p => {
    const rel = p.product_categories as { nombre?: string } | { nombre?: string }[] | null | undefined
    const c = (Array.isArray(rel) ? rel[0]?.nombre : rel?.nombre) ?? 'Sin categoría'
    porCat[c] = (porCat[c] ?? 0) + (p.stock_actual ?? 0) * (p.precio_costo ?? 0)
  })
  const pieCat = Object.entries(porCat).map(([name, value]) => ({ name, value }))

  const entradas = movs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.cantidad, 0)
  const salidas = movs.filter(m => m.tipo === 'salida').reduce((s, m) => s + m.cantidad, 0)
  const ajustes = movs.filter(m => m.tipo === 'ajuste').length

  const criticosRows = criticos.sort((a, b) => (a.stock_actual ?? 0) - (b.stock_actual ?? 0)).slice(0, 20)
    .map(p => [p.nombre, p.sku ?? '—', `${p.stock_actual ?? 0}`, `${p.stock_minimo ?? 5}`, formatCLP(p.precio_venta ?? 0)])

  // Rotación y sin movimiento (últimos 60 días)
  const ventasPorProd: Record<string, number> = {}
  ;(itemsVendidos60 ?? []).forEach((it: { product_id: string | null; cantidad: number | null }) => {
    if (!it.product_id) return
    ventasPorProd[it.product_id] = (ventasPorProd[it.product_id] ?? 0) + (it.cantidad ?? 1)
  })

  const sinMovimiento = prods
    .filter(p => (p.stock_actual ?? 0) > 0 && !ventasPorProd[p.id])
    .sort((a, b) => (b.stock_actual ?? 0) * (b.precio_costo ?? 0) - (a.stock_actual ?? 0) * (a.precio_costo ?? 0))
    .slice(0, 20)

  const rotacionRows = prods
    .filter(p => (p.stock_actual ?? 0) > 0 && ventasPorProd[p.id])
    .map(p => {
      const vendidos60 = ventasPorProd[p.id] ?? 0
      const velocidad = vendidos60 / 60 // unidades/día
      const diasStock = velocidad > 0 ? Math.round((p.stock_actual ?? 0) / velocidad) : 999
      return { nombre: p.nombre, stock: p.stock_actual ?? 0, vendidos60, diasStock }
    })
    .sort((a, b) => a.diasStock - b.diasStock)
    .slice(0, 15)

  const sinMovimientoRows = sinMovimiento.map(p => [
    p.nombre,
    p.sku ?? '—',
    `${p.stock_actual ?? 0}`,
    formatCLP(p.precio_costo ?? 0),
    formatCLP((p.stock_actual ?? 0) * (p.precio_costo ?? 0)),
  ])
  const rotacionExportRows = rotacionRows.map(r => [
    r.nombre, r.stock, r.vendidos60, r.diasStock === 999 ? '∞' : r.diasStock,
    r.diasStock <= 15 ? 'Reponer pronto' : r.diasStock <= 30 ? 'Vigilar' : 'OK',
  ])
  const kpiInventarioRows = [
    ['Valorización costo', formatCLP(valorizacionCosto)],
    ['Valorización venta', formatCLP(valorizacionVenta)],
    ['Margen potencial', `${margen}%`],
    ['Total OCs recibidas', formatCLP(totalComprasRecibidas)],
    ['Utilidad neta potencial', formatCLP(utilidadNetaInv)],
    ['Productos críticos', criticos.length],
    ['Entradas del período', entradas],
    ['Salidas del período', salidas],
    ['Ajustes del período', ajustes],
  ]

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Inventario"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'KPIs', headers: ['Métrica', 'Valor'], rows: kpiInventarioRows },
            { titulo: 'Stock crítico', headers: ['Producto', 'SKU', 'Stock actual', 'Stock mínimo', 'Precio venta'], rows: criticosRows },
            { titulo: 'Rotación de stock', headers: ['Producto', 'Stock actual', 'Vendidos (60d)', 'Días de stock', 'Alerta'], rows: rotacionExportRows },
            { titulo: 'Sin ventas en 60 días', headers: ['Producto', 'SKU', 'Stock', 'Costo unitario', 'Capital inmovilizado'], rows: sinMovimientoRows },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Valorización costo" value={formatCLP(valorizacionCosto)} sub="stock actual × costo unitario" colorIdx={0} />
        <KpiCard label="Valorización venta" value={formatCLP(valorizacionVenta)} sub="stock actual × precio venta" colorIdx={1} />
        <KpiCard label="Margen potencial" value={`${margen}%`} colorIdx={2} />
        <KpiCard label="Total OCs recibidas" value={formatCLP(totalComprasRecibidas)} sub="compras registradas en el sistema" colorIdx={5} />
        <KpiCard label="Util. neta potencial" value={formatCLP(utilidadNetaInv)} sub="ventas neto − PPM − costo" colorIdx={1} />
        <KpiCard label="Productos críticos" value={`${criticos.length}`} sub="stock ≤ mínimo" colorIdx={4} />
      </div>

      {/* Explicación de la diferencia entre valorización y compras */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800">
        <p className="font-semibold mb-1">ℹ️ ¿Por qué difieren Valorización costo y Total OCs?</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Valorización costo</strong> = valor del stock actual (todas las unidades × su costo unitario en inventario).
          Incluye productos cargados masivamente antes de usar el módulo de Compras. &nbsp;
          <strong>Total OCs recibidas</strong> = suma de órdenes de compra registradas en el sistema.
          Son distintos: si cargaste inventario inicial sin OC, solo aparece en la valorización.
          A partir de ahora cada OC recibida <strong>actualiza automáticamente el costo promedio</strong> del producto.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Section title="Valorización por categoría"><GraficoPastel data={pieCat} height={250} /></Section>
        </div>
        <Section title="Movimientos del período">
          <div className="space-y-3 pt-2">
            {[
              { label: 'Entradas', value: entradas, color: 'text-green-700' },
              { label: 'Salidas', value: salidas, color: 'text-red-600' },
              { label: 'Ajustes', value: ajustes, color: 'text-orange-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center border-b pb-3">
                <span className="text-sm text-gray-600">{label}</span>
                <span className={`text-xl font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <Section title={`Productos con stock crítico (${criticos.length})`}>
        <Tabla headers={['Producto', 'SKU', 'Stock actual', 'Stock mínimo', 'Precio venta']} rows={criticosRows} />
      </Section>

      {/* Rotación de stock */}
      {rotacionRows.length > 0 && (
        <Section title="Rotación de stock — días de inventario restante (basado en ventas 60 días)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Producto', 'Stock actual', 'Vendidos (60d)', 'Días de stock', 'Alerta'].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rotacionRows.map((r, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${r.diasStock <= 15 ? 'bg-red-50' : r.diasStock <= 30 ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{r.nombre}</td>
                    <td className="px-4 py-2.5 text-right">{r.stock}</td>
                    <td className="px-4 py-2.5 text-right">{r.vendidos60}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${r.diasStock <= 15 ? 'text-red-600' : r.diasStock <= 30 ? 'text-orange-600' : 'text-green-700'}`}>{r.diasStock === 999 ? '∞' : r.diasStock}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{r.diasStock <= 15 ? '🔴 Reponer pronto' : r.diasStock <= 30 ? '🟡 Vigilar' : '🟢 OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2 px-1">Días de stock = stock actual ÷ velocidad de venta diaria promedio (últimos 60 días).</p>
        </Section>
      )}

      {/* Productos sin movimiento */}
      {sinMovimiento.length > 0 && (
        <Section title={`Productos sin ventas en los últimos 60 días (${sinMovimiento.length})`}>
          <Tabla
            headers={['Producto', 'SKU', 'Stock', 'Costo unitario', 'Capital inmovilizado']}
            rows={sinMovimientoRows}
          />
          <p className="text-xs text-gray-400 mt-2 px-1">Productos con stock disponible pero sin ninguna venta registrada en los últimos 60 días.</p>
        </Section>
      )}

    </div>
  )
}

// ── Tab: Rentabilidad & Comisiones ────────────────────────────────────────────

type TecComisiones = {
  nombre_completo: string
  comision_base: number
  comision_pantalla: number
  comision_bateria: number
  comision_placa: number
  comision_software: number
  comision_camara: number
  comision_conector: number
  comision_otro: number
}

type SysConf = {
  iva: number
  comision_debito: number
  comision_credito: number
  comision_transferencia: number
  costo_insumos_promedio?: number
}

function pctPorTipo(tec: TecComisiones, tipo: string | null): number {
  switch (tipo) {
    case 'pantalla':   return tec.comision_pantalla
    case 'bateria':    return tec.comision_bateria
    case 'placa':      return tec.comision_placa
    case 'software':   return tec.comision_software
    case 'camara':     return tec.comision_camara
    case 'conector':   return tec.comision_conector
    default:           return tec.comision_otro
  }
}

function calcularOT(
  precioBruto: number,
  ivaAplicado: number | null,
  metodo: string | null,
  costoRep: number,
  costoInsumos: number,
  tec: TecComisiones | null,
  tipo: string | null,
  conf: SysConf,
) {
  const ivaRate = (ivaAplicado ?? conf.iva ?? 19) / 100
  const precioNeto = Math.round(precioBruto / (1 + ivaRate))
  const ivaImporte = precioBruto - precioNeto

  let pctBanco = 0
  if (metodo === 'credito')       pctBanco = conf.comision_credito ?? 2.5
  else if (metodo === 'debito')   pctBanco = conf.comision_debito ?? 1.5
  else if (metodo === 'transferencia') pctBanco = conf.comision_transferencia ?? 0
  const comBanco = Math.round(precioBruto * pctBanco / 100)

  const baseCalculo = Math.max(0, precioNeto - costoRep - comBanco)

  let pctComision = 0
  if (tec) {
    const pctTipo = pctPorTipo(tec, tipo)
    pctComision = pctTipo > 0 ? pctTipo : tec.comision_base
  }
  const comisionTecnico = Math.round(baseCalculo * pctComision / 100)
  const gananciaNegocio = baseCalculo - comisionTecnico - costoInsumos

  return { precioNeto, ivaImporte, costoRep, comBanco, baseCalculo, pctComision, comisionTecnico, costoInsumos, gananciaNegocio }
}

async function TabRentabilidad({ desde, hasta, soloUserId, puedeExportar }: { desde: string; hasta: string; soloUserId?: string; puedeExportar: boolean }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  let otsQuery = supabase.from('repair_orders')
    .select(`
      id, numero_ot, created_at, tipo_reparacion, precio_servicio,
      metodo_pago, iva_aplicado, tecnico_id,
      equipment(marca, modelo),
      tecnico:user_profiles(
        nombre_completo, comision_base, comision_pantalla, comision_bateria,
        comision_placa, comision_software, comision_camara, comision_conector, comision_otro
      )
    `)
    .eq('estado', 'entregado')
    .gte('created_at', desdeIso)
    .lte('created_at', hastaIso)

  if (soloUserId) otsQuery = otsQuery.eq('tecnico_id', soloUserId)

  const [{ data: otsRaw }, { data: itemsRaw }, { data: confRaw }, { data: sysNombre }] = await Promise.all([
    otsQuery,
    supabase.from('repair_items')
      .select('repair_order_id, cantidad, precio_costo, costo_envio'),
    supabase.from('system_config').select('iva, comision_debito, comision_credito, comision_transferencia, costo_insumos_promedio').single(),
    supabase.from('system_config').select('nombre_local').maybeSingle(),
  ])
  const nombreLocal = (sysNombre as { nombre_local?: string } | null)?.nombre_local ?? ''

  const conf: SysConf = (confRaw as SysConf | null) ?? { iva: 19, comision_debito: 1.5, comision_credito: 2.5, comision_transferencia: 0 }
  const costoInsumosProm = conf.costo_insumos_promedio ?? 0

  // Agrupa costos de repuestos por OT
  const costosPorOT: Record<string, number> = {}
  ;(itemsRaw ?? []).forEach(it => {
    const c = (it.cantidad ?? 1) * (it.precio_costo ?? 0) + (it.costo_envio ?? 0)
    costosPorOT[it.repair_order_id] = (costosPorOT[it.repair_order_id] ?? 0) + c
  })

  type OTCalc = {
    id: string; numero_ot: string; fecha: string
    marca: string; modelo: string; tipo: string
    tecnicoNombre: string; tecnicoId: string
    precioBruto: number; precioNeto: number; ivaImporte: number
    costoRep: number; comBanco: number; baseCalculo: number
    pctComision: number; comisionTecnico: number
    costoInsumos: number; gananciaNegocio: number
  }

  const ots = (otsRaw ?? []) as unknown as {
    id: string; numero_ot: string; created_at: string
    tipo_reparacion: string | null; precio_servicio: number | null
    metodo_pago: string | null; iva_aplicado: number | null; tecnico_id: string | null
    equipment: { marca: string; modelo: string } | null
    tecnico: TecComisiones | null
  }[]

  const lista: OTCalc[] = ots.map(o => {
    const precioBruto = o.precio_servicio ?? 0
    const costoRep = costosPorOT[o.id] ?? 0
    const calc = calcularOT(precioBruto, o.iva_aplicado, o.metodo_pago, costoRep, costoInsumosProm, o.tecnico, o.tipo_reparacion, conf)
    return {
      id: o.id,
      numero_ot: o.numero_ot,
      fecha: o.created_at.split('T')[0],
      marca: o.equipment?.marca ?? '—',
      modelo: o.equipment?.modelo ?? '—',
      tipo: o.tipo_reparacion ?? 'otro',
      tecnicoNombre: o.tecnico?.nombre_completo ?? 'Sin asignar',
      tecnicoId: o.tecnico_id ?? 'sin_asignar',
      precioBruto,
      ...calc,
    }
  })

  // KPIs globales
  const totBruto = lista.reduce((s, o) => s + o.precioBruto, 0)
  const totNeto  = lista.reduce((s, o) => s + o.precioNeto, 0)
  const totIva   = lista.reduce((s, o) => s + o.ivaImporte, 0)
  const totRep   = lista.reduce((s, o) => s + o.costoRep, 0)
  const totComBanco = lista.reduce((s, o) => s + o.comBanco, 0)
  const totComTec   = lista.reduce((s, o) => s + o.comisionTecnico, 0)
  const totInsumos  = lista.reduce((s, o) => s + o.costoInsumos, 0)
  const totGanancia = lista.reduce((s, o) => s + o.gananciaNegocio, 0)
  const margenGlobal = totNeto > 0 ? Math.round(totGanancia * 100 / totNeto) : 0

  // ── Por técnico ─────────────────────────────────────────────────────────────
  type TecResumen = {
    nombre: string; ots: number
    ingresosBruto: number; costoRep: number; comBanco: number
    comisionTotal: number; gananciaGen: number; pctPromedio: number
  }
  const porTec: Record<string, TecResumen> = {}
  lista.forEach(o => {
    if (!porTec[o.tecnicoId]) {
      porTec[o.tecnicoId] = { nombre: o.tecnicoNombre, ots: 0, ingresosBruto: 0, costoRep: 0, comBanco: 0, comisionTotal: 0, gananciaGen: 0, pctPromedio: 0 }
    }
    const t = porTec[o.tecnicoId]
    t.ots++
    t.ingresosBruto += o.precioBruto
    t.costoRep      += o.costoRep
    t.comBanco      += o.comBanco
    t.comisionTotal += o.comisionTecnico
    t.gananciaGen   += o.gananciaNegocio
  })
  Object.values(porTec).forEach(t => {
    const neto = t.ingresosBruto - (t.ingresosBruto - Math.round(t.ingresosBruto / (1 + (conf.iva ?? 19) / 100)))
    t.pctPromedio = neto > 0 ? Math.round(t.comisionTotal * 100 / neto) : 0
  })
  const tecList = Object.values(porTec).sort((a, b) => b.comisionTotal - a.comisionTotal)

  // Datos para el componente de impresión
  const tecParaImprimir = tecList.map(t => {
    const ivaRate = (conf.iva ?? 19) / 100
    const netoTotal = Math.round(t.ingresosBruto / (1 + ivaRate))
    const ivaTotal  = t.ingresosBruto - netoTotal
    const ppm       = Math.round(netoTotal * 0.03)
    return {
      nombre:         t.nombre,
      ots:            t.ots,
      ingresosBruto:  t.ingresosBruto,
      netoTotal,
      ivaTotal,
      ppm,
      costoRep:       t.costoRep,
      comBanco:       t.comBanco,
      comisionTotal:  t.comisionTotal,
      insumos:        lista.filter(o => o.tecnicoId === Object.keys(porTec).find(k => porTec[k].nombre === t.nombre)).reduce((s, o) => s + o.costoInsumos, 0),
      gananciaGen:    t.gananciaGen,
    }
  })

  // ── Gráficos ─────────────────────────────────────────────────────────────────
  const porDia: Record<string, { ganancia: number; comision: number }> = {}
  lista.forEach(o => {
    if (!porDia[o.fecha]) porDia[o.fecha] = { ganancia: 0, comision: 0 }
    porDia[o.fecha].ganancia  += o.gananciaNegocio
    porDia[o.fecha].comision  += o.comisionTecnico
  })
  const areaData = Object.entries(porDia).sort().map(([fecha, v]) => ({ fecha, ...v }))
  const barTec = tecList.map(t => ({ name: t.nombre, comision: t.comisionTotal, ganancia: t.gananciaGen }))

  // ── Detalle OTs ───────────────────────────────────────────────────────────────
  const detalleRows = lista.slice(0, 50).map(o => [
    o.numero_ot,
    `${o.marca} ${o.modelo}`,
    o.tipo,
    o.tecnicoNombre,
    formatCLP(o.precioBruto),
    formatCLP(o.costoRep),
    formatCLP(o.comBanco),
    `${o.pctComision}%`,
    formatCLP(o.comisionTecnico),
    formatCLP(o.gananciaNegocio),
  ])

  const kpiRentabRows = [
    ['Ingresos brutos', formatCLP(totBruto)],
    ['Ganancia del negocio', formatCLP(totGanancia)],
    ['Total comisiones técnicos', formatCLP(totComTec)],
    ['IVA a reservar', formatCLP(totIva)],
    ['Costo repuestos', formatCLP(totRep)],
    ['Comisiones bancarias', formatCLP(totComBanco)],
    ['Costo insumos', formatCLP(totInsumos)],
    ['Margen neto negocio', `${margenGlobal}%`],
  ]
  const resumenTecRows = [
    ...tecList.map(t => [t.nombre, t.ots, formatCLP(t.ingresosBruto), formatCLP(t.costoRep), formatCLP(t.comBanco), formatCLP(t.comisionTotal), `${t.pctPromedio}%`, formatCLP(t.gananciaGen)]),
    ...(tecList.length ? [['TOTAL', lista.length, formatCLP(totBruto), formatCLP(totRep), formatCLP(totComBanco), formatCLP(totComTec), '—', formatCLP(totGanancia)]] : []),
  ]

  return (
    <div className="space-y-5">

      {/* Banner personal si es vista filtrada */}
      {soloUserId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
          <span className="text-lg">👤</span>
          <span>Mostrando <strong>solo tus OTs entregadas</strong> en el período seleccionado.</span>
        </div>
      )}

      {/* Botón imprimir / exportar */}
      <div className="flex justify-end gap-2">
        <ExportButtons
          visible={puedeExportar}
          titulo="Rentabilidad y comisiones"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'KPIs', headers: ['Métrica', 'Valor'], rows: kpiRentabRows },
            { titulo: 'Resumen por técnico', headers: ['Técnico', 'OTs', 'Ingreso bruto', 'Repuestos', 'Com. banco', 'Comisión a pagar', '% prom.', 'Ganancia negocio'], rows: resumenTecRows },
            { titulo: 'Detalle de OTs', headers: ['OT', 'Equipo', 'Tipo', 'Técnico', 'Bruto', 'Repuestos', 'Com. banco', '% com.', 'Comisión', 'Ganancia'], rows: detalleRows },
          ]}
        />
        <ImprimirInformeTecnico
          tecnicos={tecParaImprimir}
          desde={desde}
          hasta={hasta}
          nombreLocal={nombreLocal}
        />
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Ingresos brutos" value={formatCLP(totBruto)} sub={`${lista.length} OTs entregadas`} colorIdx={0} />
        <KpiCard label="Ganancia del negocio" value={formatCLP(totGanancia)} sub={`Margen ${margenGlobal}%`} colorIdx={1} />
        <KpiCard label="Total comisiones técnicos" value={formatCLP(totComTec)} colorIdx={2} />
        <KpiCard label="IVA a reservar" value={formatCLP(totIva)} colorIdx={3} />
        <KpiCard label="Costo repuestos" value={formatCLP(totRep)} colorIdx={4} />
        <KpiCard label="Comisiones bancarias" value={formatCLP(totComBanco)} colorIdx={5} />
        <KpiCard label="Costo insumos" value={formatCLP(totInsumos)} sub={`${formatCLP(costoInsumosProm)} por OT`} colorIdx={2} />
        <KpiCard label="Margen neto negocio" value={`${margenGlobal}%`} colorIdx={1} />
      </div>

      {/* Fórmula */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">Fórmula de distribución por OT:</p>
        <div className="font-mono text-xs space-y-1">
          <p>Precio Neto       = Precio Bruto ÷ (1 + IVA%)</p>
          <p>Base Comisión     = Precio Neto − Repuestos − Comisión Bancaria</p>
          <p>Comisión Técnico  = Base × %Comisión del técnico por tipo</p>
          <p>Ganancia Negocio  = Base − Comisión Técnico − Costo Insumos</p>
        </div>
        <p className="text-xs mt-2 text-blue-600">
          % comisión: se usa la tasa por tipo de reparación si está configurada; si no, la tasa base del técnico.
          Configura las tasas en <strong>Usuarios → editar técnico</strong>.
        </p>
      </div>

      {/* Resumen por técnico */}
      <Section title="Resumen de comisiones por técnico">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Técnico', 'OTs', 'Ingreso bruto', 'Repuestos', 'Com. banco', 'Comisión a pagar', '% prom.', 'Ganancia negocio'].map((h, i) => (
                  <th key={i} className={`px-3 py-2 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {tecList.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400 text-xs">Sin OTs entregadas en el período</td></tr>
              ) : tecList.map((t, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{t.nombre}</td>
                  <td className="px-3 py-2 text-right">{t.ots}</td>
                  <td className="px-3 py-2 text-right">{formatCLP(t.ingresosBruto)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{formatCLP(t.costoRep)}</td>
                  <td className="px-3 py-2 text-right text-orange-600">{formatCLP(t.comBanco)}</td>
                  <td className="px-3 py-2 text-right font-bold text-purple-700">{formatCLP(t.comisionTotal)}</td>
                  <td className="px-3 py-2 text-right">{t.pctPromedio}%</td>
                  <td className="px-3 py-2 text-right text-green-700 font-bold">{formatCLP(t.gananciaGen)}</td>
                </tr>
              ))}
              {tecList.length > 0 && (
                <tr className="bg-gray-50 font-semibold border-t-2">
                  <td className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 text-right">{lista.length}</td>
                  <td className="px-3 py-2 text-right">{formatCLP(totBruto)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{formatCLP(totRep)}</td>
                  <td className="px-3 py-2 text-right text-orange-600">{formatCLP(totComBanco)}</td>
                  <td className="px-3 py-2 text-right text-purple-700">{formatCLP(totComTec)}</td>
                  <td className="px-3 py-2 text-right">—</td>
                  <td className="px-3 py-2 text-right text-green-700">{formatCLP(totGanancia)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Ganancia diaria del negocio">
          <GraficoArea data={areaData} dataKey="ganancia" nameKey="fecha" color="#10b981" height={220} />
        </Section>
        <Section title="Comisión vs Ganancia por técnico">
          <GraficoBarrasCLP data={barTec} dataKey="comision" nameKey="name" color="#8b5cf6" height={220} />
        </Section>
      </div>

      {/* Detalle desglose por técnico */}
      {tecParaImprimir.filter(t => t.ots > 0).map((t, i) => (
        <div key={i} className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-indigo-700 text-white px-4 py-3">
            <p className="font-bold text-sm">👤 {t.nombre}</p>
            <p className="text-xs text-indigo-200">{t.ots} OT{t.ots !== 1 ? 's' : ''} entregada{t.ots !== 1 ? 's' : ''}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0">
            {[
              { label: 'Bruto cobrado',      value: formatCLP(t.ingresosBruto), color: 'text-gray-900' },
              { label: 'Neto (sin IVA 19%)', value: formatCLP(t.netoTotal),     color: 'text-blue-700' },
              { label: 'IVA a reservar',     value: formatCLP(t.ivaTotal),      color: 'text-red-600'  },
              { label: 'PPM 3% (SII)',       value: formatCLP(t.ppm),           color: 'text-orange-600' },
              { label: 'Utilidad neta est.', value: formatCLP(t.netoTotal - t.ppm - t.costoRep - t.comBanco - t.comisionTotal - t.insumos), color: 'text-green-700 font-bold' },
            ].map((cell, j) => (
              <div key={j} className="px-4 py-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{cell.label}</p>
                <p className={`text-base font-bold ${cell.color}`}>{cell.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x border-t bg-gray-50">
            {[
              { label: 'Costo repuestos',    value: formatCLP(t.costoRep),      color: 'text-red-600'    },
              { label: 'Com. bancaria',      value: formatCLP(t.comBanco),      color: 'text-orange-600' },
              { label: 'Comisión técnico',   value: formatCLP(t.comisionTotal), color: 'text-purple-700' },
              { label: 'Insumos',            value: formatCLP(t.insumos),       color: 'text-orange-500' },
            ].map((cell, j) => (
              <div key={j} className="px-4 py-2.5 text-center">
                <p className="text-xs text-gray-400 mb-0.5">{cell.label}</p>
                <p className={`text-sm font-semibold ${cell.color}`}>{cell.value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Detalle OT a OT */}
      <Section title={`Detalle de cada OT entregada (${lista.length} en total)`}>
        <Tabla
          headers={['OT', 'Equipo', 'Tipo', 'Técnico', 'Bruto', 'Repuestos', 'Com. banco', '% com.', 'Comisión', 'Ganancia']}
          rows={detalleRows}
        />
      </Section>
    </div>
  )
}

// ── Tab: Servicios ────────────────────────────────────────────────────────────

async function TabServicios({ desde, hasta, puedeExportar }: { desde: string; hasta: string; puedeExportar: boolean }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const [{ data: usos }, { data: servicios }] = await Promise.all([
    supabase.from('repair_order_services')
      .select('service_id, applied_at, repair_orders(precio_servicio, estado)')
      .gte('applied_at', desdeIso)
      .lte('applied_at', hastaIso)
      .then(r => r.error ? { data: [] } : r),
    supabase.from('repair_services')
      .select('id, nombre, tipo_reparacion, precio_base, repair_service_items(precio_costo, cantidad)')
      .eq('activo', true)
      .order('nombre'),
  ])

  type UsoRow = {
    service_id: string
    applied_at: string
    repair_orders: { precio_servicio: number | null; estado: string } | null
  }
  const usosList = (usos ?? []) as unknown as UsoRow[]

  type ServRow = {
    id: string; nombre: string; tipo_reparacion: string; precio_base: number
    repair_service_items: { precio_costo: number; cantidad: number }[]
  }
  const serviciosList = (servicios ?? []) as unknown as ServRow[]

  // Agrupar usos por servicio
  const porServicio: Record<string, { nombre: string; tipo: string; usos: number; ingresos: number; margen: number }> = {}
  const servicioMap = Object.fromEntries(serviciosList.map(s => {
    const costo = s.repair_service_items.reduce((sum, i) => sum + i.precio_costo * i.cantidad, 0)
    const margen = costo > 0 ? Math.round(((s.precio_base - costo) / costo) * 100) : 0
    return [s.id, { nombre: s.nombre, tipo: s.tipo_reparacion, margen }]
  }))

  usosList.forEach(u => {
    const s = servicioMap[u.service_id]
    if (!s) return
    if (!porServicio[u.service_id]) porServicio[u.service_id] = { nombre: s.nombre, tipo: s.tipo, usos: 0, ingresos: 0, margen: s.margen }
    porServicio[u.service_id].usos++
    porServicio[u.service_id].ingresos += u.repair_orders?.precio_servicio ?? 0
  })

  const ranking = Object.values(porServicio).sort((a, b) => b.usos - a.usos)
  const totalUsos = usosList.length
  const totalIngresos = ranking.reduce((s, r) => s + r.ingresos, 0)

  // Frecuencia por tipo
  const porTipo: Record<string, number> = {}
  usosList.forEach(u => {
    const t = servicioMap[u.service_id]?.tipo ?? 'otro'
    porTipo[t] = (porTipo[t] ?? 0) + 1
  })
  const pieTipo = Object.entries(porTipo).map(([name, value]) => ({ name, value }))

  const TIPO_LABEL: Record<string, string> = {
    pantalla: 'Pantalla', bateria: 'Batería', placa: 'Placa madre',
    software: 'Software', camara: 'Cámara', conector: 'Conector', otro: 'Otro',
  }
  const rankingRows = ranking.map(r => [r.nombre, TIPO_LABEL[r.tipo] ?? r.tipo, r.usos, formatCLP(r.ingresos), `${r.margen}%`])

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Servicios"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'KPIs', headers: ['Métrica', 'Valor'], rows: [['Servicios aplicados', totalUsos], ['Ingresos generados', formatCLP(totalIngresos)], ['Servicios activos', serviciosList.length]] },
            { titulo: 'Servicios más usados', headers: ['Servicio', 'Tipo', 'Veces', 'Ingresos', 'Margen'], rows: rankingRows },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Servicios aplicados" value={`${totalUsos}`} sub={`en el período`} colorIdx={0} />
        <KpiCard label="Ingresos generados" value={formatCLP(totalIngresos)} sub="por OTs con servicio" colorIdx={1} />
        <KpiCard label="Servicios activos" value={`${serviciosList.length}`} colorIdx={2} />
      </div>

      {totalUsos === 0 ? (
        <div className="bg-white rounded-xl border text-center py-12 text-gray-400">
          <span className="text-4xl block mb-2">🔩</span>
          <p className="text-sm">Sin servicios aplicados en este período</p>
          <p className="text-xs mt-1 text-gray-300">El rastreo se activa al ejecutar la migración SQL 16</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <Section title="Servicios más usados">
              <Tabla
                headers={['Servicio', 'Tipo', 'Veces', 'Ingresos', 'Margen']}
                rows={rankingRows}
              />
            </Section>
          </div>
          <Section title="Por tipo de reparación">
            <GraficoPastel data={pieTipo} height={220} />
          </Section>
        </div>
      )}
    </div>
  )
}

// ── Tab: Auditoría ────────────────────────────────────────────────────────────

async function TabAuditoria({ desde, hasta, puedeExportar }: { desde: string; hasta: string; puedeExportar: boolean }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  // Queries sin FK hints — lookup de usuarios por separado
  const [
    { data: salesData },
    { data: historialData },
    { data: sesionesData },
    { data: stockData },
    { data: otsData },
    { data: serviciosAplicadosData },
  ] = await Promise.all([
    supabase.from('sales')
      .select('id, numero_venta, tipo, total, metodo_pago, tipo_documento, created_at, anulada, usuario_id, customers(nombre)')
      .gte('created_at', desdeIso).lte('created_at', hastaIso)
      .order('created_at', { ascending: false }).limit(300),
    supabase.from('repair_status_history')
      .select('id, estado_anterior, estado_nuevo, comentario, created_at, repair_order_id, usuario_id, repair_orders(numero_ot, customers(nombre))')
      .gte('created_at', desdeIso).lte('created_at', hastaIso)
      .order('created_at', { ascending: false }).limit(300),
    supabase.from('sesiones_caja')
      .select('id, fecha, apertura_at, cierre_at, efectivo_apertura, efectivo_cierre, transbank_cierre, transferencia_cierre, usuario_id, usuario_cierre_id')
      .or(`apertura_at.gte.${desdeIso},cierre_at.gte.${desdeIso}`)
      .order('apertura_at', { ascending: false }).limit(60),
    supabase.from('stock_movements')
      .select('id, tipo, cantidad, razon, created_at, usuario_id, products(nombre)')
      .gte('created_at', desdeIso).lte('created_at', hastaIso)
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('repair_orders')
      .select('id, numero_ot, created_at, tecnico_id, equipment(tipo_equipo, marca, modelo), customers(nombre)')
      .gte('created_at', desdeIso).lte('created_at', hastaIso)
      .order('created_at', { ascending: false }).limit(100),
    supabase.from('repair_order_services')
      .select('id, applied_at, applied_by, repair_services(nombre), repair_orders(numero_ot, customers(nombre))')
      .gte('applied_at', desdeIso).lte('applied_at', hastaIso)
      .order('applied_at', { ascending: false }).limit(200),
  ])

  // Recolectar todos los user IDs únicos y hacer un solo lookup
  const allUserIds = [...new Set([
    ...(salesData ?? []).map((v: Record<string, unknown>) => v.usuario_id as string).filter(Boolean),
    ...(historialData ?? []).map((h: Record<string, unknown>) => h.usuario_id as string).filter(Boolean),
    ...(stockData ?? []).map((m: Record<string, unknown>) => m.usuario_id as string).filter(Boolean),
    ...(otsData ?? []).map((o: Record<string, unknown>) => o.tecnico_id as string).filter(Boolean),
    ...(sesionesData ?? []).map((s: Record<string, unknown>) => s.usuario_id as string).filter(Boolean),
    ...(sesionesData ?? []).map((s: Record<string, unknown>) => s.usuario_cierre_id as string).filter(Boolean),
    ...(serviciosAplicadosData ?? []).map((s: Record<string, unknown>) => s.applied_by as string).filter(Boolean),
  ])]

  const { data: perfilesData } = allUserIds.length > 0
    ? await supabase.from('user_profiles').select('id, nombre_completo, email').in('id', allUserIds)
    : { data: [] }

  const perfiles: Record<string, string> = {}
  ;(perfilesData ?? []).forEach((p: Record<string, unknown>) => {
    perfiles[p.id as string] = (p.nombre_completo as string) ?? (p.email as string) ?? '—'
  })

  const nombreUsuario = (id: string | null | undefined): string => {
    if (!id) return '—'
    return perfiles[id] ?? '—'
  }

  type LogEntry = { fecha: string; usuario: string; modulo: string; accion: string; detalle: string; monto?: number; color: string }

  const normRel = (v: unknown): Record<string, unknown> | null => {
    if (!v) return null
    return (Array.isArray(v) ? v[0] : v) as Record<string, unknown>
  }

  const entries: LogEntry[] = []

  // Ventas
  ;(salesData ?? []).forEach(v => {
    const vr = v as Record<string, unknown>
    const cliente = normRel(vr.customers)
    entries.push({
      fecha: vr.created_at as string,
      usuario: nombreUsuario(vr.usuario_id as string),
      modulo: '💰 Caja',
      accion: vr.anulada ? 'Venta anulada' : 'Venta registrada',
      detalle: `${vr.numero_venta} · ${(cliente?.nombre as string) ?? 'Sin cliente'} · ${vr.metodo_pago} · ${vr.tipo_documento}`,
      monto: vr.total as number,
      color: vr.anulada ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
    })
  })

  // Cambios de estado OT
  ;(historialData ?? []).forEach(h => {
    const hr = h as Record<string, unknown>
    const ot = normRel(hr.repair_orders)
    const cliente = ot ? normRel(ot.customers as unknown) : null
    entries.push({
      fecha: hr.created_at as string,
      usuario: nombreUsuario(hr.usuario_id as string),
      modulo: '🔧 Reparaciones',
      accion: `Estado → ${hr.estado_nuevo}`,
      detalle: `${(ot?.numero_ot as string) ?? ''} · ${(cliente?.nombre as string) ?? ''}${hr.comentario ? ' · ' + hr.comentario : ''}`,
      color: hr.estado_nuevo === 'entregado' ? 'bg-emerald-100 text-emerald-700' : hr.estado_nuevo === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700',
    })
  })

  // Sesiones caja
  ;(sesionesData ?? []).forEach(s => {
    const sr = s as Record<string, unknown>
    if (sr.apertura_at && (sr.apertura_at as string) >= desdeIso && (sr.apertura_at as string) <= hastaIso) {
      entries.push({ fecha: sr.apertura_at as string, usuario: nombreUsuario(sr.usuario_id as string), modulo: '🔓 Caja', accion: 'Apertura de caja', detalle: `Fondo apertura: ${formatCLP(sr.efectivo_apertura as number)}`, color: 'bg-yellow-100 text-yellow-700' })
    }
    if (sr.cierre_at && (sr.cierre_at as string) >= desdeIso && (sr.cierre_at as string) <= hastaIso) {
      const total = ((sr.efectivo_cierre as number) ?? 0) + ((sr.transbank_cierre as number) ?? 0) + ((sr.transferencia_cierre as number) ?? 0)
      const usuarioCierre = nombreUsuario((sr.usuario_cierre_id ?? sr.usuario_id) as string)
      entries.push({ fecha: sr.cierre_at as string, usuario: usuarioCierre, modulo: '🔒 Caja', accion: 'Cierre de caja', detalle: `Total recaudado: ${formatCLP(total)}`, monto: total, color: 'bg-gray-100 text-gray-700' })
    }
  })

  // Movimientos de stock
  ;(stockData ?? []).forEach(m => {
    const mr = m as Record<string, unknown>
    const prod = normRel(mr.products)
    entries.push({
      fecha: mr.created_at as string,
      usuario: nombreUsuario(mr.usuario_id as string),
      modulo: '📦 Inventario',
      accion: `Stock ${mr.tipo}`,
      detalle: `${(prod?.nombre as string) ?? '—'} · ${mr.tipo}: ${mr.cantidad} unid. · ${mr.razon}`,
      color: mr.tipo === 'entrada' ? 'bg-blue-100 text-blue-700' : mr.tipo === 'salida' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700',
    })
  })

  // OTs creadas
  ;(otsData ?? []).forEach(o => {
    const or2 = o as Record<string, unknown>
    const cliente = normRel(or2.customers)
    const eq = normRel(or2.equipment)
    const tipo = eq?.tipo_equipo as string | undefined
    const tipoCapit = tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : ''
    const equipoDesc = [tipoCapit, eq?.marca, eq?.modelo].filter(Boolean).join(' ') || '—'
    entries.push({
      fecha: or2.created_at as string,
      usuario: nombreUsuario(or2.tecnico_id as string),
      modulo: '🔧 Reparaciones',
      accion: 'OT creada',
      detalle: `${or2.numero_ot} · ${(cliente?.nombre as string) ?? '—'} · ${equipoDesc}`,
      color: 'bg-cyan-100 text-cyan-700',
    })
  })

  // Servicios aplicados a OTs
  ;(serviciosAplicadosData ?? []).forEach(s => {
    const sr = s as Record<string, unknown>
    const ot = normRel(sr.repair_orders)
    const cliente = ot ? normRel(ot.customers as unknown) : null
    const servicio = normRel(sr.repair_services)
    entries.push({
      fecha: sr.applied_at as string,
      usuario: nombreUsuario(sr.applied_by as string),
      modulo: '🔩 Servicios',
      accion: 'Servicio aplicado',
      detalle: `${(ot?.numero_ot as string) ?? ''} · ${(cliente?.nombre as string) ?? '—'} · ${(servicio?.nombre as string) ?? '—'}`,
      color: 'bg-indigo-100 text-indigo-700',
    })
  })

  // Ordenar por fecha desc
  entries.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  // Resumen por usuario
  const porUsuario: Record<string, { ventas: number; totalVentas: number; anuladas: number; otsCreadas: number; cambiosEstado: number; stockMovs: number }> = {}
  entries.forEach(e => {
    const k = e.usuario
    if (!porUsuario[k]) porUsuario[k] = { ventas: 0, totalVentas: 0, anuladas: 0, otsCreadas: 0, cambiosEstado: 0, stockMovs: 0 }
    if (e.accion === 'Venta registrada') { porUsuario[k].ventas++; porUsuario[k].totalVentas += e.monto ?? 0 }
    if (e.accion === 'Venta anulada')    porUsuario[k].anuladas++
    if (e.accion === 'OT creada')        porUsuario[k].otsCreadas++
    if (e.accion.startsWith('Estado →')) porUsuario[k].cambiosEstado++
    if (e.accion.startsWith('Stock'))    porUsuario[k].stockMovs++
  })

  const porUsuarioOrdenado = Object.entries(porUsuario).sort((a, b) => b[1].totalVentas - a[1].totalVentas)
  const resumenUsuarioRows = porUsuarioOrdenado.map(([usuario, v]) => [usuario, v.ventas, formatCLP(v.totalVentas), v.anuladas, v.otsCreadas, v.cambiosEstado, v.stockMovs])

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Auditoría — Resumen por usuario"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'Resumen por usuario', headers: ['Usuario', 'Ventas', 'Total vendido', 'Anuladas', 'OTs creadas', 'Cambios estado', 'Mov. stock'], rows: resumenUsuarioRows },
          ]}
        />
      </div>
      {/* Resumen por usuario */}
      <Section title="Resumen de actividad por usuario">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Usuario', 'Ventas', 'Total vendido', 'Anuladas', 'OTs creadas', 'Cambios estado', 'Mov. stock'].map((h, i) => (
                  <th key={i} className={`px-3 py-2 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {porUsuarioOrdenado.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400 text-xs">Sin actividad en el período</td></tr>
              ) : porUsuarioOrdenado.map(([usuario, v], i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{usuario}</td>
                  <td className="px-3 py-2 text-right">{v.ventas}</td>
                  <td className="px-3 py-2 text-right text-green-700 font-semibold">{formatCLP(v.totalVentas)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{v.anuladas || '—'}</td>
                  <td className="px-3 py-2 text-right">{v.otsCreadas || '—'}</td>
                  <td className="px-3 py-2 text-right">{v.cambiosEstado || '—'}</td>
                  <td className="px-3 py-2 text-right">{v.stockMovs || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Timeline completo, con filtros */}
      <AuditoriaLog entries={entries} puedeExportar={puedeExportar} />
    </div>
  )
}

// ── Tab: Compras ──────────────────────────────────────────────────────────────

async function TabCompras({ desde, hasta, puedeExportar }: { desde: string; hasta: string; puedeExportar: boolean }) {
  const supabase = await createClient()
  const { data: ocs } = await supabase
    .from('purchase_orders')
    .select('id, numero_oc, total, estado, created_at, suppliers(nombre)')
    .gte('created_at', `${desde}T00:00:00`)
    .lte('created_at', `${hasta}T23:59:59`)
    .order('created_at', { ascending: false })

  const lista = (ocs ?? []) as { id: string; numero_oc: string; total: number; estado: string; created_at: string; suppliers: { nombre: string } | { nombre: string }[] | null }[]
  const totalMonto = lista.reduce((s, o) => s + (o.total ?? 0), 0)
  const pendientes = lista.filter(o => o.estado === 'pendiente').length
  const recibidas  = lista.filter(o => o.estado?.startsWith('recibida')).length
  const enTransito = lista.filter(o => o.estado === 'en_transito').length

  const porProveedor: Record<string, { nombre: string; total: number; count: number }> = {}
  lista.forEach(o => {
    const sup = o.suppliers
    const nombre = (Array.isArray(sup) ? sup[0]?.nombre : (sup as { nombre: string } | null)?.nombre) ?? 'Sin proveedor'
    if (!porProveedor[nombre]) porProveedor[nombre] = { nombre, total: 0, count: 0 }
    porProveedor[nombre].total += o.total ?? 0
    porProveedor[nombre].count++
  })
  const proveedoresList = Object.values(porProveedor).sort((a, b) => b.total - a.total)
  const proveedoresRows = proveedoresList.map(p => [p.nombre, p.count, formatCLP(p.total)])
  const ocRows = lista.map(o => {
    const sup = o.suppliers
    const nombre = (Array.isArray(sup) ? sup[0]?.nombre : (sup as { nombre: string } | null)?.nombre) ?? '—'
    return [o.numero_oc, nombre, o.created_at.split('T')[0], o.estado?.replace(/_/g, ' ') ?? '—', formatCLP(o.total ?? 0)]
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Compras"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'KPIs', headers: ['Métrica', 'Valor'], rows: [['Total OCs', lista.length], ['Monto total', formatCLP(totalMonto)], ['Pendientes', pendientes], ['Recibidas', recibidas], ['En tránsito', enTransito]] },
            { titulo: 'Por proveedor', headers: ['Proveedor', 'OCs', 'Monto total'], rows: proveedoresRows },
            { titulo: 'Órdenes de compra', headers: ['N° OC', 'Proveedor', 'Fecha', 'Estado', 'Total'], rows: ocRows },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total OCs"     value={String(lista.length)}     colorIdx={0} />
        <KpiCard label="Monto total"   value={formatCLP(totalMonto)}    colorIdx={1} />
        <KpiCard label="Pendientes"    value={String(pendientes)}        colorIdx={4} />
        <KpiCard label="Recibidas"     value={String(recibidas)}         colorIdx={2} />
      </div>
      {enTransito > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-700">
          📦 {enTransito} OC(s) en tránsito
        </div>
      )}
      {proveedoresList.length > 0 && (
        <Section title="Por proveedor">
          <Tabla
            headers={['Proveedor', 'OCs', 'Monto total']}
            rows={proveedoresRows}
          />
        </Section>
      )}
      <Section title="Órdenes de compra del período">
        <Tabla
          headers={['N° OC', 'Proveedor', 'Fecha', 'Estado', 'Total']}
          rows={ocRows}
        />
      </Section>
    </div>
  )
}

// ── Tab: Punto de Equilibrio ──────────────────────────────────────────────────

import PuntoEquilibrioCalculator from '@/components/informes/PuntoEquilibrioCalculator'

async function TabEquilibrio({ desde, hasta, puedeExportar }: { desde: string; hasta: string; puedeExportar: boolean }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`
  const diasPeriodo = Math.max(1, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000) + 1)

  const [{ data: gastosFijos }, { data: empleados }, { data: ventasPeriodo }, { data: items30 }] = await Promise.all([
    supabase.from('gastos_fijos').select('monto').eq('activo', true).then(r => r.error ? { data: [] } : r),
    supabase.from('empleados_taller').select('sueldo_base').eq('activo', true).then(r => r.error ? { data: [] } : r),
    supabase.from('sales').select('total').eq('anulada', false)
      .gte('created_at', desdeIso).lte('created_at', hastaIso).limit(500),
    supabase.from('sale_items').select('precio_unitario, precio_costo, cantidad')
      .gte('created_at', desdeIso).lte('created_at', hastaIso).limit(1000),
  ])

  // Total gastos fijos
  const totalGastosFijos = (gastosFijos ?? []).reduce((s: number, g: Record<string, unknown>) => s + ((g.monto as number) ?? 0), 0)

  // Total costo empleados (sueldo + 4.82% cargas empleador)
  const CARGA_EMPLEADOR = 1.0482
  const totalEmpleados = (empleados ?? []).reduce((s: number, e: Record<string, unknown>) => s + Math.round(((e.sueldo_base as number) ?? 0) * CARGA_EMPLEADOR), 0)

  const costosFijosTotales = totalGastosFijos + totalEmpleados

  // PV y CV promedio del período seleccionado
  const ventasList = (ventasPeriodo ?? []) as { total: number }[]
  const itemsList = (items30 ?? []) as { precio_unitario: number; precio_costo: number; cantidad: number }[]

  const totalVentasPeriodo = ventasList.reduce((s, v) => s + v.total, 0)
  const pvPromedio = ventasList.length > 0 ? Math.round(totalVentasPeriodo / ventasList.length) : 0

  const totalUnidades = itemsList.reduce((s, i) => s + (i.cantidad ?? 1), 0)
  const totalCosto = itemsList.reduce((s, i) => s + (i.precio_costo ?? 0) * (i.cantidad ?? 1), 0)
  const cvPromedio = totalUnidades > 0 ? Math.round(totalCosto / totalUnidades) : 0

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Punto de equilibrio"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[{
            titulo: 'Estructura de costos fijos',
            headers: ['Métrica', 'Valor'],
            rows: [
              ['Gastos operacionales', formatCLP(totalGastosFijos)],
              ['Costo total empleados (con imposiciones)', formatCLP(totalEmpleados)],
              ['TOTAL costos fijos (CF)', formatCLP(costosFijosTotales)],
              ['PV promedio', formatCLP(pvPromedio)],
              ['CV promedio', formatCLP(cvPromedio)],
              ['Ventas del período', formatCLP(totalVentasPeriodo)],
            ],
          }]}
        />
      </div>
      {/* Resumen costos fijos */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-3">
          <h2 className="font-semibold text-white">Estructura de Costos Fijos Mensuales</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Datos desde <span className="text-white">Configuración → Gastos fijos y empleados</span>
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x">
          {[
            { label: 'Gastos operacionales', value: totalGastosFijos, color: 'text-blue-700' },
            { label: 'Costo total empleados (con imposiciones)', value: totalEmpleados, color: 'text-purple-700' },
            { label: 'TOTAL COSTOS FIJOS (CF)', value: costosFijosTotales, color: 'text-green-700 text-2xl font-bold' },
          ].map((item, i) => (
            <div key={i} className="px-5 py-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
              <p className={`font-bold mt-1 ${item.color}`}>{formatCLP(item.value)}</p>
            </div>
          ))}
        </div>
        {ventasList.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t text-xs text-gray-500">
            Promedios de últimos 30 días: PV = {formatCLP(pvPromedio)}/venta · CV = {formatCLP(cvPromedio)}/unidad
            (precargados como referencia — ajusta según tu producto/servicio)
          </div>
        )}
      </div>

      <PuntoEquilibrioCalculator
        costosFijos={costosFijosTotales}
        pvPromedio={pvPromedio}
        cvPromedio={cvPromedio}
        ventasActualesPeriodo={totalVentasPeriodo}
        diasPeriodo={diasPeriodo}
      />
    </div>
  )
}

// ── Tab: Gastos ───────────────────────────────────────────────────────────────

async function TabGastos({ desde, hasta, puedeExportar }: { desde: string; hasta: string; puedeExportar: boolean }) {
  const supabase = await createClient()

  // Período anterior (misma duración)
  const diasPeriodo = Math.max(1, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000))
  const prevHasta = new Date(new Date(desde).getTime() - 86400000).toISOString().split('T')[0]
  const prevDesde = new Date(new Date(desde).getTime() - diasPeriodo * 86400000).toISOString().split('T')[0]

  const [{ data: gastos, error }, { data: gastosPrev }] = await Promise.all([
    supabase.from('gastos').select('id, concepto, monto, categoria, metodo_pago, tipo_documento, numero_documento, fecha').gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false }),
    supabase.from('gastos').select('monto, categoria, fecha').gte('fecha', prevDesde).lte('fecha', prevHasta),
  ])

  if (error?.message.toLowerCase().includes('gastos')) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
        <p className="text-lg font-semibold text-amber-800 mb-1">Módulo de gastos no configurado</p>
        <p className="text-sm text-amber-700">Ejecuta la migración SQL de gastos en Supabase para activar este módulo.</p>
      </div>
    )
  }

  type GRow = { id: string; concepto: string; monto: number; categoria: string; metodo_pago: string; tipo_documento: string | null; numero_documento: string | null; fecha: string }
  const lista = (gastos ?? []) as GRow[]
  const totalGastos = lista.reduce((s, g) => s + g.monto, 0)
  const totalPrev   = ((gastosPrev ?? []) as { monto: number }[]).reduce((s, g) => s + g.monto, 0)

  const dias = Math.max(1, diasPeriodo + 1)
  const promDiario = Math.round(totalGastos / dias)

  const porCategoria: Record<string, number> = {}
  lista.forEach(g => { porCategoria[g.categoria] = (porCategoria[g.categoria] ?? 0) + g.monto })
  const catData = Object.entries(porCategoria).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const porCategoriaPrev: Record<string, number> = {}
  ;((gastosPrev ?? []) as { monto: number; categoria: string }[]).forEach(g => { porCategoriaPrev[g.categoria] = (porCategoriaPrev[g.categoria] ?? 0) + g.monto })

  const porMetodo: Record<string, number> = {}
  lista.forEach(g => { porMetodo[g.metodo_pago] = (porMetodo[g.metodo_pago] ?? 0) + g.monto })

  // Tendencia diaria
  const porDia: Record<string, number> = {}
  lista.forEach(g => { porDia[g.fecha] = (porDia[g.fecha] ?? 0) + g.monto })
  const tendenciaDiaria = Object.entries(porDia).sort().map(([fecha, total]) => ({ fecha: fecha.slice(5), total }))

  // Top conceptos
  const porConcepto: Record<string, number> = {}
  lista.forEach(g => { porConcepto[g.concepto] = (porConcepto[g.concepto] ?? 0) + g.monto })
  const topConceptos = Object.entries(porConcepto).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const gVar = variacion(totalGastos, totalPrev)
  const maxCategoriasComp = [...new Set([...Object.keys(porCategoria), ...Object.keys(porCategoriaPrev)])].slice(0, 8)

  const categoriaCompRows = maxCategoriasComp.map(cat => {
    const act = porCategoria[cat] ?? 0
    const prev = porCategoriaPrev[cat] ?? 0
    const v = variacion(act, prev)
    return [cat, prev ? formatCLP(prev) : '—', formatCLP(act), v.pct, totalGastos ? `${Math.round(act * 100 / totalGastos)}%` : '—']
  })
  const topConceptosRows = topConceptos.map(([c, v]) => [c, formatCLP(v), totalGastos ? `${Math.round(v * 100 / totalGastos)}%` : '—'])
  const metodoGastoRows = Object.entries(porMetodo).sort((a, b) => b[1] - a[1]).map(([m, v]) => [m, formatCLP(v), totalGastos ? `${Math.round(v / totalGastos * 100)}%` : '—'])
  const docLabel = (g: GRow) => g.tipo_documento
    ? `${g.tipo_documento === 'factura' ? 'Factura' : 'Boleta'}${g.numero_documento ? ` ${g.numero_documento}` : ''}`
    : '—'
  const registroGastosRows = lista.map(g => [g.fecha, g.concepto, g.categoria, g.metodo_pago, docLabel(g), formatCLP(g.monto)])

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Gastos"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'KPIs', headers: ['Métrica', 'Valor'], rows: [['Total gastos', formatCLP(totalGastos)], ['N° registros', lista.length], ['Promedio diario', formatCLP(promDiario)], ['vs período anterior', formatCLP(totalPrev)]] },
            { titulo: 'Por categoría (actual vs anterior)', headers: ['Categoría', 'Anterior', 'Actual', 'Variación', 'Part. %'], rows: categoriaCompRows },
            { titulo: 'Top conceptos', headers: ['Concepto', 'Total', 'Part. %'], rows: topConceptosRows },
            { titulo: 'Por método de pago', headers: ['Método', 'Total', 'Part. %'], rows: metodoGastoRows },
            { titulo: 'Registro de gastos', headers: ['Fecha', 'Concepto', 'Categoría', 'Método', 'Documento', 'Monto'], rows: registroGastosRows },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total gastos"       value={formatCLP(totalGastos)} colorIdx={4} />
        <KpiCard label="N° registros"       value={String(lista.length)}   colorIdx={0} />
        <KpiCard label="Promedio diario"    value={formatCLP(promDiario)}  colorIdx={2} />
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">vs período anterior</p>
          <p className={`text-2xl font-bold mt-1 ${gVar.color}`}>{gVar.pct}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatCLP(totalPrev)} período ant.</p>
        </div>
      </div>

      {/* Tendencia diaria */}
      {tendenciaDiaria.length > 1 && (
        <Section title="Tendencia de gastos diarios">
          <GraficoBarrasCLP data={tendenciaDiaria} dataKey="total" nameKey="fecha" height={200} />
        </Section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Por categoría con comparativa */}
        {catData.length > 0 && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-gray-50 border-b px-4 py-3">
              <h2 className="font-semibold text-gray-800 text-sm">Por categoría — actual vs anterior</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Categoría', 'Anterior', 'Actual', 'Variación', 'Part. %'].map((h, i) => (
                      <th key={i} className={`px-3 py-2.5 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {maxCategoriasComp.map((cat, i) => {
                    const row = categoriaCompRows[i]
                    const v = variacion(porCategoria[cat] ?? 0, porCategoriaPrev[cat] ?? 0)
                    return (
                      <tr key={cat} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 font-medium text-gray-900">{row[0]}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{row[1]}</td>
                        <td className="px-3 py-2.5 text-right font-semibold">{row[2]}</td>
                        <td className={`px-3 py-2.5 text-right font-bold text-xs ${v.color}`}>{row[3]}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500">{row[4]}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gráfico pastel categorías */}
        {catData.length > 0 && (
          <Section title="Distribución por categoría">
            <GraficoPastel data={catData} />
          </Section>
        )}
      </div>

      {/* Top conceptos */}
      {topConceptos.length > 0 && (
        <Section title="Top 10 conceptos de gasto">
          <Tabla
            headers={['Concepto', 'Total', 'Part. %']}
            rows={topConceptosRows}
          />
        </Section>
      )}

      {Object.keys(porMetodo).length > 0 && (
        <Section title="Por método de pago">
          <Tabla
            headers={['Método', 'Total', 'Part. %']}
            rows={metodoGastoRows}
          />
        </Section>
      )}

      <Section title="Registro de gastos">
        <Tabla
          headers={['Fecha', 'Concepto', 'Categoría', 'Método', 'Documento', 'Monto']}
          rows={registroGastosRows}
        />
      </Section>
    </div>
  )
}

// ── Tab: Clientes ─────────────────────────────────────────────────────────────

async function TabClientes({ desde, hasta, puedeExportar }: { desde: string; hasta: string; puedeExportar: boolean }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  // Fecha hace 90 días para detectar clientes inactivos
  const hace90 = new Date(new Date().getTime() - 90 * 86400000).toISOString()

  const [
    { data: ventas },
    { data: reparaciones },
    { data: clientesNuevos },
    { data: todosClientes },
  ] = await Promise.all([
    supabase.from('sales').select('total, customer_id, customers(id, nombre), created_at').eq('anulada', false).gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('repair_orders').select('precio_servicio, presupuesto_estimado, customer_id, customers(id, nombre), created_at, estado').gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('customers').select('id, nombre, created_at').gte('created_at', desdeIso).lte('created_at', hastaIso).order('created_at', { ascending: false }),
    supabase.from('customers').select('id, nombre, created_at'),
  ])

  type VRow = { total: number; customer_id: string | null; customers: { id: string; nombre: string } | null; created_at: string }
  type RRow = { precio_servicio: number | null; presupuesto_estimado: number | null; customer_id: string | null; customers: { id: string; nombre: string } | null; created_at: string; estado: string }

  // Consolidar ingresos por cliente
  const ingresosPorCliente: Record<string, { id: string; nombre: string; ingresos: number; visitas: number }> = {}

  ;(ventas ?? []).forEach((v: unknown) => {
    const vv = v as VRow
    if (!vv.customer_id || !vv.customers) return
    const k = vv.customer_id
    if (!ingresosPorCliente[k]) ingresosPorCliente[k] = { id: k, nombre: vv.customers.nombre, ingresos: 0, visitas: 0 }
    ingresosPorCliente[k].ingresos += vv.total
    ingresosPorCliente[k].visitas += 1
  })
  ;(reparaciones ?? []).forEach((r: unknown) => {
    const rr = r as RRow
    if (!rr.customer_id || !rr.customers) return
    const k = rr.customer_id
    const monto = rr.precio_servicio ?? rr.presupuesto_estimado ?? 0
    if (!ingresosPorCliente[k]) ingresosPorCliente[k] = { id: k, nombre: rr.customers.nombre, ingresos: 0, visitas: 0 }
    ingresosPorCliente[k].ingresos += monto
    ingresosPorCliente[k].visitas += 1
  })

  const top10 = Object.values(ingresosPorCliente)
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 10)

  // Clientes inactivos: tienen historial pero ninguna actividad en 90 días
  // Detectamos consultando quiénes SÍ tienen actividad reciente
  const { data: activosRecientes } = await supabase
    .from('repair_orders')
    .select('customer_id')
    .gte('created_at', hace90)
    .not('customer_id', 'is', null)
  const { data: ventasRecientes } = await supabase
    .from('sales')
    .select('customer_id')
    .gte('created_at', hace90)
    .eq('anulada', false)
    .not('customer_id', 'is', null)

  const activosIds = new Set([
    ...(activosRecientes ?? []).map((r: { customer_id: string | null }) => r.customer_id),
    ...(ventasRecientes ?? []).map((v: { customer_id: string | null }) => v.customer_id),
  ])

  // Clientes inactivos = tienen cuenta pero no están en activos recientes
  const totalClientes = (todosClientes ?? []).length
  const inactivosCount = Math.max(0, totalClientes - activosIds.size)

  // Visitas frecuentes (top clientes del período)
  const frecuentes = Object.values(ingresosPorCliente)
    .sort((a, b) => b.visitas - a.visitas)
    .slice(0, 10)

  const nuevosList = (clientesNuevos ?? []) as { id: string; nombre: string; created_at: string }[]
  const totalIngresosPeriodo = Object.values(ingresosPorCliente).reduce((s, c) => s + c.ingresos, 0)
  const clientesActivosPeriodo = Object.keys(ingresosPorCliente).length

  const top10Rows = top10.map((c, i) => [i + 1, c.nombre, c.visitas, formatCLP(c.ingresos), totalIngresosPeriodo ? `${Math.round(c.ingresos * 100 / totalIngresosPeriodo)}%` : '—'])
  const frecuentesRows = frecuentes.map((c, i) => [i + 1, c.nombre, c.visitas, formatCLP(c.ingresos)])
  const nuevosRows = nuevosList.map(c => [c.nombre, new Date(c.created_at).toLocaleDateString('es-CL')])

  return (
    <div className="space-y-5">

      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Clientes"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'KPIs', headers: ['Métrica', 'Valor'], rows: [['Clientes activos', clientesActivosPeriodo], ['Clientes nuevos', nuevosList.length], ['Ingresos generados', formatCLP(totalIngresosPeriodo)], ['Clientes inactivos (90 días)', inactivosCount]] },
            { titulo: 'Top 10 por ingresos', headers: ['#', 'Cliente', 'Transacciones', 'Ingresos', '% del total'], rows: top10Rows },
            { titulo: 'Más frecuentes', headers: ['#', 'Cliente', 'Visitas', 'Ingresos'], rows: frecuentesRows },
            { titulo: 'Clientes nuevos', headers: ['Nombre', 'Registrado el'], rows: nuevosRows },
          ]}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Clientes activos" value={`${clientesActivosPeriodo}`} sub="con transacciones en el período" colorIdx={0} />
        <KpiCard label="Clientes nuevos" value={`${nuevosList.length}`} sub="registrados en el período" colorIdx={1} />
        <KpiCard label="Ingresos generados" value={formatCLP(totalIngresosPeriodo)} sub="por clientes identificados" colorIdx={2} />
        <KpiCard label="Clientes inactivos" value={`${inactivosCount}`} sub="sin actividad en 90 días" colorIdx={inactivosCount > 20 ? 4 : 2} />
      </div>

      {/* Top 10 por ingresos */}
      {top10.length > 0 && (
        <Section title="Top 10 clientes por ingresos en el período">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['#', 'Cliente', 'Transacciones', 'Ingresos', '% del total'].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-xs text-gray-500 font-medium ${i <= 1 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {top10.map((c, i) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 font-bold">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{c.nombre}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{c.visitas}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{formatCLP(c.ingresos)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{totalIngresosPeriodo ? `${Math.round(c.ingresos * 100 / totalIngresosPeriodo)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Más frecuentes */}
      {frecuentes.length > 0 && (
        <Section title="Clientes más frecuentes (por N° de visitas)">
          <GraficoBarrasNum
            data={frecuentes.slice(0, 8).map(c => ({ name: c.nombre.split(' ').slice(0, 2).join(' '), value: c.visitas }))}
            dataKey="value"
            nameKey="name"
            height={200}
          />
        </Section>
      )}

      {/* Clientes nuevos */}
      {nuevosList.length > 0 && (
        <Section title={`Clientes nuevos en el período (${nuevosList.length})`}>
          <Tabla
            headers={['Nombre', 'Registrado el']}
            rows={nuevosRows.slice(0, 30)}
          />
        </Section>
      )}

      {nuevosList.length === 0 && clientesActivosPeriodo === 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">No hay datos de clientes para el período seleccionado.</p>
        </div>
      )}

    </div>
  )
}

// ── Tab: Movimientos ──────────────────────────────────────────────────────────

async function TabMovimientos({ desde, hasta, puedeExportar }: { desde: string; hasta: string; puedeExportar: boolean }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const [
    { data: ventas },
    { data: ocsContado },
    { data: pagosOC },
    { data: liquidaciones },
    { data: gastosData },
    { data: previsionales },
    { data: f29s },
    { data: obligaciones },
  ] = await Promise.all([
    supabase.from('sales').select('id, numero_venta, total, created_at').eq('anulada', false)
      .gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('purchase_orders').select('id, numero_oc, total, fecha_recepcion, suppliers(nombre)')
      .neq('metodo_pago', 'credito').not('fecha_recepcion', 'is', null)
      .gte('fecha_recepcion', desdeIso).lte('fecha_recepcion', hastaIso),
    supabase.from('purchase_order_payments').select('id, monto, fecha, purchase_orders(numero_oc, suppliers(nombre))')
      .gte('fecha', desde).lte('fecha', hasta).then(r => r.error ? { data: [] } : r),
    supabase.from('supplier_settlements').select('id, monto, fecha, suppliers(nombre)')
      .gte('fecha', desde).lte('fecha', hasta).then(r => r.error ? { data: [] } : r),
    supabase.from('gastos').select('id, concepto, monto, fecha')
      .gte('fecha', desde).lte('fecha', hasta).then(r => r.error ? { data: [] } : r),
    supabase.from('pagos_previsionales').select('id, sueldo_pagado, afp_pagado, salud_pagado, fecha_pago, empleados_taller(nombre)')
      .eq('estado', 'pagado').gte('fecha_pago', desde).lte('fecha_pago', hasta).then(r => r.error ? { data: [] } : r),
    supabase.from('declaraciones_f29').select('id, mes, iva_credito, tasa_ppm, fecha_pago')
      .not('fecha_pago', 'is', null).gte('fecha_pago', desde).lte('fecha_pago', hasta).then(r => r.error ? { data: [] } : r),
    supabase.from('obligaciones_tributarias').select('id, nombre, monto, fecha_pago')
      .not('fecha_pago', 'is', null).gte('fecha_pago', desde).lte('fecha_pago', hasta).then(r => r.error ? { data: [] } : r),
  ])

  type Mov = { fecha: string; tipo: string; descripcion: string; ingreso: number; egreso: number }
  const movimientos: Mov[] = []

  type SupRel = { nombre: string } | { nombre: string }[] | null
  const nombreSup = (s: SupRel) => (Array.isArray(s) ? s[0]?.nombre : s?.nombre) ?? '—'

  ;(ventas ?? []).forEach((v: { id: string; numero_venta: string; total: number; created_at: string }) => {
    movimientos.push({ fecha: v.created_at.split('T')[0], tipo: 'Venta', descripcion: v.numero_venta, ingreso: v.total, egreso: 0 })
  })
  ;(ocsContado ?? []).forEach((o: { id: string; numero_oc: string; total: number; fecha_recepcion: string; suppliers: SupRel }) => {
    movimientos.push({ fecha: o.fecha_recepcion.split('T')[0], tipo: 'Compra', descripcion: `${o.numero_oc} — ${nombreSup(o.suppliers)}`, ingreso: 0, egreso: o.total ?? 0 })
  })
  ;(pagosOC ?? []).forEach((p: { id: string; monto: number; fecha: string; purchase_orders: { numero_oc: string; suppliers: SupRel } | { numero_oc: string; suppliers: SupRel }[] | null }) => {
    const oc = Array.isArray(p.purchase_orders) ? p.purchase_orders[0] : p.purchase_orders
    movimientos.push({ fecha: p.fecha, tipo: 'Abono OC', descripcion: `${oc?.numero_oc ?? '—'} — ${nombreSup(oc?.suppliers ?? null)}`, ingreso: 0, egreso: p.monto })
  })
  ;(liquidaciones ?? []).forEach((l: { id: string; monto: number; fecha: string; suppliers: SupRel }) => {
    movimientos.push({ fecha: l.fecha, tipo: 'Liquidación proveedor', descripcion: nombreSup(l.suppliers), ingreso: 0, egreso: l.monto })
  })
  ;(gastosData ?? []).forEach((g: { id: string; concepto: string; monto: number; fecha: string }) => {
    movimientos.push({ fecha: g.fecha, tipo: 'Gasto', descripcion: g.concepto, ingreso: 0, egreso: g.monto })
  })
  ;(previsionales ?? []).forEach((p: { id: string; sueldo_pagado: number; afp_pagado: number; salud_pagado: number; fecha_pago: string; empleados_taller: { nombre: string } | { nombre: string }[] | null }) => {
    const emp = Array.isArray(p.empleados_taller) ? p.empleados_taller[0] : p.empleados_taller
    const total = (p.sueldo_pagado ?? 0) + (p.afp_pagado ?? 0) + (p.salud_pagado ?? 0)
    movimientos.push({ fecha: p.fecha_pago, tipo: 'Previsión', descripcion: emp?.nombre ?? '—', ingreso: 0, egreso: total })
  })

  // F29: el monto no se guarda, se recalcula desde las ventas del mes declarado
  type F29Row = { id: string; mes: string; iva_credito: number; tasa_ppm: number; fecha_pago: string }
  await Promise.all(((f29s ?? []) as F29Row[]).map(async f29 => {
    const inicioDate = new Date(`${f29.mes}T00:00:00`)
    const finDate = new Date(inicioDate.getFullYear(), inicioDate.getMonth() + 1, 0)
    const { data: ventasMes } = await supabase.from('sales').select('total').eq('anulada', false)
      .gte('created_at', `${f29.mes}T00:00:00.000Z`).lte('created_at', `${finDate.toISOString().split('T')[0]}T23:59:59.999Z`)
    const totalBruto = (ventasMes ?? []).reduce((s, v) => s + (v.total ?? 0), 0)
    const neto = calcularPrecioSinIva(totalBruto)
    const ivaDebito = calcularIva(neto)
    const ppm = Math.round(neto * (f29.tasa_ppm ?? 3) / 100)
    const totalF29 = Math.max(0, ivaDebito - (f29.iva_credito ?? 0)) + ppm
    movimientos.push({ fecha: f29.fecha_pago, tipo: 'F29 (IVA+PPM)', descripcion: `Período ${f29.mes.slice(0, 7)}`, ingreso: 0, egreso: totalF29 })
  }))

  ;(obligaciones ?? []).forEach((o: { id: string; nombre: string; monto: number; fecha_pago: string }) => {
    movimientos.push({ fecha: o.fecha_pago, tipo: 'Obligación tributaria', descripcion: o.nombre, ingreso: 0, egreso: o.monto })
  })

  movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha))

  const totalIngresos = movimientos.reduce((s, m) => s + m.ingreso, 0)
  const totalEgresos = movimientos.reduce((s, m) => s + m.egreso, 0)
  const balanceNeto = totalIngresos - totalEgresos

  const porCategoria: Record<string, { ingreso: number; egreso: number }> = {}
  movimientos.forEach(m => {
    if (!porCategoria[m.tipo]) porCategoria[m.tipo] = { ingreso: 0, egreso: 0 }
    porCategoria[m.tipo].ingreso += m.ingreso
    porCategoria[m.tipo].egreso += m.egreso
  })
  const categoriaRows = Object.entries(porCategoria).map(([tipo, v]) => [tipo, formatCLP(v.ingreso), formatCLP(v.egreso)])
  const movimientosRows = movimientos.map(m => [m.fecha, m.tipo, m.descripcion, m.ingreso ? formatCLP(m.ingreso) : '—', m.egreso ? formatCLP(m.egreso) : '—'])

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <ExportButtons
          visible={puedeExportar}
          titulo="Movimientos contables"
          subtitulo={`Período: ${desde} a ${hasta}`}
          secciones={[
            { titulo: 'Resumen', headers: ['Métrica', 'Valor'], rows: [['Total ingresos', formatCLP(totalIngresos)], ['Total egresos', formatCLP(totalEgresos)], ['Balance neto', formatCLP(balanceNeto)]] },
            { titulo: 'Por categoría', headers: ['Categoría', 'Ingresos', 'Egresos'], rows: categoriaRows },
            { titulo: 'Libro de movimientos', headers: ['Fecha', 'Tipo', 'Descripción', 'Ingreso', 'Egreso'], rows: movimientosRows },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Total ingresos" value={formatCLP(totalIngresos)} colorIdx={2} />
        <KpiCard label="Total egresos" value={formatCLP(totalEgresos)} colorIdx={4} />
        <KpiCard label="Balance neto" value={formatCLP(balanceNeto)} colorIdx={balanceNeto >= 0 ? 1 : 4} />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
        ⚠️ No incluye abonos de clientes en OTs (depósitos) — revisa con tu contador si esos movimientos ya quedan reflejados en el cobro final.
      </div>

      <Section title="Por categoría">
        <Tabla headers={['Categoría', 'Ingresos', 'Egresos']} rows={categoriaRows} />
      </Section>

      <Section title="Libro de movimientos">
        <Tabla headers={['Fecha', 'Tipo', 'Descripción', 'Ingreso', 'Egreso']} rows={movimientosRows} />
      </Section>

      {movimientos.length === 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">No hay movimientos registrados para el período seleccionado.</p>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; desde?: string; hasta?: string }>
}) {
  const params = await searchParams
  const desde = params.desde ?? hace30Dias()
  const hasta = params.hasta ?? formatDate(new Date())

  // Permisos del usuario actual
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  const { data: profileAuth } = await supabaseAuth
    .from('user_profiles')
    .select('permisos_modulos, store_id, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesAuth = profileAuth?.roles as { nombre?: string } | { nombre?: string }[] | null | undefined
  const rolAuth = (Array.isArray(rolesAuth) ? rolesAuth[0]?.nombre : rolesAuth?.nombre) ?? ''
  const permisosAuth = profileAuth?.permisos_modulos as Record<string, boolean> | null

  const soloPropios    = rolAuth !== 'administrador' && tieneSubPermiso('informes.solo_propios', rolAuth, permisosAuth)
  const verVentas      = rolAuth === 'administrador' || tieneSubPermiso('informes.ver_ventas',       rolAuth, permisosAuth)
  const verRentab      = rolAuth === 'administrador' || tieneSubPermiso('informes.ver_rentabilidad', rolAuth, permisosAuth)
  const soloUserId     = soloPropios ? user!.id : undefined
  const puedeExportar     = tieneSubPermiso('informes.exportar', rolAuth, permisosAuth)
  const puedePersonalizado = tieneSubPermiso('informes.personalizado', rolAuth, permisosAuth)

  // Módulos activos según el plan de la tienda (service role para evitar RLS)
  const storeId = (profileAuth as { store_id?: string } | null)?.store_id
  const admin = createServiceClient()
  let modulosDelPlan: Set<ModuloNegocio> | null = null
  if (storeId) {
    const { data: storeModules } = await admin
      .from('store_modules')
      .select('module_key')
      .eq('store_id', storeId)
      .eq('activo', true)
    if (storeModules && storeModules.length > 0) {
      modulosDelPlan = new Set(storeModules.map((m: { module_key: string }) => m.module_key as ModuloNegocio))
    }
  }
  const tieneModulo = (m: ModuloNegocio) => !modulosDelPlan || modulosDelPlan.has(m)
  const tabDisponible = (t: string) => {
    const modulo = MODULO_POR_TAB[t]
    return modulo === null || modulo === undefined || tieneModulo(modulo)
  }
  const tieneTaller = tieneModulo('taller')

  // Tab por defecto según permisos, con fallback si el plan no incluye ese módulo
  const candidatosTab = rolAuth === 'administrador'
    ? ['resumen', 'ventas', 'rentabilidad', 'inventario']
    : [verVentas && 'ventas', verRentab && 'rentabilidad', 'inventario'].filter((t): t is string => !!t)
  const defaultTab = candidatosTab.find(tabDisponible) ?? 'inventario'
  const tabPedido = params.tab ?? defaultTab
  const tab = tabDisponible(tabPedido) ? tabPedido : defaultTab

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📊</span>
          <h1 className="text-2xl font-bold text-gray-900">Informes & BI</h1>
        </div>
        {puedePersonalizado && (
          <Link
            href="/informes/personalizado"
            className="text-sm font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-1.5 transition-colors"
          >
            🧩 Crear reporte a medida
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border p-4">
        <Suspense>
          <FiltroFechas currentTab={tab} desde={desde} hasta={hasta} tabsOcultas={Object.keys(MODULO_POR_TAB).filter(t => !tabDisponible(t))} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="text-center py-16 text-gray-400 text-sm">Cargando datos...</div>}>
        {tab === 'resumen'      && <TabResumen       desde={desde} hasta={hasta} puedeExportar={puedeExportar} tieneTaller={tieneTaller} />}
        {tab === 'ventas'       && verVentas  && tabDisponible('ventas') && <TabVentas       desde={desde} hasta={hasta} puedeExportar={puedeExportar} tieneTaller={tieneTaller} />}
        {tab === 'taller'       && tabDisponible('taller') && <TabTaller        desde={desde} hasta={hasta} puedeExportar={puedeExportar} />}
        {tab === 'inventario'   && <TabInventario    desde={desde} hasta={hasta} puedeExportar={puedeExportar} />}
        {tab === 'rentabilidad' && verRentab  && tabDisponible('rentabilidad') && <TabRentabilidad  desde={desde} hasta={hasta} soloUserId={soloUserId} puedeExportar={puedeExportar} />}
        {tab === 'servicios'    && tabDisponible('servicios') && <TabServicios desde={desde} hasta={hasta} puedeExportar={puedeExportar} />}
        {tab === 'compras'      && tabDisponible('compras') && <TabCompras   desde={desde} hasta={hasta} puedeExportar={puedeExportar} />}
        {tab === 'gastos'       && <TabGastos    desde={desde} hasta={hasta} puedeExportar={puedeExportar} />}
        {tab === 'auditoria'    && rolAuth === 'administrador' && <TabAuditoria desde={desde} hasta={hasta} puedeExportar={puedeExportar} />}
        {tab === 'equilibrio'   && <TabEquilibrio desde={desde} hasta={hasta} puedeExportar={puedeExportar} />}
        {tab === 'clientes'     && <TabClientes   desde={desde} hasta={hasta} puedeExportar={puedeExportar} />}
        {tab === 'movimientos'  && rolAuth === 'administrador' && tabDisponible('movimientos') && <TabMovimientos desde={desde} hasta={hasta} puedeExportar={puedeExportar} />}
        {tab === 'movimientos'  && rolAuth !== 'administrador' && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">No tienes acceso a la pestaña Movimientos.</div>}
        {/* Mensajes de acceso restringido */}
        {tab === 'ventas'       && !verVentas  && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">No tienes acceso a la pestaña Ventas.</div>}
        {tab === 'rentabilidad' && !verRentab  && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">No tienes acceso a la pestaña Rentabilidad.</div>}
        {!tabDisponible(tab) && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">Esta pestaña no está disponible en tu plan actual.</div>}
      </Suspense>
    </div>
  )
}
