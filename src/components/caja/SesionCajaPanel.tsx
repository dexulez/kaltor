'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
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
  const [saving, setSaving] = useState(false)
  type TicketFormato = 'a4' | 'ticket80' | 'ticket57'
  const [formatoTicket, setFormatoTicket] = useState<TicketFormato>('a4')
  const [cierreData, setCierreData] = useState<{
    fecha: string; apertura: string; fondoApertura: number
    ventas: VentasDia; ef: number; tb: number; tr: number; ot: number
    difEf: number; cuentas: CuentaBancaria[]; cierreObs: string
  } | null>(null)

  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data: sesData }, { data: ventasData }, { data: cuentasData }] = await Promise.all([
      supabase.from('sesiones_caja').select('*').eq('fecha', hoy).order('created_at', { ascending: false }).limit(1),
      supabase.from('sales').select('total, metodo_pago').gte('created_at', `${hoy}T00:00:00`).lte('created_at', `${hoy}T23:59:59`).eq('anulada', false),
      supabase.from('cuentas_bancarias').select('id, banco, tipo_cuenta, numero, titular').eq('activa', true).order('orden'),
    ])
    const s = sesData?.[0] ?? null
    setSesion(s as Sesion | null)
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
    }
    setLoading(false)
  }, [hoy]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar() }, [cargar])

  async function abrirCaja() {
    setSaving(true)
    const { data, error } = await supabase.from('sesiones_caja').insert({
      fecha: hoy,
      estado: 'abierta',
      efectivo_apertura: parseInt(aperturaEfectivo) || 0,
      apertura_at: new Date().toISOString(),
    }).select().single()
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
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
    const ef = parseInt(cierreEfectivo) || 0
    const tb = parseInt(cierreTransbank) || 0
    const tr = parseInt(cierreTransferencia) || 0
    const ot = parseInt(cierreOtros) || 0
    const difEf = ef - (sesion.efectivo_apertura + ventas.efectivo)
    const { error } = await supabase.from('sesiones_caja').update({
      estado: 'cerrada',
      efectivo_cierre: ef,
      transbank_cierre: tb,
      transferencia_cierre: tr,
      otros_cierre: ot,
      diferencia_efectivo: difEf,
      cuentas_transferencia: cierreCuentas.length ? cierreCuentas : null,
      observaciones_cierre: cierreObs || null,
      cierre_at: new Date().toISOString(),
    }).eq('id', sesion.id)
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    toast.success('Caja cerrada correctamente')

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
  }, formato: TicketFormato = 'a4') {
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

    const body = isTicket
      ? `${headerTicket}
         ${section('Ventas del día', ventasHtml)}
         ${section('Cierre físico', cierreHtml)}
         ${section('Cuadre', cuadreHtml)}
         ${cuentasHtml}${obs}${firmasTicket}`
      : `${headerA4}
         ${section('Ventas del día', ventasHtml)}
         ${section('Cierre físico', cierreHtml)}
         ${section('Cuadre', cuadreHtml)}
         ${cuentasHtml}${obs}${firmasA4}`

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
      { key: 'a4',       label: 'A4',        desc: '210 × 297 mm · hoja completa', icon: '🗒️' },
      { key: 'ticket80', label: 'Ticket 80mm', desc: 'Impresora térmica 80 mm',     icon: '🧾' },
      { key: 'ticket57', label: 'Ticket 57mm', desc: 'Impresora térmica 57 mm',     icon: '📜' },
    ]
    return (
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <div>
            <p className="font-bold text-gray-800">Caja cerrada correctamente</p>
            <p className="text-xs text-gray-500">Selecciona el formato del ticket de cierre e imprímelo cuando quieras</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Formato de impresión</p>
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
            onClick={() => imprimirCierreCaja(cierreData, formatoTicket)}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold transition-colors"
          >
            🖨️ Imprimir ticket de cierre
          </button>
          <button
            onClick={() => { setView('panel'); setCierreData(null) }}
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
