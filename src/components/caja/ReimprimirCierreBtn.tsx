'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCLP } from '@/lib/calculations'

const TZ = 'America/Santiago'

interface Props {
  sesionId: string
  fecha: string
  aperturaAt: string
  cierreAt: string
  fondoApertura: number
  efectivoCierre: number
  transbankCierre: number
  transferenciaCierre: number
  otrosCierre: number
  diferenciaEfectivo: number
  observacionesCierre: string | null
  ivaRate?: number
  comisionDebito?: number
  comisionCredito?: number
  comisionTransferencia?: number
}

export default function ReimprimirCierreBtn({
  sesionId, fecha, aperturaAt, cierreAt,
  fondoApertura, efectivoCierre, transbankCierre, transferenciaCierre, otrosCierre,
  diferenciaEfectivo, observacionesCierre,
  ivaRate = 19, comisionDebito = 1.5, comisionCredito = 2.5, comisionTransferencia = 0,
}: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formato, setFormato] = useState<'a4' | 'ticket80' | 'ticket57'>('a4')
  const [open, setOpen] = useState(false)
  const [verVentas, setVerVentas] = useState(false)
  const [verCompras, setVerCompras] = useState(false)
  const [verGastos, setVerGastos] = useState(false)

  async function reimprimir() {
    setLoading(true)

    // Ventas del período
    const { data: ventasData } = await supabase.from('sales')
      .select('total, metodo_pago, iva, ppm')
      .gte('created_at', aperturaAt)
      .lte('created_at', cierreAt)
      .eq('anulada', false)

    const ventas = (ventasData ?? []).reduce((acc, v) => {
      const m = (v.metodo_pago ?? '').toLowerCase()
      const t = v.total ?? 0
      if (m === 'efectivo') acc.efectivo += t
      else if (m === 'debito' || m === 'credito') acc.transbank += t
      else if (m === 'transferencia') acc.transferencia += t
      else acc.otros += t
      acc.total += t
      return acc
    }, { efectivo: 0, transbank: 0, transferencia: 0, otros: 0, total: 0 })

    // OTs entregadas en el período → comisiones
    const { data: otsRaw } = await supabase.from('repair_orders')
      .select(`id, precio_servicio, tipo_reparacion, metodo_pago, iva_aplicado, tecnico_id,
        tecnico:user_profiles(nombre_completo, comision_base, comision_pantalla, comision_bateria,
          comision_placa, comision_software, comision_camara, comision_conector, comision_otro)`)
      .eq('estado', 'entregado')
      .gte('fecha_entrega', aperturaAt)
      .lte('fecha_entrega', cierreAt)

    const otIds = (otsRaw ?? []).map((o: Record<string, unknown>) => o.id as string)
    let costosPorOT: Record<string, number> = {}
    if (otIds.length > 0) {
      const { data: items } = await supabase.from('repair_items')
        .select('repair_order_id, cantidad, precio_costo, costo_envio').in('repair_order_id', otIds)
      ;(items ?? []).forEach(it => {
        costosPorOT[it.repair_order_id] = (costosPorOT[it.repair_order_id] ?? 0) + (it.cantidad ?? 1) * (it.precio_costo ?? 0) + (it.costo_envio ?? 0)
      })
    }

    type TecP = { nombre_completo: string; comision_base: number; comision_pantalla: number; comision_bateria: number; comision_placa: number; comision_software: number; comision_camara: number; comision_conector: number; comision_otro: number }
    interface ComTec { nombre: string; ots: number; ingresosBruto: number; costoRep: number; comBanco: number; baseCalculo: number; pctPromedio: number; comisionTotal: number; ganancia: number }
    const porTec: Record<string, ComTec> = {}
    ;(otsRaw ?? []).forEach((o: Record<string, unknown>) => {
      const tec = o.tecnico as TecP | null
      const k = (o.tecnico_id as string) ?? 'sin'
      const nombre = tec?.nombre_completo ?? 'Sin asignar'
      const bruto = (o.precio_servicio as number) ?? 0
      const neto = Math.round(bruto / (1 + ivaRate / 100))
      const costoRep = costosPorOT[o.id as string] ?? 0
      const metodo = (o.metodo_pago as string) ?? ''
      const pctBco = metodo === 'credito' ? comisionCredito : metodo === 'debito' ? comisionDebito : metodo === 'transferencia' ? comisionTransferencia : 0
      const comBanco = Math.round(bruto * pctBco / 100)
      const base = Math.max(0, neto - costoRep - comBanco)
      const tipo = (o.tipo_reparacion as string) ?? ''
      const pctTipo: Record<string, number> = { pantalla: tec?.comision_pantalla ?? 0, bateria: tec?.comision_bateria ?? 0, placa: tec?.comision_placa ?? 0, software: tec?.comision_software ?? 0, camara: tec?.comision_camara ?? 0, conector: tec?.comision_conector ?? 0 }
      const pct = (pctTipo[tipo] ?? 0) > 0 ? pctTipo[tipo] : (tec?.comision_base ?? 0)
      const com = Math.round(base * pct / 100)
      if (!porTec[k]) porTec[k] = { nombre, ots: 0, ingresosBruto: 0, costoRep: 0, comBanco: 0, baseCalculo: 0, pctPromedio: 0, comisionTotal: 0, ganancia: 0 }
      porTec[k].ots++; porTec[k].ingresosBruto += bruto; porTec[k].costoRep += costoRep
      porTec[k].comBanco += comBanco; porTec[k].baseCalculo += base; porTec[k].comisionTotal += com; porTec[k].ganancia += base - com
    })
    const comisiones = Object.values(porTec)
    comisiones.forEach(t => { t.pctPromedio = t.baseCalculo > 0 ? Math.round(t.comisionTotal * 100 / t.baseCalculo) : 0 })

    // Detalle ventas (opcional)
    type VentaDetalle = { numero: string; cliente: string; items: string; metodo: string; total: number }
    let detalleVentas: VentaDetalle[] = []
    if (verVentas) {
      const { data: vd } = await supabase.from('sales')
        .select('numero_venta, total, metodo_pago, anulada, customers(nombre), sale_items(nombre, cantidad), repair_orders(numero_ot)')
        .gte('created_at', aperturaAt).lte('created_at', cierreAt).eq('anulada', false)
        .order('created_at')
      detalleVentas = (vd ?? []).map((v: Record<string, unknown>) => {
        const items = (v.sale_items as { nombre: string; cantidad: number }[] ?? [])
          .map(i => `${i.nombre}${i.cantidad > 1 ? ` x${i.cantidad}` : ''}`).join(', ')
        const ot = (v.repair_orders as { numero_ot: string } | null)?.numero_ot
        return {
          numero: ot ?? (v.numero_venta as string),
          cliente: (v.customers as { nombre: string } | null)?.nombre ?? '—',
          items: items || (ot ? `OT ${ot}` : '—'),
          metodo: (v.metodo_pago as string) ?? '—',
          total: v.total as number,
        }
      })
    }

    // Detalle compras recibidas (opcional)
    type CompraDetalle = { numero: string; proveedor: string; items: number; total: number }
    let detalleCompras: CompraDetalle[] = []
    if (verCompras) {
      const { data: cd } = await supabase.from('purchase_orders')
        .select('numero_oc, total, suppliers(nombre), purchase_order_items(id)')
        .in('estado', ['recibida_parcial', 'recibida_completa'])
        .gte('updated_at', aperturaAt).lte('updated_at', cierreAt)
        .order('updated_at')
      detalleCompras = (cd ?? []).map((c: Record<string, unknown>) => ({
        numero: c.numero_oc as string,
        proveedor: (c.suppliers as { nombre: string } | null)?.nombre ?? '—',
        items: (c.purchase_order_items as unknown[])?.length ?? 0,
        total: c.total as number,
      }))
    }

    // Gastos fijos activos (opcional)
    type GastoRow = { nombre: string; categoria: string; monto: number }
    let gastos: GastoRow[] = []
    if (verGastos) {
      const { data: gd } = await supabase.from('gastos_fijos').select('nombre, categoria, monto').eq('activo', true).order('categoria')
      gastos = (gd ?? []) as GastoRow[]
    }

    setLoading(false)
    setOpen(false)
    imprimirCierre({ fecha, aperturaAt, cierreAt, fondoApertura, ventas, ef: efectivoCierre, tb: transbankCierre, tr: transferenciaCierre, ot: otrosCierre, difEf: diferenciaEfectivo, cierreObs: observacionesCierre ?? '', comisiones, formato, detalleVentas, detalleCompras, gastos })
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-xs text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors font-medium">
        🖨️ Reimprimir
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800">Reimprimir cierre</p>
                <p className="text-xs text-gray-500">{fecha}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'a4' as const,       label: 'A4',       icon: '🗒️' },
                { key: 'ticket80' as const, label: '80mm',     icon: '🧾' },
                { key: 'ticket57' as const, label: '57mm',     icon: '📜' },
              ].map(f => (
                <button key={f.key} type="button" onClick={() => setFormato(f.key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-center transition-colors ${formato === f.key ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400' : 'bg-gray-50 border-gray-200 hover:border-indigo-300'}`}>
                  <span className="text-xl">{f.icon}</span>
                  <p className="text-xs font-semibold text-gray-700">{f.label}</p>
                </button>
              ))}
            </div>
            {/* Toggles de detalle */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Incluir detalle de</p>
              {[
                { key: 'ventas',  label: '📋 Transacciones de venta',  val: verVentas,  set: setVerVentas },
                { key: 'compras', label: '📦 Compras recibidas',        val: verCompras, set: setVerCompras },
                { key: 'gastos',  label: '💸 Gastos fijos',             val: verGastos,  set: setVerGastos },
              ].map(t => (
                <label key={t.key} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={t.val}
                    onChange={e => t.set(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{t.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Cancelar</button>
              <button onClick={reimprimir} disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
                {loading ? 'Calculando...' : '🖨️ Imprimir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Función de impresión ──────────────────────────────────────────────────────
interface CierreData {
  fecha: string; aperturaAt: string; cierreAt: string; fondoApertura: number
  ventas: { efectivo: number; transbank: number; transferencia: number; otros: number; total: number }
  ef: number; tb: number; tr: number; ot: number; difEf: number; cierreObs: string
  comisiones: { nombre: string; ots: number; ingresosBruto: number; costoRep: number; comBanco: number; baseCalculo: number; pctPromedio: number; comisionTotal: number; ganancia: number }[]
  formato: 'a4' | 'ticket80' | 'ticket57'
  detalleVentas?: { numero: string; cliente: string; items: string; metodo: string; total: number }[]
  detalleCompras?: { numero: string; proveedor: string; items: number; total: number }[]
  gastos?: { nombre: string; categoria: string; monto: number }[]
}

function imprimirCierre(d: CierreData) {
  const fmt = (n: number) => n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })
  const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  const totalCierre = d.ef + d.tb + d.tr + d.ot
  const totalEsperado = d.fondoApertura + d.ventas.total
  const difColor = d.difEf === 0 ? '#166534' : '#991b1b'
  const difTxt = d.difEf === 0 ? '✓ Cuadra' : `${d.difEf > 0 ? '+' : ''}${fmt(d.difEf)}`
  const isTicket = d.formato !== 'a4'
  const mm = d.formato === 'ticket57' ? '57mm' : d.formato === 'ticket80' ? '80mm' : 'A4'
  const totalCom = d.comisiones.reduce((s, t) => s + t.comisionTotal, 0)

  function sec(title: string, content: string) {
    if (isTicket) return `<div style="font-weight:bold;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:1mm 0;margin:2mm 0;font-size:8pt;text-align:center;text-transform:uppercase">${title}</div>${content}`
    return `<h2 style="font-size:10pt;font-weight:bold;background:#374151;color:#fff;padding:1.5mm 3mm;margin:4mm 0 2mm;border-radius:3px">${title}</h2>${content}`
  }
  function row(l: string, v: string, bold = false, color = '') {
    return `<div style="display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px solid #eee;${bold ? 'font-weight:bold;border-top:2px solid #111;margin-top:1mm;padding-top:2mm;border-bottom:none' : ''}${color ? `;color:${color}` : ''}"><span>${l}</span><span>${v}</span></div>`
  }

  const ventasH = [row('Efectivo', fmt(d.ventas.efectivo)), row('Transbank', fmt(d.ventas.transbank)), row('Transferencia', fmt(d.ventas.transferencia)), d.ventas.otros ? row('Otros', fmt(d.ventas.otros)) : '', row('TOTAL VENTAS', fmt(d.ventas.total), true)].join('')
  const cierreH = [row('Efectivo (c/fondo)', fmt(d.ef)), row('Transbank', fmt(d.tb)), row('Transferencia', fmt(d.tr)), d.ot ? row('Otros', fmt(d.ot)) : '', row('TOTAL CIERRE', fmt(totalCierre), true)].join('')
  const cuadreH = [row('Esperado', fmt(totalEsperado)), row('Contado', fmt(totalCierre)), `<div style="display:flex;justify-content:space-between;font-weight:bold;border-top:2px solid #111;margin-top:1mm;padding-top:2mm;color:${difColor}"><span>Diferencia</span><span>${difTxt}</span></div>`].join('')

  const comisionesH = d.comisiones.length > 0 ? (() => {
    if (isTicket) return d.comisiones.map(t => `<div style="margin-bottom:2mm"><div style="font-weight:bold">${t.nombre}</div><div style="display:flex;justify-content:space-between;font-size:8pt"><span>${t.ots} OTs · ${t.pctPromedio}%</span><span style="font-weight:bold;color:#6d28d9">${fmt(t.comisionTotal)}</span></div></div>`).join('') + `<div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px solid #000;margin-top:1mm;padding-top:1mm"><span>TOTAL COM.</span><span style="color:#6d28d9">${fmt(totalCom)}</span></div>`
    return `<table style="width:100%;font-size:8pt;border-collapse:collapse"><thead style="background:#f5f3ff"><tr><th style="text-align:left;padding:1.5mm 2mm">Técnico</th><th style="text-align:right;padding:1.5mm 2mm">OTs</th><th style="text-align:right;padding:1.5mm 2mm">Bruto</th><th style="text-align:right;padding:1.5mm 2mm">Base</th><th style="text-align:right;padding:1.5mm 2mm">%</th><th style="text-align:right;padding:1.5mm 2mm">Comisión</th><th style="text-align:right;padding:1.5mm 2mm">Gan. neg.</th></tr></thead><tbody>${d.comisiones.map(t => `<tr style="border-bottom:1px solid #eee"><td style="padding:1.5mm 2mm">${t.nombre}</td><td style="text-align:right;padding:1.5mm 2mm">${t.ots}</td><td style="text-align:right;padding:1.5mm 2mm">${fmt(t.ingresosBruto)}</td><td style="text-align:right;padding:1.5mm 2mm">${fmt(t.baseCalculo)}</td><td style="text-align:right;padding:1.5mm 2mm">${t.pctPromedio}%</td><td style="text-align:right;padding:1.5mm 2mm;font-weight:bold;color:#6d28d9">${fmt(t.comisionTotal)}</td><td style="text-align:right;padding:1.5mm 2mm;color:#16a34a">${fmt(t.ganancia)}</td></tr>`).join('')}<tfoot style="background:#f5f3ff;font-weight:bold"><tr><td colspan="5" style="padding:1.5mm 2mm">TOTAL</td><td style="padding:1.5mm 2mm;text-align:right;color:#6d28d9">${fmt(totalCom)}</td><td style="padding:1.5mm 2mm;text-align:right;color:#16a34a">${fmt(d.comisiones.reduce((s,t)=>s+t.ganancia,0))}</td></tr></tfoot></table>`
  })() : ''

  const obsH = d.cierreObs ? `<p style="padding:2mm;background:#f9f9f9;border:1px solid #eee;border-radius:2mm;font-size:8pt">${d.cierreObs}</p>` : ''
  const header = isTicket
    ? `<div style="text-align:center;border-bottom:2px dashed #000;padding-bottom:2mm;margin-bottom:2mm"><div style="font-size:11pt;font-weight:bold">CIERRE DE CAJA</div><div>${d.fecha}</div><div>Apertura: ${hora(d.aperturaAt)} · Cierre: ${hora(d.cierreAt)}</div><div>Fondo: ${fmt(d.fondoApertura)}</div></div>`
    : `<div style="border-bottom:2px solid #111;padding-bottom:3mm;margin-bottom:4mm"><div style="font-size:14pt;font-weight:bold">🔒 Cierre de Caja — ${d.fecha}</div><div style="font-size:9pt;color:#555;margin-top:1mm">Apertura: ${hora(d.aperturaAt)} · Cierre: ${hora(d.cierreAt)} · Fondo: ${fmt(d.fondoApertura)} · Total ventas: ${fmt(d.ventas.total)}</div></div>`
  const firmas = isTicket
    ? `<div style="margin-top:4mm;border-top:1px dashed #000;padding-top:2mm;text-align:center;font-size:7pt">Firma encargado</div><div style="height:12mm"></div>`
    : `<div style="margin-top:8mm;display:flex;gap:8mm"><div style="flex:1;border-top:1px solid #111;padding-top:2mm;text-align:center;font-size:8pt">Firma encargado</div><div style="flex:1;border-top:1px solid #111;padding-top:2mm;text-align:center;font-size:8pt">V°B° administrador</div></div>`

  // Detalle ventas
  const detalleVentasH = (d.detalleVentas?.length ?? 0) > 0
    ? (isTicket
        ? d.detalleVentas!.map(v => `<div style="margin-bottom:1.5mm;font-size:8pt"><b>${v.numero}</b> ${v.cliente} · ${v.metodo}<div style="display:flex;justify-content:space-between"><span style="color:#555">${v.items.slice(0,40)}</span><span style="font-weight:bold">${fmt(v.total)}</span></div></div>`).join('')
        : `<table style="width:100%;font-size:8pt;border-collapse:collapse"><thead style="background:#f0f9ff"><tr><th style="text-align:left;padding:1.5mm 2mm">N°</th><th style="text-align:left;padding:1.5mm 2mm">Cliente</th><th style="text-align:left;padding:1.5mm 2mm">Ítems</th><th style="text-align:left;padding:1.5mm 2mm">Método</th><th style="text-align:right;padding:1.5mm 2mm">Total</th></tr></thead><tbody>${d.detalleVentas!.map(v => `<tr style="border-bottom:1px solid #eee"><td style="padding:1.5mm 2mm">${v.numero}</td><td style="padding:1.5mm 2mm">${v.cliente}</td><td style="padding:1.5mm 2mm;color:#555">${v.items}</td><td style="padding:1.5mm 2mm">${v.metodo}</td><td style="text-align:right;padding:1.5mm 2mm;font-weight:bold">${fmt(v.total)}</td></tr>`).join('')}<tfoot style="background:#f0f9ff;font-weight:bold"><tr><td colspan="4" style="padding:1.5mm 2mm">TOTAL (${d.detalleVentas!.length} transacciones)</td><td style="text-align:right;padding:1.5mm 2mm">${fmt(d.detalleVentas!.reduce((s,v)=>s+v.total,0))}</td></tr></tfoot></table>`)
    : ''

  // Detalle compras
  const detalleComprasH = (d.detalleCompras?.length ?? 0) > 0
    ? (isTicket
        ? d.detalleCompras!.map(c => `<div style="margin-bottom:1.5mm;font-size:8pt;display:flex;justify-content:space-between"><span><b>${c.numero}</b> ${c.proveedor} (${c.items} ítem${c.items !== 1 ? 's' : ''})</span><span style="font-weight:bold">${fmt(c.total)}</span></div>`).join('')
        : `<table style="width:100%;font-size:8pt;border-collapse:collapse"><thead style="background:#f0fdf4"><tr><th style="text-align:left;padding:1.5mm 2mm">OC</th><th style="text-align:left;padding:1.5mm 2mm">Proveedor</th><th style="text-align:center;padding:1.5mm 2mm">Ítems</th><th style="text-align:right;padding:1.5mm 2mm">Total</th></tr></thead><tbody>${d.detalleCompras!.map(c => `<tr style="border-bottom:1px solid #eee"><td style="padding:1.5mm 2mm">${c.numero}</td><td style="padding:1.5mm 2mm">${c.proveedor}</td><td style="text-align:center;padding:1.5mm 2mm">${c.items}</td><td style="text-align:right;padding:1.5mm 2mm;font-weight:bold">${fmt(c.total)}</td></tr>`).join('')}<tfoot style="background:#f0fdf4;font-weight:bold"><tr><td colspan="3" style="padding:1.5mm 2mm">TOTAL (${d.detalleCompras!.length} OC)</td><td style="text-align:right;padding:1.5mm 2mm">${fmt(d.detalleCompras!.reduce((s,c)=>s+c.total,0))}</td></tr></tfoot></table>`)
    : ''

  // Gastos fijos
  const gastosH = (d.gastos?.length ?? 0) > 0
    ? (() => {
        const totalG = d.gastos!.reduce((s,g)=>s+g.monto,0)
        return isTicket
          ? d.gastos!.map(g => `<div style="display:flex;justify-content:space-between;font-size:8pt;margin-bottom:1mm"><span>${g.nombre}</span><span>${fmt(g.monto)}</span></div>`).join('') + `<div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px solid #000;padding-top:1mm"><span>TOTAL GASTOS</span><span style="color:#dc2626">${fmt(totalG)}</span></div>`
          : `<table style="width:100%;font-size:8pt;border-collapse:collapse"><thead style="background:#fff7ed"><tr><th style="text-align:left;padding:1.5mm 2mm">Gasto</th><th style="text-align:left;padding:1.5mm 2mm">Categoría</th><th style="text-align:right;padding:1.5mm 2mm">Monto</th></tr></thead><tbody>${d.gastos!.map(g=>`<tr style="border-bottom:1px solid #eee"><td style="padding:1.5mm 2mm">${g.nombre}</td><td style="padding:1.5mm 2mm;color:#555">${g.categoria}</td><td style="text-align:right;padding:1.5mm 2mm;font-weight:bold;color:#dc2626">${fmt(g.monto)}</td></tr>`).join('')}<tfoot style="background:#fff7ed;font-weight:bold"><tr><td colspan="2" style="padding:1.5mm 2mm">TOTAL GASTOS FIJOS</td><td style="text-align:right;padding:1.5mm 2mm;color:#dc2626">${fmt(totalG)}</td></tr></tfoot></table>`
      })()
    : ''

  const body = header
    + sec('Ventas del día', ventasH)
    + sec('Cierre físico', cierreH)
    + sec('Cuadre', cuadreH)
    + (d.comisiones.length > 0 ? sec('💼 Comisiones técnicos', comisionesH) : '')
    + (detalleVentasH ? sec('📋 Detalle de transacciones de venta', detalleVentasH) : '')
    + (detalleComprasH ? sec('📦 Detalle de compras recibidas', detalleComprasH) : '')
    + (gastosH ? sec('💸 Gastos fijos del local', gastosH) : '')
    + (d.cierreObs ? sec('Observaciones', obsH) : '')
    + firmas

  const winW = d.formato === 'ticket57' ? '380' : d.formato === 'ticket80' ? '500' : '720'
  const win = window.open('', '_blank', `width=${winW},height=900`)
  if (!win) { alert('Activa las ventanas emergentes'); return }
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Cierre ${d.fecha}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:${isTicket ? '9pt' : '9pt'};color:#111;padding:${isTicket ? '3mm' : '10mm'}}@page{size:${mm}${isTicket ? ' auto' : ''};margin:${isTicket ? '3mm' : '10mm'}}</style>
</head><body>${body}</body></html>`)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 400)
}
