'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { soundAperturaCaja, soundCierreCaja, soundError } from '@/lib/sounds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCLP } from '@/lib/calculations'

const TZ = 'America/Santiago'

interface Sesion {
  id: string
  fecha: string
  estado: string
  efectivo_apertura: number
  apertura_at: string
  efectivo_cierre: number | null
  transbank_cierre: number | null
  transferencia_cierre: number | null
  otros_cierre: number | null
  diferencia_efectivo: number | null
  observaciones_cierre: string | null
  cierre_at: string | null
}

interface VentasDia {
  efectivo: number
  transbank: number
  transferencia: number
  otros: number
  total: number
}

interface CuentaBancaria {
  id: string
  banco: string
  tipo_cuenta: string
  numero: string
  titular: string
}

export default function SesionCajaPanel() {
  const supabase = createClient()
  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())

  const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined)
  const [ventas, setVentas] = useState<VentasDia>({ efectivo: 0, transbank: 0, transferencia: 0, otros: 0, total: 0 })
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'panel' | 'apertura' | 'arqueo' | 'cierre' | 'cierre_ok'>('panel')

  // Apertura
  const [aperturaEfectivo, setAperturaEfectivo] = useState('0')

  // Arqueo
  const [arqueoEfectivo, setArqueoEfectivo] = useState('0')
  const [arqueoTransbank, setArqueoTransbank] = useState('0')
  const [arqueoTransferencia, setArqueoTransferencia] = useState('0')
  const [arqueoObs, setArqueoObs] = useState('')

  // Cierre
  const [cierreEfectivo, setCierreEfectivo] = useState('0')
  const [cierreTransbank, setCierreTransbank] = useState('0')
  const [cierreTransferencia, setCierreTransferencia] = useState('0')
  const [cierreOtros, setCierreOtros] = useState('0')
  const [cierreCuentas, setCierreCuentas] = useState<string[]>([])
  const [cierreObs, setCierreObs] = useState('')
  const [cierreFecha, setCierreFecha] = useState(hoy)
  const [saving, setSaving] = useState(false)
  type TicketFormato = 'a4' | 'ticket80' | 'ticket57'
  const [formatoTicket, setFormatoTicket] = useState<TicketFormato>('a4')

  interface ComisionTec {
    nombre: string; ots: number
    ingresosBruto: number; costoRep: number; comBanco: number
    baseCalculo: number; pctPromedio: number; comisionTotal: number; ganancia: number
  }
  const [comisionData, setComisionData] = useState<ComisionTec[]>([])
  const [cierreData, setCierreData] = useState<{
    fecha: string; apertura: string; fondoApertura: number
    ventas: VentasDia; ef: number; tb: number; tr: number; ot: number
    difEf: number; cuentas: CuentaBancaria[]; cierreObs: string
  } | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data: sesData }, { data: cuentasData }] = await Promise.all([
      supabase.from('sesiones_caja').select('*').eq('estado', 'abierta').order('created_at', { ascending: false }).limit(1),
      supabase.from('cuentas_bancarias').select('id, banco, tipo_cuenta, numero, titular').eq('activa', true).order('orden'),
    ])
    const s = sesData?.[0] ?? null
    setSesion(s as Sesion | null)

    // Filtrar ventas solo desde la apertura de la sesión activa (no desde medianoche)
    const desdeVentas = s?.estado === 'abierta' ? s.apertura_at : `${hoy}T00:00:00`
    const hastaVentas = s?.estado === 'abierta' ? new Date().toISOString() : `${hoy}T23:59:59`
    const { data: ventasData } = await supabase.from('sales')
      .select('total, metodo_pago')
      .gte('created_at', desdeVentas)
      .lte('created_at', hastaVentas)
      .eq('anulada', false)
    const v = (ventasData ?? []).reduce((acc, v) => {
      const m = v.metodo_pago?.toLowerCase() ?? 'otros'
      const t = v.total ?? 0
      if (m === 'efectivo') acc.efectivo += t
      else if (m === 'debito' || m === 'credito') acc.transbank += t
      else if (m === 'transferencia') acc.transferencia += t
      else acc.otros += t
      acc.total += t
      return acc
    }, { efectivo: 0, transbank: 0, transferencia: 0, otros: 0, total: 0 })
    setVentas(v)
    setCuentas((cuentasData ?? []) as CuentaBancaria[])
    if (s) {
      setCierreEfectivo(String(s.efectivo_cierre ?? Math.round(s.efectivo_apertura + v.efectivo)))
      setCierreTransbank(String(s.transbank_cierre ?? v.transbank))
      setCierreTransferencia(String(s.transferencia_cierre ?? v.transferencia))
      setCierreOtros(String(s.otros_cierre ?? v.otros))
      // Inicializar fecha cierre: hoy por defecto, pero no antes de la apertura
      setCierreFecha(hoy >= s.fecha ? hoy : s.fecha)
    }
    setLoading(false)
  }, [hoy]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar() }, [cargar])

  async function abrirCaja() {
    setSaving(true)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('sesiones_caja').insert({
      fecha: hoy,
      estado: 'abierta',
      efectivo_apertura: parseInt(aperturaEfectivo) || 0,
      apertura_at: new Date().toISOString(),
      usuario_id: currentUser?.id ?? null,
    }).select().single()
    if (error) { soundError(); toast.error('Error: ' + error.message); setSaving(false); return }
    soundAperturaCaja()
    toast.success('Caja abierta correctamente')
    setSesion(data as Sesion)
    setView('panel')
    setSaving(false)
    await cargar()
  }

  async function guardarArqueo() {
    if (!sesion) return
    setSaving(true)
    const { error } = await supabase.from('arqueos_caja').insert({
      sesion_id: sesion.id,
      efectivo: parseInt(arqueoEfectivo) || 0,
      transbank: parseInt(arqueoTransbank) || 0,
      transferencia: parseInt(arqueoTransferencia) || 0,
      observaciones: arqueoObs || null,
    })
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    toast.success('Arqueo registrado')
    setView('panel')
    setSaving(false)
  }

  async function cerrarCaja() {
    if (!sesion) return
    setSaving(true)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const ef = parseInt(cierreEfectivo) || 0
    const tb = parseInt(cierreTransbank) || 0
    const tr = parseInt(cierreTransferencia) || 0
    const ot = parseInt(cierreOtros) || 0
    const difEf = ef - (sesion.efectivo_apertura + ventas.efectivo)
    // Si se seleccionó una fecha de cierre diferente a la apertura, construir el cierre_at con esa fecha
    const fechaCierreISO = cierreFecha !== sesion.fecha
      ? new Date(cierreFecha + 'T' + new Date().toLocaleTimeString('sv', { timeZone: TZ })).toISOString()
      : new Date().toISOString()

    const { error } = await supabase.from('sesiones_caja').update({
      estado: 'cerrada',
      fecha: cierreFecha,
      efectivo_cierre: ef,
      transbank_cierre: tb,
      transferencia_cierre: tr,
      otros_cierre: ot,
      diferencia_efectivo: difEf,
      cuentas_transferencia: cierreCuentas.length ? cierreCuentas : null,
      observaciones_cierre: cierreObs || null,
      cierre_at: fechaCierreISO,
      usuario_cierre_id: currentUser?.id ?? null,
    }).eq('id', sesion.id)
    if (error) { soundError(); toast.error('Error: ' + error.message); setSaving(false); return }
    soundCierreCaja()
    toast.success('Caja cerrada correctamente')

    // ── Calcular comisiones de técnicos de esta sesión ─────────────────────
    const cierreIso = new Date().toISOString()
    const [{ data: otsRaw }, { data: sysConf }] = await Promise.all([
      supabase.from('repair_orders')
        .select(`id, precio_servicio, tipo_reparacion, metodo_pago, iva_aplicado, tecnico_id,
          tecnico:user_profiles(nombre_completo, comision_base, comision_pantalla, comision_bateria,
            comision_placa, comision_software, comision_camara, comision_conector, comision_otro)`)
        .eq('estado', 'entregado')
        .gte('fecha_entrega', sesion.apertura_at)
        .lte('fecha_entrega', cierreIso),
      supabase.from('system_config')
        .select('iva, comision_debito, comision_credito, comision_transferencia').single(),
    ])

    const otIds = (otsRaw ?? []).map((o: Record<string, unknown>) => o.id as string)
    let costosPorOT: Record<string, number> = {}
    if (otIds.length > 0) {
      const { data: items } = await supabase.from('repair_items')
        .select('repair_order_id, cantidad, precio_costo, costo_envio').in('repair_order_id', otIds)
      ;(items ?? []).forEach(it => {
        costosPorOT[it.repair_order_id] = (costosPorOT[it.repair_order_id] ?? 0) + (it.cantidad ?? 1) * (it.precio_costo ?? 0) + (it.costo_envio ?? 0)
      })
    }

    type TecProfile = { nombre_completo: string; comision_base: number; comision_pantalla: number; comision_bateria: number; comision_placa: number; comision_software: number; comision_camara: number; comision_conector: number; comision_otro: number }
    const confIva = (sysConf as { iva?: number; comision_debito?: number; comision_credito?: number; comision_transferencia?: number } | null)?.iva ?? 19
    const confDeb = (sysConf as { comision_debito?: number } | null)?.comision_debito ?? 1.5
    const confCred = (sysConf as { comision_credito?: number } | null)?.comision_credito ?? 2.5
    const confTrans = (sysConf as { comision_transferencia?: number } | null)?.comision_transferencia ?? 0

    const porTec: Record<string, ComisionTec> = {}
    ;(otsRaw ?? []).forEach((o: Record<string, unknown>) => {
      const tec = o.tecnico as TecProfile | null
      const k = (o.tecnico_id as string) ?? 'sin_asignar'
      const nombre = tec?.nombre_completo ?? 'Sin asignar'
      const bruto = (o.precio_servicio as number) ?? 0
      const neto = Math.round(bruto / (1 + confIva / 100))
      const costoRep = costosPorOT[o.id as string] ?? 0
      const metodo = (o.metodo_pago as string) ?? ''
      const pctBco = metodo === 'credito' ? confCred : metodo === 'debito' ? confDeb : metodo === 'transferencia' ? confTrans : 0
      const comBanco = Math.round(bruto * pctBco / 100)
      const base = Math.max(0, neto - costoRep - comBanco)
      const tipo = (o.tipo_reparacion as string) ?? ''
      let pct = tec?.comision_base ?? 0
      if (tec) {
        const pctTipo: Record<string, number> = { pantalla: tec.comision_pantalla, bateria: tec.comision_bateria, placa: tec.comision_placa, software: tec.comision_software, camara: tec.comision_camara, conector: tec.comision_conector }
        if (pctTipo[tipo] > 0) pct = pctTipo[tipo]
      }
      const com = Math.round(base * pct / 100)
      const gan = base - com

      if (!porTec[k]) porTec[k] = { nombre, ots: 0, ingresosBruto: 0, costoRep: 0, comBanco: 0, baseCalculo: 0, pctPromedio: pct, comisionTotal: 0, ganancia: 0 }
      porTec[k].ots++
      porTec[k].ingresosBruto += bruto
      porTec[k].costoRep      += costoRep
      porTec[k].comBanco      += comBanco
      porTec[k].baseCalculo   += base
      porTec[k].comisionTotal += com
      porTec[k].ganancia      += gan
    })
    Object.values(porTec).forEach(t => {
      t.pctPromedio = t.baseCalculo > 0 ? Math.round(t.comisionTotal * 100 / t.baseCalculo) : 0
    })
    setComisionData(Object.values(porTec).sort((a, b) => b.comisionTotal - a.comisionTotal))
    // ─────────────────────────────────────────────────────────────────────────

    const datos = {
      fecha: hoy, apertura: sesion.apertura_at,
      fondoApertura: sesion.efectivo_apertura,
      ventas, ef, tb, tr, ot,
      difEf, cuentas, cierreObs,
    }
    setCierreData(datos)
    setView('cierre_ok')
    setSaving(false)
    await cargar()
  }

  function imprimirCierreCaja(d: {
    fecha: string; apertura: string; fondoApertura: number
    ventas: VentasDia; ef: number; tb: number; tr: number; ot: number
    difEf: number; cuentas: CuentaBancaria[]; cierreObs: string
  }, formato: TicketFormato = 'a4', comisiones: ComisionTec[] = []) {
    const fmt = (n: number) => n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })
    const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
    const totalCierre = d.ef + d.tb + d.tr + d.ot
    const totalEsperado = d.fondoApertura + d.ventas.total
    const difColor = d.difEf === 0 ? '#166534' : '#991b1b'
    const difTxt = d.difEf === 0 ? '✓ Cuadra' : `${d.difEf > 0 ? '+' : ''}${fmt(d.difEf)}`

    const isTicket = formato === 'ticket80' || formato === 'ticket57'
    const mm = formato === 'ticket57' ? '57mm' : formato === 'ticket80' ? '80mm' : 'A4'
    const margin = isTicket ? '2mm' : '10mm'
    const bodyPad = isTicket ? '2mm' : '8mm'
    const fs = isTicket ? '8pt' : '9pt'

    function section(title: string, content: string) {
      if (isTicket) return `<div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:0.5mm 0;margin:2mm 0;font-size:7.5pt;font-weight:bold;text-align:center;text-transform:uppercase">${title}</div>${content}`
      return `<h2 style="font-size:10pt;font-weight:bold;background:#374151;color:#fff;padding:1.5mm 3mm;margin:4mm 0 2mm">${title}</h2>${content}`
    }

    function row(label: string, value: string, bold = false) {
      return `<div style="display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px solid #eee;${bold ? 'font-weight:bold;border-top:2px solid #111;margin-top:1mm;padding-top:2mm;border-bottom:none' : ''}"><span>${label}</span><span>${value}</span></div>`
    }

    const ventasHtml = [
      row('Efectivo', fmt(d.ventas.efectivo)),
      row('Transbank', fmt(d.ventas.transbank)),
      row('Transferencia', fmt(d.ventas.transferencia)),
      d.ventas.otros ? row('Otros', fmt(d.ventas.otros)) : '',
      row('TOTAL VENTAS', fmt(d.ventas.total), true),
    ].join('')

    const cierreHtml = [
      row('Efectivo (c/fondo)', fmt(d.ef)),
      row('Transbank', fmt(d.tb)),
      row('Transferencia', fmt(d.tr)),
      d.ot ? row('Otros', fmt(d.ot)) : '',
      row('TOTAL CIERRE', fmt(totalCierre), true),
    ].join('')

    const cuadreHtml = [
      row('Esperado', fmt(totalEsperado)),
      row('Contado', fmt(totalCierre)),
      `<div style="display:flex;justify-content:space-between;font-weight:bold;border-top:2px solid #111;margin-top:1mm;padding-top:2mm;color:${difColor}"><span>Diferencia</span><span>${difTxt}</span></div>`,
    ].join('')

    const headerA4 = `
      <div style="text-align:center;border-bottom:2px solid #111;padding-bottom:3mm;margin-bottom:4mm">
        <div style="font-size:14pt;font-weight:bold">🔒 Cierre de Caja</div>
        <div style="font-size:9pt;color:#555">${d.fecha} · Apertura: ${hora(d.apertura)} · Fondo: ${fmt(d.fondoApertura)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-bottom:4mm">
        <div style="border:1px solid #ccc;border-radius:2mm;padding:3mm">
          <div style="font-size:8pt;color:#555;text-transform:uppercase;margin-bottom:2mm">Apertura</div>
          <div>${hora(d.apertura)}</div>
          <div>Fondo: <strong>${fmt(d.fondoApertura)}</strong></div>
        </div>
        <div style="border:1px solid #ccc;border-radius:2mm;padding:3mm">
          <div style="font-size:8pt;color:#555;text-transform:uppercase;margin-bottom:2mm">Total ingresos del día</div>
          <div style="font-size:16pt;font-weight:bold">${fmt(d.ventas.total)}</div>
        </div>
      </div>`

    const headerTicket = `
      <div style="text-align:center;margin-bottom:2mm">
        <div style="font-size:10pt;font-weight:bold">CIERRE DE CAJA</div>
        <div>${d.fecha}</div>
        <div>Apertura: ${hora(d.apertura)}</div>
        <div>Fondo: ${fmt(d.fondoApertura)}</div>
      </div>`

    const firmasA4 = `<div style="margin-top:8mm;display:flex;gap:8mm">
      <div style="flex:1;border-top:1px solid #111;padding-top:2mm;text-align:center;font-size:8pt">Firma encargado</div>
      <div style="flex:1;border-top:1px solid #111;padding-top:2mm;text-align:center;font-size:8pt">V°B° administrador</div>
    </div>`

    const firmasTicket = `
      <div style="margin-top:4mm;border-top:1px dashed #000;padding-top:2mm;text-align:center;font-size:7pt">Firma encargado</div>
      <div style="height:12mm"></div>`

    const obs = d.cierreObs
      ? section('Observaciones', `<p style="padding:2mm;background:#f9f9f9;border:1px solid #eee;border-radius:2mm">${d.cierreObs}</p>`)
      : ''

    const cuentasHtml = d.cuentas.length
      ? section('Cuentas transferencias', `<table style="width:100%;border-collapse:collapse;margin-bottom:3mm">
          ${d.cuentas.map(c => `<tr><td>${c.banco}</td><td style="text-align:right">···${c.numero.slice(-4)}</td></tr>`).join('')}
        </table>`)
      : ''

    // Sección comisiones técnicos
    const comisionesHtml = comisiones.length > 0 ? (() => {
      const totalCom = comisiones.reduce((s, t) => s + t.comisionTotal, 0)
      if (isTicket) {
        return section('Comisiones técnicos', comisiones.map(t =>
          `<div style="margin-bottom:2mm">
             <div style="font-weight:bold">${t.nombre}</div>
             <div style="display:flex;justify-content:space-between;font-size:8pt">
               <span>${t.ots} OTs · ${t.pctPromedio}% sobre ${fmt(t.baseCalculo)}</span>
               <span style="font-weight:bold;color:#6d28d9">${fmt(t.comisionTotal)}</span>
             </div>
           </div>`).join('') +
          `<div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px solid #000;margin-top:1mm;padding-top:1mm"><span>TOTAL COMISIONES</span><span style="color:#6d28d9">${fmt(totalCom)}</span></div>`)
      }
      const filas = comisiones.map(t => `
        <tr style="border-bottom:1px solid #eee">
          <td style="padding:1.5mm 2mm">${t.nombre}</td>
          <td style="padding:1.5mm 2mm;text-align:right">${t.ots}</td>
          <td style="padding:1.5mm 2mm;text-align:right">${fmt(t.ingresosBruto)}</td>
          <td style="padding:1.5mm 2mm;text-align:right;color:#dc2626">-${fmt(t.costoRep)}</td>
          <td style="padding:1.5mm 2mm;text-align:right;color:#ea580c">-${fmt(t.comBanco)}</td>
          <td style="padding:1.5mm 2mm;text-align:right">${fmt(t.baseCalculo)}</td>
          <td style="padding:1.5mm 2mm;text-align:right">${t.pctPromedio}%</td>
          <td style="padding:1.5mm 2mm;text-align:right;font-weight:bold;color:#6d28d9">${fmt(t.comisionTotal)}</td>
          <td style="padding:1.5mm 2mm;text-align:right;color:#16a34a">${fmt(t.ganancia)}</td>
        </tr>`).join('')
      return section('💼 Comisiones técnicos', `
        <table style="width:100%;font-size:8pt;border-collapse:collapse">
          <thead style="background:#f5f3ff">
            <tr>
              <th style="text-align:left;padding:1.5mm 2mm">Técnico</th>
              <th style="text-align:right;padding:1.5mm 2mm">OTs</th>
              <th style="text-align:right;padding:1.5mm 2mm">Bruto</th>
              <th style="text-align:right;padding:1.5mm 2mm">Repuestos</th>
              <th style="text-align:right;padding:1.5mm 2mm">Com.banco</th>
              <th style="text-align:right;padding:1.5mm 2mm">Base</th>
              <th style="text-align:right;padding:1.5mm 2mm">%</th>
              <th style="text-align:right;padding:1.5mm 2mm">Comisión</th>
              <th style="text-align:right;padding:1.5mm 2mm">Ganancia neg.</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
          <tfoot style="background:#f5f3ff;font-weight:bold">
            <tr>
              <td colspan="7" style="padding:1.5mm 2mm">TOTAL COMISIONES</td>
              <td style="padding:1.5mm 2mm;text-align:right;color:#6d28d9">${fmt(totalCom)}</td>
              <td style="padding:1.5mm 2mm;text-align:right;color:#16a34a">${fmt(comisiones.reduce((s,t)=>s+t.ganancia,0))}</td>
            </tr>
          </tfoot>
        </table>
        <p style="font-size:7pt;color:#666;margin-top:2mm">Base = Neto − Repuestos − Com.banco · Comisión = Base × % por tipo</p>`)
    })() : ''

    const body = isTicket
      ? `${headerTicket}
         ${section('Ventas del día', ventasHtml)}
         ${section('Cierre físico', cierreHtml)}
         ${section('Cuadre', cuadreHtml)}
         ${cuentasHtml}${comisionesHtml}${obs}${firmasTicket}`
      : `${headerA4}
         ${section('Ventas del día', ventasHtml)}
         ${section('Cierre físico', cierreHtml)}
         ${section('Cuadre', cuadreHtml)}
         ${cuentasHtml}${comisionesHtml}${obs}${firmasA4}`

    const winW = formato === 'ticket57' ? '400' : formato === 'ticket80' ? '500' : '700'
    const win = window.open('', '_blank', `width=${winW},height=900`)
    if (!win) { alert('Activa las ventanas emergentes para imprimir'); return }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Cierre ${d.fecha}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:${fs};color:#111;padding:${bodyPad}}
  @page{size:${mm}${isTicket?' auto':''};margin:${margin}}
</style></head><body>${body}</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
  }

  if (loading || sesion === undefined) {
    return <div className="bg-white rounded-xl border p-4 animate-pulse h-16" />
  }

  // ── Vista cierre exitoso → seleccionar formato e imprimir ──────────────────
  if (view === 'cierre_ok' && cierreData) {
    const FORMATOS: { key: TicketFormato; label: string; desc: string; icon: string }[] = [
      { key: 'a4',       label: 'A4',          desc: '210 × 297 mm', icon: '🗒️' },
      { key: 'ticket80', label: 'Ticket 80mm',  desc: 'Térmica 80mm', icon: '🧾' },
      { key: 'ticket57', label: 'Ticket 57mm',  desc: 'Térmica 57mm', icon: '📜' },
    ]
    const totalComisiones = comisionData.reduce((s, t) => s + t.comisionTotal, 0)

    return (
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <div>
            <p className="font-bold text-gray-800">Caja cerrada correctamente</p>
            <p className="text-xs text-gray-500">Período: {new Date(cierreData.apertura).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})} → {new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</p>
          </div>
        </div>

        {/* Resumen comisiones */}
        {comisionData.length > 0 && (
          <div className="border border-purple-200 rounded-xl overflow-hidden">
            <div className="bg-purple-700 text-white px-4 py-2.5 flex items-center justify-between">
              <p className="font-semibold text-sm">💼 Comisiones de técnicos — esta sesión</p>
              <p className="font-bold">{formatCLP(totalComisiones)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-purple-50 border-b border-purple-100">
                  <tr>
                    {['Técnico','OTs','Ingreso bruto','Repuestos','Com. banco','Base','% com.','Comisión','Ganancia neg.'].map((h,i) => (
                      <th key={i} className={`px-2.5 py-2 font-semibold text-purple-700 ${i===0?'text-left':'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comisionData.map((t, i) => (
                    <tr key={i} className="hover:bg-purple-50">
                      <td className="px-2.5 py-2 font-medium">{t.nombre}</td>
                      <td className="px-2.5 py-2 text-right">{t.ots}</td>
                      <td className="px-2.5 py-2 text-right">{formatCLP(t.ingresosBruto)}</td>
                      <td className="px-2.5 py-2 text-right text-red-600">-{formatCLP(t.costoRep)}</td>
                      <td className="px-2.5 py-2 text-right text-orange-600">-{formatCLP(t.comBanco)}</td>
                      <td className="px-2.5 py-2 text-right text-gray-600">{formatCLP(t.baseCalculo)}</td>
                      <td className="px-2.5 py-2 text-right">{t.pctPromedio}%</td>
                      <td className="px-2.5 py-2 text-right font-bold text-purple-700">{formatCLP(t.comisionTotal)}</td>
                      <td className="px-2.5 py-2 text-right text-green-700 font-semibold">{formatCLP(t.ganancia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-purple-50 px-4 py-2 text-xs text-purple-700 border-t border-purple-100">
              Base = Neto − Repuestos − Comisión banco · Comisión = Base × % por tipo de reparación
            </div>
          </div>
        )}
        {comisionData.length === 0 && (
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-400 text-center">Sin OTs entregadas en esta sesión</div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Formato ticket de cierre</p>
          <div className="grid grid-cols-3 gap-2">
            {FORMATOS.map(f => (
              <button key={f.key} type="button" onClick={() => setFormatoTicket(f.key)}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-center transition-colors ${formatoTicket === f.key ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                <span className="text-xl">{f.icon}</span>
                <p className="text-sm font-semibold text-gray-800">{f.label}</p>
                <p className="text-xs text-gray-400">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => imprimirCierreCaja(cierreData, formatoTicket, comisionData)}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold transition-colors"
          >
            🖨️ Imprimir ticket de cierre
          </button>
          <button
            onClick={() => { setView('panel'); setCierreData(null); setComisionData([]) }}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Finalizar sin imprimir
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario apertura ────────────────────────────────────────────────────
  if (view === 'apertura') {
    return (
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">🔓 Apertura de caja</h3>
          <button onClick={() => setView('panel')} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="space-y-1.5">
          <Label>Efectivo en caja al abrir (fondo de cambio)</Label>
          <Input type="number" min={0} value={aperturaEfectivo} onChange={e => setAperturaEfectivo(e.target.value)} autoFocus />
          {parseInt(aperturaEfectivo) > 0 && <p className="text-xs text-green-600">{formatCLP(parseInt(aperturaEfectivo))}</p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={abrirCaja} disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? 'Abriendo...' : '🔓 Abrir caja'}
          </Button>
          <Button variant="outline" onClick={() => setView('panel')}>Cancelar</Button>
        </div>
      </div>
    )
  }

  // ── Formulario arqueo ──────────────────────────────────────────────────────
  if (view === 'arqueo') {
    const esperadoEf = sesion ? sesion.efectivo_apertura + ventas.efectivo : 0
    return (
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">🔢 Arqueo de caja</h3>
          <button onClick={() => setView('panel')} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-xs space-y-1">
          <p className="font-semibold text-blue-800">Esperado según sistema:</p>
          <div className="grid grid-cols-2 gap-1 text-blue-700">
            <span>Efectivo:</span><span className="font-bold">{formatCLP(esperadoEf)}</span>
            <span>Transbank (déb/cred):</span><span className="font-bold">{formatCLP(ventas.transbank)}</span>
            <span>Transferencias:</span><span className="font-bold">{formatCLP(ventas.transferencia)}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Efectivo contado</Label>
            <Input type="number" min={0} value={arqueoEfectivo} onChange={e => setArqueoEfectivo(e.target.value)} />
            {parseInt(arqueoEfectivo) !== esperadoEf && parseInt(arqueoEfectivo) >= 0 && (
              <p className={`text-xs font-medium ${parseInt(arqueoEfectivo) > esperadoEf ? 'text-green-600' : 'text-red-600'}`}>
                {parseInt(arqueoEfectivo) > esperadoEf ? '+' : ''}{formatCLP(parseInt(arqueoEfectivo) - esperadoEf)} diferencia
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Transbank (voucher)</Label>
            <Input type="number" min={0} value={arqueoTransbank} onChange={e => setArqueoTransbank(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Transferencias</Label>
            <Input type="number" min={0} value={arqueoTransferencia} onChange={e => setArqueoTransferencia(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Observaciones</Label>
          <Input value={arqueoObs} onChange={e => setArqueoObs(e.target.value)} placeholder="Notas del arqueo..." />
        </div>
        <div className="flex gap-2">
          <Button onClick={guardarArqueo} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Guardando...' : '✓ Guardar arqueo'}
          </Button>
          <Button variant="outline" onClick={() => setView('panel')}>Cancelar</Button>
        </div>
      </div>
    )
  }

  // ── Formulario cierre ──────────────────────────────────────────────────────
  if (view === 'cierre') {
    const esperadoEf = sesion ? sesion.efectivo_apertura + ventas.efectivo : 0
    const difEf = (parseInt(cierreEfectivo) || 0) - esperadoEf
    const difTb = (parseInt(cierreTransbank) || 0) - ventas.transbank
    const difTr = (parseInt(cierreTransferencia) || 0) - ventas.transferencia
    return (
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">🔒 Cierre de caja</h3>
          <button onClick={() => setView('panel')} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-3 text-center text-xs">
          {[
            { label: 'Esperado efectivo', value: formatCLP(esperadoEf) },
            { label: 'Esperado Transbank', value: formatCLP(ventas.transbank) },
            { label: 'Esperado Transferencia', value: formatCLP(ventas.transferencia) },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-lg p-2 border">
              <p className="text-gray-500">{k.label}</p>
              <p className="font-bold text-gray-800 mt-0.5">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">💵 Efectivo contado en caja</Label>
            <Input type="number" min={0} value={cierreEfectivo} onChange={e => setCierreEfectivo(e.target.value)} />
            <p className={`text-xs font-medium ${difEf === 0 ? 'text-gray-400' : difEf > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {difEf === 0 ? '✓ Cuadra' : `${difEf > 0 ? '+' : ''}${formatCLP(difEf)} ${difEf > 0 ? '(sobrante)' : '(faltante)'}`}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">💳 Transbank (reporte Z / cierre terminal)</Label>
            <Input type="number" min={0} value={cierreTransbank} onChange={e => setCierreTransbank(e.target.value)} />
            <p className={`text-xs font-medium ${difTb === 0 ? 'text-gray-400' : difTb > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {difTb === 0 ? '✓ Cuadra' : `${difTb > 0 ? '+' : ''}${formatCLP(difTb)} diferencia`}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">🏦 Transferencias recibidas</Label>
            <Input type="number" min={0} value={cierreTransferencia} onChange={e => setCierreTransferencia(e.target.value)} />
            <p className={`text-xs font-medium ${difTr === 0 ? 'text-gray-400' : difTr > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {difTr === 0 ? '✓ Cuadra' : `${difTr > 0 ? '+' : ''}${formatCLP(difTr)} diferencia`}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">📦 Otros (vales, cheques)</Label>
            <Input type="number" min={0} value={cierreOtros} onChange={e => setCierreOtros(e.target.value)} />
          </div>
        </div>

        {cuentas.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs">¿A qué cuenta(s) se depositaron las transferencias?</Label>
            <div className="flex flex-wrap gap-2">
              {cuentas.map(c => (
                <button key={c.id} type="button"
                  onClick={() => setCierreCuentas(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${cierreCuentas.includes(c.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400'}`}>
                  {c.banco} ···{c.numero.slice(-4)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Observaciones del cierre</Label>
          <Input value={cierreObs} onChange={e => setCierreObs(e.target.value)} placeholder="Novedades del día..." />
        </div>

        {/* Fecha de cierre — mostrar si la sesión fue abierta un día diferente */}
        <div className="space-y-1">
          <Label className="text-xs">
            📅 Fecha de cierre
            {sesion && sesion.fecha !== hoy && (
              <span className="ml-2 text-amber-600 font-normal">
                ⚠ La caja fue abierta el {new Date(sesion.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </Label>
          <input
            type="date"
            value={cierreFecha}
            min={sesion?.fecha}
            max={hoy}
            onChange={e => setCierreFecha(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {cierreFecha !== hoy && (
            <p className="text-xs text-amber-600">El cierre quedará registrado para el {new Date(cierreFecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex justify-between items-center">
          <span className="text-sm font-medium text-blue-800">Total cierre</span>
          <span className="font-bold text-blue-800">
            {formatCLP((parseInt(cierreEfectivo) || 0) + (parseInt(cierreTransbank) || 0) + (parseInt(cierreTransferencia) || 0) + (parseInt(cierreOtros) || 0))}
          </span>
        </div>

        <div className="flex gap-2">
          <Button onClick={cerrarCaja} disabled={saving} className="bg-gray-800 hover:bg-gray-900">
            {saving ? 'Cerrando...' : '🔒 Cerrar caja'}
          </Button>
          <Button variant="outline" onClick={() => setView('panel')}>Cancelar</Button>
        </div>
      </div>
    )
  }

  // ── Panel principal ────────────────────────────────────────────────────────

  // CAJA CERRADA o sin sesión → solo botón Abrir
  if (!sesion || sesion.estado === 'cerrada') {
    return (
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${sesion?.estado === 'cerrada' ? 'bg-gray-50 border-gray-200' : 'bg-white'}`}>
        <div>
          <p className="font-semibold text-gray-800 text-sm">
            {sesion?.estado === 'cerrada' ? '🔒 Caja cerrada' : '⚪ Caja sin abrir hoy'}
          </p>
          {sesion?.cierre_at && (
            <p className="text-xs text-gray-500">
              Cerrada a las {new Date(sesion.cierre_at).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}
              {' · '}Efectivo: {formatCLP(sesion.efectivo_cierre ?? 0)}
              {' · '}Transbank: {formatCLP(sesion.transbank_cierre ?? 0)}
              {' · '}Transfer.: {formatCLP(sesion.transferencia_cierre ?? 0)}
            </p>
          )}
        </div>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 shrink-0" onClick={() => setView('apertura')}>
          🔓 Abrir caja
        </Button>
      </div>
    )
  }

  // CAJA ABIERTA → solo botón Cerrar (+ arqueo secundario)
  const esperadoTotal = sesion.efectivo_apertura + ventas.total
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-green-50 border-b border-green-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-semibold text-green-800 text-sm">🟢 Caja abierta</p>
          <p className="text-xs text-green-700">
            Desde las {new Date(sesion.apertura_at).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}
            {' · '}Fondo: {formatCLP(sesion.efectivo_apertura)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50" onClick={() => { setArqueoEfectivo(String(sesion.efectivo_apertura + ventas.efectivo)); setArqueoTransbank(String(ventas.transbank)); setArqueoTransferencia(String(ventas.transferencia)); setView('arqueo') }}>
            🔢 Arqueo
          </Button>
          <Button size="sm" className="bg-red-700 hover:bg-red-800" onClick={() => setView('cierre')}>
            🔒 Cerrar caja
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0">
        {[
          { label: '💵 Efectivo', sistema: ventas.efectivo, esperado: sesion.efectivo_apertura + ventas.efectivo },
          { label: '💳 Transbank', sistema: ventas.transbank, esperado: ventas.transbank },
          { label: '🏦 Transferencia', sistema: ventas.transferencia, esperado: ventas.transferencia },
          { label: '📊 Total ventas', sistema: ventas.total, esperado: esperadoTotal },
        ].map((m, i) => (
          <div key={i} className="px-4 py-3 text-center">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className="font-bold text-gray-900 mt-0.5">{formatCLP(m.sistema)}</p>
            {i === 0 && <p className="text-xs text-gray-400">caja: {formatCLP(m.esperado)}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
