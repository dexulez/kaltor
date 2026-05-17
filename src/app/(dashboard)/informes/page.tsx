import { createClient } from '@/lib/supabase/server'
import { formatCLP } from '@/lib/calculations'
import { Suspense, type ReactNode } from 'react'
import FiltroFechas from '@/components/informes/FiltroFechas'
import {
  GraficoBarrasCLP,
  GraficoBarrasNum,
  GraficoPastel,
  GraficoArea,
} from '@/components/informes/Charts'
import InformesExportActions from '@/components/informes/InformesExportActions'
import ImprimirInformeTecnico from '@/components/informes/ImprimirInformeTecnico'
import { tieneSubPermiso } from '@/lib/modulos'

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

function KpiCard({ label, value, sub, colorIdx = 0 }: { label: string; value: string; sub?: string; colorIdx?: number }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${kpiColor(colorIdx)}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
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

// ── Tab: Ventas ───────────────────────────────────────────────────────────────

async function TabVentas({ desde, hasta }: { desde: string; hasta: string }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const [{ data: ventas }, { data: saleItemsRaw }] = await Promise.all([
    supabase.from('sales').select('id, numero_venta, tipo, total, metodo_pago, tipo_documento, created_at, anulada, repair_order_id, comision_bancaria, customers(nombre)').gte('created_at', desdeIso).lte('created_at', hastaIso),
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
  if (idsOT.length > 0) {
    const { data: repItems } = await supabase.from('repair_items')
      .select('repair_order_id, cantidad, precio_costo, costo_envio')
      .in('repair_order_id', idsOT)
    ;(repItems ?? []).forEach(ri => {
      const c = (ri.cantidad ?? 1) * (ri.precio_costo ?? 0) + (ri.costo_envio ?? 0)
      costoRepPorOT[ri.repair_order_id] = (costoRepPorOT[ri.repair_order_id] ?? 0) + c
    })
  }

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

  return (
    <div className="space-y-5">
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
              {[
                { label: '🔧 Taller',        count: reparaciones.length, bruto: totRep, neto: netoRep, iva: ivaRep, ppm: ppmRep, costo: costoRepTaller, banco: comBancoTaller, util: utilRealTaller },
                { label: '🛒 Venta directa', count: directas.length,     bruto: totDir, neto: netoDir, iva: ivaDir, ppm: ppmDir, costo: costoProdDir,  banco: comBancoDir,  util: utilRealDir  },
                { label: 'TOTAL',            count: activas.length,      bruto: totalBruto, neto, iva, ppm, costo: costoTotal, banco: comBancoTotal, util: utilRealTotal },
              ].map((row, i) => (
                <tr key={i} className={i === 2 ? 'bg-gray-50 font-semibold border-t-2 border-gray-300' : 'hover:bg-gray-50'}>
                  <td className="px-3 py-2.5">{row.label}</td>
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
                {Object.entries(porMetodoCanal).sort((a, b) => (b[1].taller + b[1].directa) - (a[1].taller + a[1].directa)).map(([m, v]) => (
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
                {Object.entries(porDocCanal).sort((a, b) => (b[1].taller + b[1].directa) - (a[1].taller + a[1].directa)).map(([d, v]) => (
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
          <Tabla headers={['Fecha', 'Monto', 'Método']} rows={anuladas.map(v => [v.created_at.split('T')[0], formatCLP(v.total), v.metodo_pago ?? '—'])} />
        </Section>
      )}
    </div>
  )
}

// ── Tab: Taller ───────────────────────────────────────────────────────────────

async function TabTaller({ desde, hasta }: { desde: string; hasta: string }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const { data: ots } = await supabase
    .from('repair_orders')
    .select(`
      id, estado, tipo_reparacion, precio_servicio, tecnico_id,
      created_at, fecha_entrega,
      equipment(marca, modelo),
      tecnico:user_profiles(nombre_completo)
    `)
    .gte('created_at', desdeIso)
    .lte('created_at', hastaIso)

  type OTT = {
    id: string; estado: string; tipo_reparacion: string | null
    precio_servicio: number | null; tecnico_id: string | null
    created_at: string; fecha_entrega: string | null
    equipment: { marca: string; modelo: string } | null
    tecnico: { nombre_completo: string } | null
  }
  const lista = (ots ?? []) as unknown as OTT[]
  const entregadas = lista.filter(o => o.estado === 'entregado')
  const enGarantia = lista.filter(o => o.estado === 'en_garantia')

  const tiemposProm = entregadas.filter(o => o.fecha_entrega)
    .map(o => (new Date(o.fecha_entrega!).getTime() - new Date(o.created_at).getTime()) / 86400000)
  const promDias = tiemposProm.length
    ? (tiemposProm.reduce((a, b) => a + b, 0) / tiemposProm.length).toFixed(1) : '—'

  const porEstado: Record<string, number> = {}
  lista.forEach(o => { porEstado[o.estado] = (porEstado[o.estado] ?? 0) + 1 })
  const pieEstado = Object.entries(porEstado).map(([name, value]) => ({ name, value }))

  const porTipo: Record<string, number> = {}
  lista.forEach(o => { const f = o.tipo_reparacion ?? 'otro'; porTipo[f] = (porTipo[f] ?? 0) + 1 })
  const barFalla = Object.entries(porTipo).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  const porTec: Record<string, { nombre: string; total: number; entregadas: number; ingresos: number }> = {}
  lista.forEach(o => {
    const k = o.tecnico_id ?? 'sin_asignar'
    const nombre = o.tecnico?.nombre_completo ?? 'Sin asignar'
    if (!porTec[k]) porTec[k] = { nombre, total: 0, entregadas: 0, ingresos: 0 }
    porTec[k].total++
    if (o.estado === 'entregado' || o.estado === 'para_entrega') {
      porTec[k].entregadas++
      porTec[k].ingresos += o.precio_servicio ?? 0
    }
  })
  const tecRows = Object.values(porTec).sort((a, b) => b.entregadas - a.entregadas)
    .map(t => [t.nombre, t.total, t.entregadas, formatCLP(t.ingresos)])

  const porMarca: Record<string, number> = {}
  lista.forEach(o => { const m = o.equipment?.marca ?? 'Otra'; porMarca[m] = (porMarca[m] ?? 0) + 1 })
  const barMarca = Object.entries(porMarca).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total OTs" value={`${lista.length}`} colorIdx={0} />
        <KpiCard label="Entregadas" value={`${entregadas.length}`} sub={`${lista.length ? Math.round(entregadas.length * 100 / lista.length) : 0}%`} colorIdx={1} />
        <KpiCard label="Tiempo promedio" value={`${promDias} días`} colorIdx={2} />
        <KpiCard label="En garantía" value={`${enGarantia.length}`} colorIdx={4} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="OTs por estado"><GraficoPastel data={pieEstado} height={220} /></Section>
        <Section title="Tipo de reparación más frecuente">
          <GraficoBarrasNum data={barFalla} dataKey="value" nameKey="name" color="#8b5cf6" height={220} />
        </Section>
      </div>
      <Section title="Rendimiento por técnico">
        <Tabla headers={['Técnico', 'OTs asignadas', 'Entregadas', 'Ingresos generados']} rows={tecRows} />
      </Section>
      <Section title="OTs por marca de equipo">
        <GraficoBarrasNum data={barMarca} dataKey="value" nameKey="name" color="#06b6d4" height={200} />
      </Section>
    </div>
  )
}

// ── Tab: Inventario ───────────────────────────────────────────────────────────

async function TabInventario({ desde, hasta }: { desde: string; hasta: string }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const [{ data: productos }, { data: movimientos }, { data: comprasRec }] = await Promise.all([
    supabase.from('products').select('*, product_categories(nombre)').eq('activo', true),
    supabase.from('stock_movements').select('*').gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('purchase_orders').select('total').in('estado', ['recibida_completa', 'recibida_parcial']),
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

  return (
    <div className="space-y-5">
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

async function TabRentabilidad({ desde, hasta, soloUserId }: { desde: string; hasta: string; soloUserId?: string }) {
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

  return (
    <div className="space-y-5">

      {/* Banner personal si es vista filtrada */}
      {soloUserId && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-center gap-2">
          <span className="text-lg">👤</span>
          <span>Mostrando <strong>solo tus OTs entregadas</strong> en el período seleccionado.</span>
        </div>
      )}

      {/* Botón imprimir */}
      <div className="flex justify-end">
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

async function TabServicios({ desde, hasta }: { desde: string; hasta: string }) {
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

  return (
    <div className="space-y-5">
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
                rows={ranking.map(r => [
                  r.nombre,
                  TIPO_LABEL[r.tipo] ?? r.tipo,
                  r.usos,
                  formatCLP(r.ingresos),
                  `${r.margen}%`,
                ])}
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

async function TabAuditoria({ desde, hasta }: { desde: string; hasta: string }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const [{ data: logs }, { data: ventasUsuario }, { data: otsTecnico }] = await Promise.all([
    supabase.from('audit_logs')
      .select('*').gte('created_at', desdeIso).lte('created_at', hastaIso)
      .order('created_at', { ascending: false }).limit(200),
    supabase.from('sales').select('created_by, total, anulada').gte('created_at', desdeIso).lte('created_at', hastaIso),
    supabase.from('repair_orders')
      .select(`tecnico_id, estado, precio_servicio, tecnico:user_profiles(nombre_completo)`)
      .gte('created_at', desdeIso).lte('created_at', hastaIso),
  ])

  const porVendedor: Record<string, { total: number; cantidad: number; anuladas: number }> = {}
  ;(ventasUsuario ?? []).forEach(v => {
    const k = v.created_by ?? 'sin_usuario'
    if (!porVendedor[k]) porVendedor[k] = { total: 0, cantidad: 0, anuladas: 0 }
    if (!v.anulada) { porVendedor[k].total += v.total; porVendedor[k].cantidad++ }
    else porVendedor[k].anuladas++
  })

  type OTAudit = {
    tecnico_id: string | null; estado: string
    precio_servicio: number | null
    tecnico: { nombre_completo: string } | null
  }
  const porTecAudit: Record<string, { nombre: string; total: number; entregadas: number; ingresos: number }> = {}
  ;((otsTecnico ?? []) as unknown as OTAudit[]).forEach(o => {
    const k = o.tecnico_id ?? 'sin_asignar'
    const nombre = o.tecnico?.nombre_completo ?? 'Sin asignar'
    if (!porTecAudit[k]) porTecAudit[k] = { nombre, total: 0, entregadas: 0, ingresos: 0 }
    porTecAudit[k].total++
    if (o.estado === 'entregado') { porTecAudit[k].entregadas++; porTecAudit[k].ingresos += o.precio_servicio ?? 0 }
  })

  const logsData = logs ?? []

  const ACCION_COLOR: Record<string, string> = {
    venta_creada: 'bg-green-100 text-green-700',
    venta_anulada: 'bg-red-100 text-red-700',
    ot_pagada: 'bg-blue-100 text-blue-700',
    ot_creada: 'bg-cyan-100 text-cyan-700',
    ot_estado_cambio: 'bg-purple-100 text-purple-700',
    stock_ajustado: 'bg-orange-100 text-orange-700',
    precio_modificado: 'bg-yellow-100 text-yellow-700',
    usuario_modificado: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Ventas por usuario">
          <Tabla
            headers={['Usuario (ID)', 'Ventas', 'Anuladas', 'Total']}
            rows={Object.entries(porVendedor).sort((a, b) => b[1].total - a[1].total)
              .map(([k, v]) => [`${k.slice(0, 8)}...`, v.cantidad, v.anuladas, formatCLP(v.total)])}
          />
        </Section>
        <Section title="OTs por técnico">
          <Tabla
            headers={['Técnico', 'Asignadas', 'Entregadas', 'Ingresos']}
            rows={Object.values(porTecAudit).sort((a, b) => b.entregadas - a.entregadas)
              .map(t => [t.nombre, t.total, t.entregadas, formatCLP(t.ingresos)])}
          />
        </Section>
      </div>
      <Section title={`Log de auditoría — últimas ${Math.min(logsData.length, 50)} acciones`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Fecha', 'Usuario', 'Módulo', 'Acción', 'Detalle'].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-gray-500 font-medium text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {logsData.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Sin registros en el período</td></tr>
              ) : logsData.slice(0, 50).map((l, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{l.created_at.replace('T', ' ').slice(0, 16)}</td>
                  <td className="px-3 py-2 font-medium">{l.usuario_nombre ?? '—'}</td>
                  <td className="px-3 py-2 capitalize">{l.modulo}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACCION_COLOR[l.accion] ?? 'bg-gray-100 text-gray-600'}`}>
                      {l.accion.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{l.entidad_desc ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}

// ── Tab: Compras ──────────────────────────────────────────────────────────────

async function TabCompras({ desde, hasta }: { desde: string; hasta: string }) {
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

  return (
    <div className="space-y-4">
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
            rows={proveedoresList.map(p => [p.nombre, p.count, formatCLP(p.total)])}
          />
        </Section>
      )}
      <Section title="Órdenes de compra del período">
        <Tabla
          headers={['N° OC', 'Proveedor', 'Fecha', 'Estado', 'Total']}
          rows={lista.map(o => {
            const sup = o.suppliers
            const nombre = (Array.isArray(sup) ? sup[0]?.nombre : (sup as { nombre: string } | null)?.nombre) ?? '—'
            return [o.numero_oc, nombre, o.created_at.split('T')[0], o.estado?.replace(/_/g, ' ') ?? '—', formatCLP(o.total ?? 0)]
          })}
        />
      </Section>
    </div>
  )
}

// ── Tab: Gastos ───────────────────────────────────────────────────────────────

async function TabGastos({ desde, hasta }: { desde: string; hasta: string }) {
  const supabase = await createClient()
  const { data: gastos, error } = await supabase
    .from('gastos')
    .select('id, concepto, monto, categoria, metodo_pago, fecha, created_at')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: false })

  if (error?.message.toLowerCase().includes('gastos')) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
        <p className="text-lg font-semibold text-amber-800 mb-1">Módulo de gastos no configurado</p>
        <p className="text-sm text-amber-700">Ejecuta la migración SQL de gastos en Supabase para activar este módulo.</p>
      </div>
    )
  }

  const lista = (gastos ?? []) as { id: string; concepto: string; monto: number; categoria: string; metodo_pago: string; fecha: string }[]
  const totalGastos = lista.reduce((s, g) => s + g.monto, 0)

  const porCategoria: Record<string, number> = {}
  lista.forEach(g => { porCategoria[g.categoria] = (porCategoria[g.categoria] ?? 0) + g.monto })
  const catData = Object.entries(porCategoria)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const porMetodo: Record<string, number> = {}
  lista.forEach(g => { porMetodo[g.metodo_pago] = (porMetodo[g.metodo_pago] ?? 0) + g.monto })

  const dias = Math.max(1, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000) + 1)
  const promDiario = Math.round(totalGastos / dias)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard label="Total gastos"     value={formatCLP(totalGastos)} colorIdx={4} />
        <KpiCard label="N° registros"     value={String(lista.length)}   colorIdx={0} />
        <KpiCard label="Promedio diario"  value={formatCLP(promDiario)}  colorIdx={2} />
      </div>
      {catData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Por categoría">
            <GraficoPastel data={catData} />
          </Section>
          <Section title="Detalle por categoría">
            <Tabla
              headers={['Categoría', 'Total', 'Part. %']}
              rows={catData.map(c => [c.name, formatCLP(c.value), `${Math.round(c.value / totalGastos * 100)}%`])}
            />
          </Section>
        </div>
      )}
      {Object.keys(porMetodo).length > 0 && (
        <Section title="Por método de pago">
          <Tabla
            headers={['Método', 'Total', 'Part. %']}
            rows={Object.entries(porMetodo).sort((a, b) => b[1] - a[1]).map(([m, v]) => [m, formatCLP(v), `${Math.round(v / totalGastos * 100)}%`])}
          />
        </Section>
      )}
      <Section title="Registro de gastos">
        <Tabla
          headers={['Fecha', 'Concepto', 'Categoría', 'Método', 'Monto']}
          rows={lista.map(g => [g.fecha, g.concepto, g.categoria, g.metodo_pago, formatCLP(g.monto)])}
        />
      </Section>
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
    .select('permisos_modulos, roles(nombre)')
    .eq('id', user!.id)
    .single()
  const rolesAuth = profileAuth?.roles as { nombre?: string } | { nombre?: string }[] | null | undefined
  const rolAuth = (Array.isArray(rolesAuth) ? rolesAuth[0]?.nombre : rolesAuth?.nombre) ?? ''
  const permisosAuth = profileAuth?.permisos_modulos as Record<string, boolean> | null

  const soloPropios    = tieneSubPermiso('informes.solo_propios',     rolAuth, permisosAuth)
  const verVentas      = rolAuth === 'administrador' || tieneSubPermiso('informes.ver_ventas',       rolAuth, permisosAuth)
  const verRentab      = rolAuth === 'administrador' || tieneSubPermiso('informes.ver_rentabilidad', rolAuth, permisosAuth)
  const soloUserId     = soloPropios ? user!.id : undefined

  // Tab por defecto según permisos
  const defaultTab = verVentas ? 'ventas' : verRentab ? 'rentabilidad' : 'inventario'
  const tab = params.tab ?? defaultTab

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📊</span>
          <h1 className="text-2xl font-bold text-gray-900">Informes & BI</h1>
        </div>
        <InformesExportActions
          fechaDesde={desde} fechaHasta={hasta}
          totalVentas={0} cantidadVentas={0} ticketPromedio={0} totalCompras={0}
          resumenMetodos={[]} reparacionesPorEstado={{}}
        />
      </div>

      <div className="bg-white rounded-xl border p-4">
        <Suspense>
          <FiltroFechas currentTab={tab} desde={desde} hasta={hasta} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="text-center py-16 text-gray-400 text-sm">Cargando datos...</div>}>
        {tab === 'ventas'       && verVentas  && <TabVentas       desde={desde} hasta={hasta} />}
        {tab === 'taller'       && <TabTaller        desde={desde} hasta={hasta} />}
        {tab === 'inventario'   && <TabInventario    desde={desde} hasta={hasta} />}
        {tab === 'rentabilidad' && verRentab  && <TabRentabilidad  desde={desde} hasta={hasta} soloUserId={soloUserId} />}
        {tab === 'servicios'    && <TabServicios desde={desde} hasta={hasta} />}
        {tab === 'compras'      && <TabCompras   desde={desde} hasta={hasta} />}
        {tab === 'gastos'       && <TabGastos    desde={desde} hasta={hasta} />}
        {tab === 'auditoria'    && rolAuth === 'administrador' && <TabAuditoria desde={desde} hasta={hasta} />}
        {/* Mensajes de acceso restringido */}
        {tab === 'ventas'       && !verVentas  && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">No tienes acceso a la pestaña Ventas.</div>}
        {tab === 'rentabilidad' && !verRentab  && <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">No tienes acceso a la pestaña Rentabilidad.</div>}
      </Suspense>
    </div>
  )
}
