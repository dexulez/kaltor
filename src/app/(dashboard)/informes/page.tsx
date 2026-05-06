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

  const [{ data: ventas }, { data: items }] = await Promise.all([
    supabase.from('sales').select('*').gte('created_at', desdeIso).lte('created_at', hastaIso),
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

  const porDia: Record<string, number> = {}
  activas.forEach(v => {
    const d = v.created_at.split('T')[0]
    porDia[d] = (porDia[d] ?? 0) + v.total
  })
  const areaData = Object.entries(porDia).sort().map(([fecha, total]) => ({ fecha, total }))

  const porMetodo: Record<string, number> = {}
  activas.forEach(v => {
    const m = v.metodo_pago ?? 'otro'
    porMetodo[m] = (porMetodo[m] ?? 0) + v.total
  })
  const pieMetodo = Object.entries(porMetodo).map(([name, value]) => ({ name, value }))

  const topProd: Record<string, { nombre: string; qty: number; total: number }> = {}
  ;(items ?? [])
    .filter(it => !(it.sales as { anulada?: boolean } | null)?.anulada)
    .forEach(it => {
      const key = it.producto_id ?? it.descripcion
      if (!topProd[key]) topProd[key] = { nombre: it.descripcion ?? '—', qty: 0, total: 0 }
      topProd[key].qty += it.cantidad ?? 1
      topProd[key].total += it.subtotal ?? 0
    })
  const topProdRows = Object.values(topProd).sort((a, b) => b.total - a.total).slice(0, 10)
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
    if (o.estado === 'entregado') { porTec[k].entregadas++; porTec[k].ingresos += o.precio_servicio ?? 0 }
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

  const [{ data: productos }, { data: movimientos }] = await Promise.all([
    supabase.from('products').select('*').eq('activo', true),
    supabase.from('stock_movements').select('*').gte('created_at', desdeIso).lte('created_at', hastaIso),
  ])

  const prods = productos ?? []
  const movs = movimientos ?? []

  const valorizacionCosto = prods.reduce((s, p) => s + (p.stock_actual ?? 0) * (p.precio_costo ?? 0), 0)
  const valorizacionVenta = prods.reduce((s, p) => s + (p.stock_actual ?? 0) * (p.precio_venta ?? 0), 0)
  const margen = valorizacionCosto > 0 ? Math.round((valorizacionVenta - valorizacionCosto) * 100 / valorizacionCosto) : 0
  const criticos = prods.filter(p => (p.stock_actual ?? 0) <= (p.stock_minimo ?? 5))

  const porCat: Record<string, number> = {}
  prods.forEach(p => {
    const c = p.categoria ?? 'Sin categoría'
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Valorización costo" value={formatCLP(valorizacionCosto)} colorIdx={0} />
        <KpiCard label="Valorización venta" value={formatCLP(valorizacionVenta)} colorIdx={1} />
        <KpiCard label="Margen potencial" value={`${margen}%`} colorIdx={2} />
        <KpiCard label="Productos críticos" value={`${criticos.length}`} sub="stock ≤ mínimo" colorIdx={4} />
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

async function TabRentabilidad({ desde, hasta }: { desde: string; hasta: string }) {
  const supabase = await createClient()
  const desdeIso = `${desde}T00:00:00.000Z`
  const hastaIso = `${hasta}T23:59:59.999Z`

  const [{ data: otsRaw }, { data: itemsRaw }, { data: confRaw }] = await Promise.all([
    supabase.from('repair_orders')
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
      .lte('created_at', hastaIso),
    supabase.from('repair_items')
      .select('repair_order_id, cantidad, precio_costo, costo_envio'),
    supabase.from('system_config').select('iva, comision_debito, comision_credito, comision_transferencia, costo_insumos_promedio').single(),
  ])

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
        {tab === 'ventas'       && <TabVentas       desde={desde} hasta={hasta} />}
        {tab === 'taller'       && <TabTaller        desde={desde} hasta={hasta} />}
        {tab === 'inventario'   && <TabInventario    desde={desde} hasta={hasta} />}
        {tab === 'rentabilidad' && <TabRentabilidad  desde={desde} hasta={hasta} />}
        {tab === 'auditoria'    && <TabAuditoria     desde={desde} hasta={hasta} />}
      </Suspense>
    </div>
  )
}
