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
  const colors = [
    'text-blue-700', 'text-green-700', 'text-orange-600', 'text-purple-700',
    'text-rose-700', 'text-cyan-700',
  ]
  return colors[idx % colors.length]
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

  const [{ data: ventas }, { data: items }] = await Promise.all([
    supabase.from('sales')
      .select('*')
      .gte('created_at', desdeIso)
      .lte('created_at', hastaIso),
    supabase.from('sale_items')
      .select('*, sales!inner(created_at, anulada)')
      .gte('sales.created_at', desdeIso)
      .lte('sales.created_at', hastaIso),
  ])

  const activas = (ventas ?? []).filter(v => !v.anulada)
  const anuladas = (ventas ?? []).filter(v => v.anulada)
  const totalBruto = activas.reduce((s, v) => s + v.total, 0)
  const iva = Math.round(totalBruto - totalBruto / 1.19)
  const neto = totalBruto - iva
  const ppm = Math.round(neto * 0.03)
  const ticket = activas.length ? Math.round(totalBruto / activas.length) : 0

  // Por día
  const porDia: Record<string, number> = {}
  activas.forEach(v => {
    const d = v.created_at.split('T')[0]
    porDia[d] = (porDia[d] ?? 0) + v.total
  })
  const areaData = Object.entries(porDia).sort().map(([fecha, total]) => ({ fecha, total }))

  // Por método pago
  const porMetodo: Record<string, number> = {}
  activas.forEach(v => {
    const m = v.metodo_pago ?? 'otro'
    porMetodo[m] = (porMetodo[m] ?? 0) + v.total
  })
  const pieMetodo = Object.entries(porMetodo).map(([name, value]) => ({ name, value }))

  // Top productos
  const topProd: Record<string, { nombre: string; qty: number; total: number }> = {}
  ;(items ?? [])
    .filter(it => !(it.sales as { anulada?: boolean } | null)?.anulada)
    .forEach(it => {
      const key = it.producto_id ?? it.descripcion
      if (!topProd[key]) topProd[key] = { nombre: it.descripcion ?? '—', qty: 0, total: 0 }
      topProd[key].qty += it.cantidad ?? 1
      topProd[key].total += it.subtotal ?? 0
    })
  const topProdRows = Object.values(topProd)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(p => [p.nombre, p.qty, formatCLP(p.total)])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Total Bruto" value={formatCLP(totalBruto)} colorIdx={0} />
        <KpiCard label="Neto (sin IVA)" value={formatCLP(neto)} colorIdx={1} />
        <KpiCard label="IVA a reservar" value={formatCLP(iva)} colorIdx={3} />
        <KpiCard label="PPM estimado" value={formatCLP(ppm)} sub="3% s/neto" colorIdx={4} />
        <KpiCard label="Ticket promedio" value={formatCLP(ticket)} sub={`${activas.length} ventas`} colorIdx={2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Section title="Ventas diarias">
            <GraficoArea data={areaData} dataKey="total" nameKey="fecha" height={220} />
          </Section>
        </div>
        <Section title="Por método de pago">
          <GraficoPastel data={pieMetodo} height={220} />
        </Section>
      </div>

      <Section title="Top 10 productos más vendidos">
        <Tabla headers={['Producto', 'Unidades', 'Total']} rows={topProdRows} />
      </Section>

      {anuladas.length > 0 && (
        <Section title={`Ventas anuladas (${anuladas.length})`}>
          <Tabla
            headers={['Fecha', 'Monto', 'Método']}
            rows={anuladas.map(v => [
              v.created_at.split('T')[0],
              formatCLP(v.total),
              v.metodo_pago ?? '—',
            ])}
          />
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
    .select('*')
    .gte('created_at', desdeIso)
    .lte('created_at', hastaIso)

  const lista = ots ?? []
  const entregadas = lista.filter(o => o.estado === 'entregado')
  const enGarantia = lista.filter(o => o.estado === 'garantia')

  // Tiempo promedio (created_at → fecha_entrega o updated_at)
  const tiemposProm = entregadas
    .filter(o => o.fecha_entrega)
    .map(o => (new Date(o.fecha_entrega).getTime() - new Date(o.created_at).getTime()) / 86400000)
  const promDias = tiemposProm.length
    ? (tiemposProm.reduce((a, b) => a + b, 0) / tiemposProm.length).toFixed(1)
    : '—'

  // Por estado
  const porEstado: Record<string, number> = {}
  lista.forEach(o => { porEstado[o.estado] = (porEstado[o.estado] ?? 0) + 1 })
  const pieEstado = Object.entries(porEstado).map(([name, value]) => ({ name, value }))

  // Por tipo falla
  const porFalla: Record<string, number> = {}
  lista.forEach(o => {
    const f = o.tipo_falla ?? 'Sin especificar'
    porFalla[f] = (porFalla[f] ?? 0) + 1
  })
  const barFalla = Object.entries(porFalla).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // Por técnico
  const porTec: Record<string, { nombre: string; total: number; entregadas: number; ingresos: number }> = {}
  lista.forEach(o => {
    const k = o.tecnico_id ?? 'sin_asignar'
    if (!porTec[k]) porTec[k] = { nombre: o.tecnico_nombre ?? 'Sin asignar', total: 0, entregadas: 0, ingresos: 0 }
    porTec[k].total++
    if (o.estado === 'entregado') { porTec[k].entregadas++; porTec[k].ingresos += o.precio_total ?? 0 }
  })
  const tecRows = Object.values(porTec)
    .sort((a, b) => b.entregadas - a.entregadas)
    .map(t => [t.nombre, t.total, t.entregadas, formatCLP(t.ingresos)])

  // Por marca
  const porMarca: Record<string, number> = {}
  lista.forEach(o => {
    const m = o.marca ?? 'Otra'
    porMarca[m] = (porMarca[m] ?? 0) + 1
  })
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
        <Section title="OTs por estado">
          <GraficoPastel data={pieEstado} height={220} />
        </Section>
        <Section title="Tipo de falla más frecuente">
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

  const [{ data: productos }, { data: movimientos }] = await Promise.all([
    supabase.from('products').select('*').eq('activo', true),
    supabase.from('stock_movements')
      .select('*')
      .gte('created_at', desdeIso)
      .lte('created_at', hastaIso),
  ])

  const prods = productos ?? []
  const movs = movimientos ?? []

  const valorizacionCosto = prods.reduce((s, p) => s + (p.stock_actual ?? 0) * (p.precio_costo ?? 0), 0)
  const valorizacionVenta = prods.reduce((s, p) => s + (p.stock_actual ?? 0) * (p.precio_venta ?? 0), 0)
  const margen = valorizacionCosto > 0
    ? Math.round((valorizacionVenta - valorizacionCosto) * 100 / valorizacionCosto)
    : 0

  const criticos = prods.filter(p => (p.stock_actual ?? 0) <= (p.stock_minimo ?? 5))

  // Por categoría
  const porCat: Record<string, number> = {}
  prods.forEach(p => {
    const c = p.categoria ?? 'Sin categoría'
    porCat[c] = (porCat[c] ?? 0) + (p.stock_actual ?? 0) * (p.precio_costo ?? 0)
  })
  const pieCat = Object.entries(porCat).map(([name, value]) => ({ name, value }))

  // Movimientos
  const entradas = movs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.cantidad, 0)
  const salidas = movs.filter(m => m.tipo === 'salida').reduce((s, m) => s + m.cantidad, 0)
  const ajustes = movs.filter(m => m.tipo === 'ajuste').length

  const criticosRows = criticos
    .sort((a, b) => (a.stock_actual ?? 0) - (b.stock_actual ?? 0))
    .slice(0, 20)
    .map(p => [
      p.nombre,
      p.sku ?? '—',
      `${p.stock_actual ?? 0}`,
      `${p.stock_minimo ?? 5}`,
      formatCLP(p.precio_venta ?? 0),
    ])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Valorización costo" value={formatCLP(valorizacionCosto)} colorIdx={0} />
        <KpiCard label="Valorización venta" value={formatCLP(valorizacionVenta)} colorIdx={1} />
        <KpiCard label="Margen potencial" value={`${margen}%`} colorIdx={2} />
        <KpiCard label="Productos críticos" value={`${criticos.length}`} sub="stock ≤ mínimo" colorIdx={4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Section title="Valorización por categoría">
            <GraficoPastel data={pieCat} height={250} />
          </Section>
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
        <Tabla
          headers={['Producto', 'SKU', 'Stock actual', 'Stock mínimo', 'Precio venta']}
          rows={criticosRows}
        />
      </Section>
    </div>
  )
}

// ── Tab: Rentabilidad ─────────────────────────────────────────────────────────

async function TabRentabilidad({ desde, hasta }: { desde: string; hasta: string }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const [{ data: ots }, { data: config }] = await Promise.all([
    supabase.from('repair_orders')
      .select('*')
      .eq('estado', 'entregado')
      .gte('created_at', desdeIso)
      .lte('created_at', hastaIso),
    supabase.from('system_config').select('*').single(),
  ])

  const IVA = 0.19
  const costoInsumosProm = (config as { costo_insumos_promedio?: number } | null)?.costo_insumos_promedio ?? 0

  type OTRent = {
    id: string
    fecha: string
    descripcion: string
    tecnico: string
    precioBruto: number
    precioNeto: number
    costoRep: number
    costoInsumos: number
    comBancaria: number
    ganancia: number
    margen: number
  }

  const lista: OTRent[] = (ots ?? []).map(o => {
    const precioBruto = o.precio_total ?? 0
    const metodo = o.metodo_pago ?? 'efectivo'
    const comBancaria = ['credito', 'debito'].includes(metodo) ? Math.round(precioBruto * 0.015) : 0
    const precioNeto = Math.round(precioBruto / (1 + IVA))
    const costoRep = o.costo_repuesto ?? 0
    const costoInsumos = costoInsumosProm
    const ganancia = precioNeto - costoRep - costoInsumos - comBancaria
    const margen = precioNeto > 0 ? Math.round(ganancia * 100 / precioNeto) : 0
    return {
      id: o.id,
      fecha: o.created_at.split('T')[0],
      descripcion: `${o.marca ?? ''} ${o.modelo ?? ''} - ${o.tipo_falla ?? ''}`.trim(),
      tecnico: o.tecnico_nombre ?? 'Sin asignar',
      precioBruto,
      precioNeto,
      costoRep,
      costoInsumos,
      comBancaria,
      ganancia,
      margen,
    }
  })

  const totBruto = lista.reduce((s, o) => s + o.precioBruto, 0)
  const totNeto = lista.reduce((s, o) => s + o.precioNeto, 0)
  const totCostoRep = lista.reduce((s, o) => s + o.costoRep, 0)
  const totGanancia = lista.reduce((s, o) => s + o.ganancia, 0)
  const margenGlobal = totNeto > 0 ? Math.round(totGanancia * 100 / totNeto) : 0
  const ivaReservar = totBruto - totNeto

  // Por día
  const porDia: Record<string, number> = {}
  lista.forEach(o => { porDia[o.fecha] = (porDia[o.fecha] ?? 0) + o.ganancia })
  const areaData = Object.entries(porDia).sort().map(([fecha, ganancia]) => ({ fecha, ganancia }))

  // Por técnico
  const porTec: Record<string, { nombre: string; ganancia: number; count: number }> = {}
  lista.forEach(o => {
    if (!porTec[o.tecnico]) porTec[o.tecnico] = { nombre: o.tecnico, ganancia: 0, count: 0 }
    porTec[o.tecnico].ganancia += o.ganancia
    porTec[o.tecnico].count++
  })
  const barTec = Object.values(porTec).sort((a, b) => b.ganancia - a.ganancia)
    .map(t => ({ name: t.nombre, ganancia: t.ganancia }))

  const detalleRows = lista
    .sort((a, b) => b.ganancia - a.ganancia)
    .slice(0, 30)
    .map(o => [
      o.fecha,
      o.descripcion || '—',
      o.tecnico,
      formatCLP(o.precioBruto),
      formatCLP(o.costoRep),
      formatCLP(o.ganancia),
      `${o.margen}%`,
    ])

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Ingresos brutos" value={formatCLP(totBruto)} sub={`${lista.length} OTs entregadas`} colorIdx={0} />
        <KpiCard label="Ganancia neta" value={formatCLP(totGanancia)} sub={`Margen ${margenGlobal}%`} colorIdx={1} />
        <KpiCard label="IVA a reservar" value={formatCLP(ivaReservar)} colorIdx={3} />
        <KpiCard label="Costo repuestos" value={formatCLP(totCostoRep)} colorIdx={4} />
        <KpiCard label="Costo insumos total" value={formatCLP(lista.length * costoInsumosProm)} sub={`${formatCLP(costoInsumosProm)} por OT`} colorIdx={2} />
        <KpiCard label="Margen promedio" value={`${margenGlobal}%`} colorIdx={5} />
      </div>

      {/* Fórmula explicativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Fórmula de rentabilidad neta:</p>
        <p className="font-mono text-xs">
          Ganancia = (Precio Bruto ÷ 1.19) − Costo Repuesto − Costo Insumos − Comisión Bancaria
        </p>
        <p className="text-xs mt-1 text-blue-600">
          Comisión bancaria: 1.5% solo en tarjetas débito/crédito. Costo insumos: configurable en Sistema → Configuración.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Ganancia neta diaria">
          <GraficoArea data={areaData} dataKey="ganancia" nameKey="fecha" color="#10b981" height={220} />
        </Section>
        <Section title="Ganancia por técnico">
          <GraficoBarrasCLP data={barTec} dataKey="ganancia" nameKey="name" color="#8b5cf6" height={220} />
        </Section>
      </div>

      <Section title="Detalle de OTs entregadas (top 30 por ganancia)">
        <Tabla
          headers={['Fecha', 'Descripción', 'Técnico', 'Precio bruto', 'Costo rep.', 'Ganancia', 'Margen']}
          rows={detalleRows}
        />
      </Section>
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
      .select('*')
      .gte('created_at', desdeIso)
      .lte('created_at', hastaIso)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('sales')
      .select('created_by, total, anulada')
      .gte('created_at', desdeIso)
      .lte('created_at', hastaIso),
    supabase.from('repair_orders')
      .select('tecnico_id, tecnico_nombre, estado, precio_total')
      .gte('created_at', desdeIso)
      .lte('created_at', hastaIso),
  ])

  // Ventas por vendedor
  const porVendedor: Record<string, { total: number; cantidad: number; anuladas: number }> = {}
  ;(ventasUsuario ?? []).forEach(v => {
    const k = v.created_by ?? 'sin_usuario'
    if (!porVendedor[k]) porVendedor[k] = { total: 0, cantidad: 0, anuladas: 0 }
    if (!v.anulada) { porVendedor[k].total += v.total; porVendedor[k].cantidad++ }
    else porVendedor[k].anuladas++
  })

  // OTs por técnico
  const porTecAudit: Record<string, { nombre: string; total: number; entregadas: number; ingresos: number }> = {}
  ;(otsTecnico ?? []).forEach(o => {
    const k = o.tecnico_id ?? 'sin_asignar'
    if (!porTecAudit[k]) porTecAudit[k] = { nombre: o.tecnico_nombre ?? 'Sin asignar', total: 0, entregadas: 0, ingresos: 0 }
    porTecAudit[k].total++
    if (o.estado === 'entregado') { porTecAudit[k].entregadas++; porTecAudit[k].ingresos += o.precio_total ?? 0 }
  })

  const logsData = logs ?? []
  const logRows = logsData.slice(0, 50).map(l => [
    l.created_at.replace('T', ' ').slice(0, 16),
    l.usuario_nombre ?? '—',
    l.modulo,
    l.accion.replaceAll('_', ' '),
    l.entidad_desc ?? '—',
  ])

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
            headers={['Usuario', 'Ventas', 'Anuladas', 'Total']}
            rows={Object.entries(porVendedor)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([, v]) => [v.cantidad, v.anuladas, formatCLP(v.total)]
                .map((x, i) => i === 0 ? `ID: ${x}` : x)
              )
            }
          />
        </Section>
        <Section title="OTs por técnico">
          <Tabla
            headers={['Técnico', 'Asignadas', 'Entregadas', 'Ingresos']}
            rows={Object.values(porTecAudit)
              .sort((a, b) => b.entregadas - a.entregadas)
              .map(t => [t.nombre, t.total, t.entregadas, formatCLP(t.ingresos)])
            }
          />
        </Section>
      </div>

      <Section title={`Log de auditoría — últimas ${Math.min(logsData.length, 50)} acciones`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Fecha', 'Usuario', 'Módulo', 'Acción', 'Detalle'].map((h, i) => (
                  <th key={i} className={`px-3 py-2 text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-left'}`}>{h}</th>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; desde?: string; hasta?: string }>
}) {
  const params = await searchParams
  const tab = params.tab ?? 'ventas'
  const desde = params.desde ?? hace30Dias()
  const hasta = params.hasta ?? formatDate(new Date())

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📊</span>
          <h1 className="text-2xl font-bold text-gray-900">Informes & BI</h1>
        </div>
        <InformesExportActions
          fechaDesde={desde}
          fechaHasta={hasta}
          totalVentas={0}
          cantidadVentas={0}
          ticketPromedio={0}
          totalCompras={0}
          resumenMetodos={[]}
          reparacionesPorEstado={{}}
        />
      </div>

      <div className="bg-white rounded-xl border p-4">
        <Suspense>
          <FiltroFechas currentTab={tab} desde={desde} hasta={hasta} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="text-center py-16 text-gray-400 text-sm">Cargando datos...</div>}>
        {tab === 'ventas'       && <TabVentas desde={desde} hasta={hasta} />}
        {tab === 'taller'       && <TabTaller desde={desde} hasta={hasta} />}
        {tab === 'inventario'   && <TabInventario desde={desde} hasta={hasta} />}
        {tab === 'rentabilidad' && <TabRentabilidad desde={desde} hasta={hasta} />}
        {tab === 'auditoria'    && <TabAuditoria desde={desde} hasta={hasta} />}
      </Suspense>
    </div>
  )
}
