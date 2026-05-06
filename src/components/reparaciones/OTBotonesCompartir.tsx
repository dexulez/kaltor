'use client'

import { useState } from 'react'
import { formatCLP } from '@/lib/calculations'

const TIPO_LABELS: Record<string, string> = {
  pantalla: 'Pantalla', bateria: 'Batería', placa: 'Placa madre',
  software: 'Software', camara: 'Cámara', conector: 'Conector', otro: 'Otro',
}

type PrintFormat = 'a5h' | 'a5v' | 'a4' | 'ticket'

interface OTParaCompartir {
  numero_ot: string
  codigo_seguimiento: string
  estado: string
  created_at: string
  tipo_reparacion?: string | null
  presupuesto_estimado?: number | null
  precio_servicio?: number | null
  diagnostico_tecnico?: string | null
  dias_garantia?: number | null
  customers?: { nombre: string; telefono: string; rut?: string | null; email?: string | null } | null
  equipment?: {
    marca: string; modelo: string; color?: string | null; capacidad?: string | null
    imei?: string | null; accesorios?: string[]; condicion_visual?: string[]
    falla_reportada: string; observaciones?: string | null
  } | null
  user_profiles?: { nombre_completo: string } | null
}

interface Config {
  nombre_local: string
  rut_local?: string | null
  direccion?: string | null
  telefono?: string | null
  whatsapp?: string | null
  email?: string | null
  logo_url?: string | null
  terminos_condiciones?: string | null
}

interface Props { ot: OTParaCompartir; config: Config; baseUrl: string }

const TC_DEFAULT = `El cliente declara que los datos proporcionados y el equipo entregado es de su propiedad y es totalmente responsable del mismo.
Todo equipo marcado como RIESGOSO tiene probabilidad de daño permanente, el cliente acepta el riesgo llegando a un acuerdo mutuo entre las partes.
Todo equipo MOJADO se considerará tipo de reparación RIESGOSA. Todo equipo MOJADO después de la entrega pierde cualquier garantía.
Equipos con PANTALLA APAGADA NO TIENEN GARANTÍA, EL CLIENTE ASUME Y AUTORIZA SU REPARACIÓN SIENDO CONSCIENTE DE ESTO.
En caso de garantía, la empresa no se hace responsable por daños ocasionados por mal uso o imprudencia del cliente.
Pantallas y Glases NO TIENEN GARANTÍA.
Las pantallas solo tienen garantía de 30 días si deja de funcionar el táctil, sin daños por mal uso.
La empresa tiene sesenta (60) días después de la fecha de entrega pautada en este documento.
El cliente declara haber leído estas condiciones y aceptarlas al momento de FIRMAR.
Documento válido SÓLO si tiene firma de un funcionario y sello de la empresa.`

const FORMAT_INFO: Record<PrintFormat, { label: string; desc: string; icon: string }> = {
  a5h: { label: 'A5 Horizontal', desc: '210 × 148 mm · 2 columnas', icon: '📄' },
  a5v: { label: 'A5 Vertical',   desc: '148 × 210 mm · columna única', icon: '📃' },
  a4:  { label: 'A4',            desc: '210 × 297 mm · 2 copias', icon: '🗒️' },
  ticket: { label: 'Ticket térmico', desc: '80 mm × continuo', icon: '🧾' },
}

export default function OTBotonesCompartir({ ot, config, baseUrl }: Props) {
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [formato, setFormato] = useState<PrintFormat>('a5h')
  const [incluirTC, setIncluirTC] = useState(true)
  const [copias, setCopias] = useState<1 | 2>(2)

  const trackingUrl = `${baseUrl}/seguimiento/${ot.codigo_seguimiento}`
  const cliente = ot.customers
  const equipo = ot.equipment
  const fecha = new Date(ot.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const tc = config.terminos_condiciones || TC_DEFAULT

  // ── Generadores de HTML ────────────────────────────────────────────────────

  const logoHtml = config.logo_url
    ? `<img src="${config.logo_url}" style="max-height:14mm;max-width:50mm;display:block;object-fit:contain" alt="Logo">`
    : `<span style="font-size:22pt">🔧</span>`

  const presupuestoHtml = ot.presupuesto_estimado
    ? `<tr><td>Presupuesto est.:</td><td style="text-align:right">${formatCLP(ot.presupuesto_estimado)}</td></tr>` : ''
  const precioHtml = ot.precio_servicio
    ? `<tr style="font-size:10pt;font-weight:bold"><td>TOTAL:</td><td style="text-align:right;color:#16a34a">${formatCLP(ot.precio_servicio)}</td></tr>` : ''

  const clienteHtml = `
    <div><strong>${cliente?.nombre ?? '—'}</strong></div>
    <div>${cliente?.telefono ?? ''}</div>
    ${cliente?.rut ? `<div>RUT: ${cliente.rut}</div>` : ''}
    ${cliente?.email ? `<div>${cliente.email}</div>` : ''}`

  const equipoHtml = `
    <div><strong>${equipo?.marca ?? ''} ${equipo?.modelo ?? ''}</strong></div>
    ${equipo?.color || equipo?.capacidad ? `<div>${[equipo?.color, equipo?.capacidad].filter(Boolean).join(' · ')}</div>` : ''}
    ${equipo?.imei ? `<div style="font-family:monospace;font-size:7pt">IMEI: ${equipo.imei}</div>` : ''}
    ${equipo?.accesorios?.length ? `<div>Acc: ${equipo.accesorios.join(', ')}</div>` : ''}
    ${equipo?.condicion_visual?.length ? `<div>Cond: ${equipo.condicion_visual.join(', ')}</div>` : ''}`

  const servicioHtml = `
    ${ot.tipo_reparacion ? `<div>Tipo: ${TIPO_LABELS[ot.tipo_reparacion] ?? ot.tipo_reparacion}</div>` : ''}
    ${ot.user_profiles ? `<div>Técnico: ${ot.user_profiles.nombre_completo}</div>` : ''}
    <div style="margin-top:2mm"><strong>Falla:</strong> ${equipo?.falla_reportada ?? '—'}</div>
    ${ot.diagnostico_tecnico ? `<div><strong>Diagnóstico:</strong> ${ot.diagnostico_tecnico}</div>` : ''}`

  const cobroHtml = `
    <table style="width:100%;font-size:8pt;border-collapse:collapse">
      <tbody>
        ${presupuestoHtml}${precioHtml}
      </tbody>
    </table>`

  const firmasHtml = `
    <div style="display:flex;gap:6mm;margin-top:5mm">
      <div style="flex:1"><div style="height:12mm;border-bottom:1px solid #000"></div><div style="text-align:center;font-size:7pt;padding-top:1mm">Firma y RUT cliente</div></div>
      <div style="flex:1"><div style="height:12mm;border-bottom:1px solid #000"></div><div style="text-align:center;font-size:7pt;padding-top:1mm">Firma técnico / Sello</div></div>
    </div>`

  const headerHtml = `
    <div style="display:flex;align-items:center;gap:4mm;border-bottom:2px solid #000;padding-bottom:3mm;margin-bottom:3mm">
      ${logoHtml}
      <div style="flex:1">
        <div style="font-size:10pt;font-weight:bold">${config.nombre_local}</div>
        ${config.rut_local ? `<div>RUT: ${config.rut_local}</div>` : ''}
        ${config.direccion ? `<div>${config.direccion}</div>` : ''}
        ${config.telefono ? `<div>Tel: ${config.telefono}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:9pt;font-weight:bold;font-family:monospace;color:#1a4e9f">${ot.numero_ot}</div>
        <div>${fecha}</div>
        <div>Garantía: ${ot.dias_garantia ?? 30} días</div>
      </div>
    </div>`

  const tcHtml = incluirTC ? `
    <div style="page-break-before:always">
      <div style="background:#374151;color:#fff;text-align:center;padding:2mm;font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px">
        Cláusulas y Condiciones para la Recepción de Equipos
      </div>
      <ul style="font-size:6.5pt;column-count:2;column-gap:5mm;line-height:1.4;margin-top:3mm;padding-left:10px">
        ${tc.split('\n').filter(Boolean).map(l => `<li style="margin-bottom:2px">${l.replace(/^•\s*/, '')}</li>`).join('')}
      </ul>
      <p style="text-align:center;font-size:7pt;margin-top:4mm;color:#555">
        ${config.nombre_local}${config.rut_local ? ` · RUT ${config.rut_local}` : ''}${config.telefono ? ` · ${config.telefono}` : ''}
      </p>
    </div>` : ''

  const trackingBox = `<div style="border:1px dashed #999;padding:2mm;text-align:center;font-size:7pt;margin-top:2mm;border-radius:2px">Seguimiento: <strong>${trackingUrl}</strong></div>`

  // ── Generar cuerpo HTML por formato ───────────────────────────────────────

  function generarCuerpo(): string {
    const sectionTitle = (t: string) => `<div style="font-weight:bold;border-bottom:1px solid #666;margin:2mm 0 1mm;padding-bottom:0.5mm;font-size:7pt;text-transform:uppercase;letter-spacing:0.5px">${t}</div>`
    const unaRecepcion = (compact = false) => `
      ${headerHtml}
      ${compact ? '' : `<div style="text-align:center;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:3mm">Comprobante de Recepción</div>`}
      <div style="display:flex;gap:4mm">
        <div style="flex:1">
          ${sectionTitle('Cliente')}${clienteHtml}
          ${sectionTitle('Servicio')}${servicioHtml}
        </div>
        <div style="flex:1">
          ${sectionTitle('Equipo')}${equipoHtml}
          ${sectionTitle('Cobro')}${cobroHtml}
        </div>
      </div>
      ${trackingBox}${firmasHtml}`

    if (formato === 'a5h') {
      const sep = copias === 2 ? '<hr style="border:none;border-top:3px dashed #aaa;margin:5mm 0">' : ''
      const copia2 = copias === 2 ? `
        <div>
          ${headerHtml}
          <div style="display:flex;gap:4mm">
            <div style="flex:1">${sectionTitle('Cliente')}${clienteHtml}${sectionTitle('Servicio')}${servicioHtml}</div>
            <div style="flex:1">${sectionTitle('Equipo')}${equipoHtml}${sectionTitle('Cobro')}${cobroHtml}</div>
          </div>
          ${firmasHtml}
        </div>` : ''
      return `${unaRecepcion()}${sep}${copia2}${tcHtml}`
    }

    if (formato === 'a5v') {
      const unaVertical = () => `
        ${headerHtml}
        ${sectionTitle('Cliente')}${clienteHtml}
        ${sectionTitle('Equipo')}${equipoHtml}
        ${sectionTitle('Servicio')}${servicioHtml}
        ${sectionTitle('Cobro')}${cobroHtml}
        ${trackingBox}${firmasHtml}`
      const sep = copias === 2 ? '<hr style="border:none;border-top:3px dashed #aaa;margin:4mm 0">' : ''
      const copia2 = copias === 2 ? `
        ${sep}${headerHtml}
        <div style="display:flex;gap:4mm">
          <div style="flex:1">${sectionTitle('Cliente')}${clienteHtml}</div>
          <div style="flex:1">${sectionTitle('Equipo')}${equipoHtml}${sectionTitle('Cobro')}${cobroHtml}</div>
        </div>
        ${firmasHtml}` : ''
      return `${unaVertical()}${copia2}${tcHtml}`
    }

    if (formato === 'a4') {
      return `
        <div style="text-align:center;font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:3mm">Comprobante de Recepción</div>
        <div style="display:flex;gap:4mm">
          <div style="flex:1">
            ${sectionTitle('Cliente')}${clienteHtml}
            ${sectionTitle('Servicio')}${servicioHtml}
          </div>
          <div style="flex:1">
            ${sectionTitle('Equipo')}${equipoHtml}
            ${sectionTitle('Cobro')}${cobroHtml}
          </div>
        </div>
        ${trackingBox}${firmasHtml}
        <hr style="border:none;border-top:3px dashed #aaa;margin:8mm 0">
        ${headerHtml}
        <div style="display:flex;gap:4mm">
          <div style="flex:1">${sectionTitle('Cliente')}${clienteHtml}</div>
          <div style="flex:1">${sectionTitle('Equipo')}${equipoHtml}${sectionTitle('Cobro')}${cobroHtml}</div>
        </div>
        ${firmasHtml}
        ${tcHtml}`
    }

    // ticket 80mm
    return `
      <div style="text-align:center;margin-bottom:3mm">
        ${logoHtml}
        <div style="font-size:9pt;font-weight:bold">${config.nombre_local}</div>
        ${config.telefono ? `<div>${config.telefono}</div>` : ''}
      </div>
      <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:2mm 0;margin:2mm 0;text-align:center">
        <div style="font-size:9pt;font-weight:bold;font-family:monospace">${ot.numero_ot}</div>
        <div>Fecha: ${fecha}</div>
      </div>
      ${sectionTitle('CLIENTE')}
      <div>${cliente?.nombre ?? '—'}</div>
      <div>${cliente?.telefono ?? ''}</div>
      ${cliente?.rut ? `<div>RUT: ${cliente.rut}</div>` : ''}
      ${sectionTitle('EQUIPO')}
      <div><strong>${equipo?.marca ?? ''} ${equipo?.modelo ?? ''}</strong></div>
      ${equipo?.imei ? `<div style="font-family:monospace;font-size:7pt">IMEI: ${equipo.imei}</div>` : ''}
      ${sectionTitle('FALLA')}
      <div>${equipo?.falla_reportada ?? '—'}</div>
      ${ot.presupuesto_estimado ? `${sectionTitle('PRESUPUESTO')}<div>${formatCLP(ot.presupuesto_estimado)}</div>` : ''}
      ${ot.precio_servicio ? `${sectionTitle('TOTAL')}<div style="font-size:10pt;font-weight:bold;color:#16a34a">${formatCLP(ot.precio_servicio)}</div>` : ''}
      <div style="border-top:1px dashed #000;margin:3mm 0;padding-top:2mm;font-size:7pt;text-align:center">
        Seguimiento: ${ot.codigo_seguimiento}
      </div>
      <div style="height:15mm;border-bottom:1px solid #000;margin-bottom:1mm"></div>
      <div style="text-align:center;font-size:7pt">Firma cliente</div>
      <div style="height:15mm;border-bottom:1px solid #000;margin:3mm 0 1mm"></div>
      <div style="text-align:center;font-size:7pt">Sello empresa</div>`
  }

  // ── CSS por formato ────────────────────────────────────────────────────────

  function getPageCSS(): string {
    if (formato === 'a5h') return `@page { size: A5 landscape; margin: 6mm; }`
    if (formato === 'a5v') return `@page { size: A5 portrait; margin: 6mm; }`
    if (formato === 'a4')  return `@page { size: A4; margin: 10mm; }`
    return `@page { size: 80mm auto; margin: 3mm; }` // ticket
  }

  function handleImprimir() {
    const win = window.open('', '_blank', 'width=700,height=900')
    if (!win) { alert('Permite popups para imprimir'); return }

    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${ot.numero_ot} — ${config.nombre_local}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#000;background:#fff}
  ${getPageCSS()}
  table{width:100%;border-collapse:collapse}
  td{padding:1px 2px;vertical-align:top}
</style>
</head>
<body>${generarCuerpo()}</body>
</html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
    setShowPrintModal(false)
  }

  // ── WhatsApp / Email ───────────────────────────────────────────────────────
  function getWhatsAppUrl(destino: 'cliente' | 'empresa') {
    const phone = (destino === 'cliente' ? (cliente?.telefono ?? '') : (config.whatsapp ?? '')).replace(/\D/g, '')
    const msg = `Hola ${cliente?.nombre ?? 'cliente'}, te informamos sobre tu ${equipo?.marca ?? ''} ${equipo?.modelo ?? ''} en *${config.nombre_local}*.\n\nOT: *${ot.numero_ot}*\nEstado: ${ot.estado.replace(/_/g, ' ')}\n\nSeguimiento en línea:\n${trackingUrl}`
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  function getEmailUrl() {
    const subject = `Tu reparación ${ot.numero_ot} — ${config.nombre_local}`
    const body = `Hola ${cliente?.nombre ?? 'cliente'},\n\nTe informamos sobre el estado de tu ${equipo?.marca ?? ''} ${equipo?.modelo ?? ''}.\n\nOT: ${ot.numero_ot}\nEstado: ${ot.estado.replace(/_/g, ' ')}\n\nSeguimiento en línea:\n${trackingUrl}\n\n${config.nombre_local}${config.telefono ? `\nTel: ${config.telefono}` : ''}`
    return `mailto:${cliente?.email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* Imprimir */}
        <button
          onClick={() => setShowPrintModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-900 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          🖨️ Imprimir comprobante
        </button>

        {/* Compartir */}
        <div className="relative">
          <button
            onClick={() => setShowShareMenu(s => !s)}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            📲 Enviar seguimiento
          </button>
          {showShareMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 w-64 p-2 space-y-1">
              <p className="text-xs text-gray-500 px-2 py-1 font-medium uppercase tracking-wide">Enviar por:</p>
              {cliente?.telefono && (
                <a href={getWhatsAppUrl('cliente')} target="_blank" rel="noopener noreferrer" onClick={() => setShowShareMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-green-50 text-gray-700">
                  <span className="text-lg">📱</span>
                  <div><p className="text-sm font-medium">WhatsApp al cliente</p><p className="text-xs text-gray-400">{cliente.telefono}</p></div>
                </a>
              )}
              {config.whatsapp && (
                <a href={getWhatsAppUrl('empresa')} target="_blank" rel="noopener noreferrer" onClick={() => setShowShareMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-green-50 text-gray-700">
                  <span className="text-lg">🏪</span>
                  <div><p className="text-sm font-medium">WhatsApp empresa</p><p className="text-xs text-gray-400">{config.whatsapp}</p></div>
                </a>
              )}
              {cliente?.email && (
                <a href={getEmailUrl()} onClick={() => setShowShareMenu(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-gray-700">
                  <span className="text-lg">📧</span>
                  <div><p className="text-sm font-medium">Correo electrónico</p><p className="text-xs text-gray-400">{cliente.email}</p></div>
                </a>
              )}
              <button onClick={() => { navigator.clipboard.writeText(trackingUrl).catch(() => {}); alert('Link copiado'); setShowShareMenu(false) }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 w-full text-left">
                <span className="text-lg">🔗</span>
                <div><p className="text-sm font-medium">Copiar link</p><p className="text-xs text-gray-400 truncate max-w-40">{trackingUrl}</p></div>
              </button>
            </div>
          )}
          {showShareMenu && <div className="fixed inset-0 z-10" onClick={() => setShowShareMenu(false)} />}
        </div>
      </div>

      {/* ── Modal configuración de impresión ──────────────────────────────── */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPrintModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <p className="font-semibold text-gray-800">Configurar impresión</p>
                <p className="text-xs text-gray-500">{ot.numero_ot} — {config.nombre_local}</p>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>

            <div className="p-5 space-y-5">
              {/* Formato */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Tamaño de hoja</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(FORMAT_INFO) as [PrintFormat, typeof FORMAT_INFO[PrintFormat]][]).map(([key, info]) => (
                    <button key={key} onClick={() => setFormato(key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors ${formato === key ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                      <span className="text-lg">{info.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{info.label}</p>
                        <p className="text-xs text-gray-400">{info.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Copias (solo para no-ticket) */}
              {formato !== 'ticket' && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Copias por hoja</p>
                  <div className="flex gap-2">
                    {([1, 2] as const).map(n => (
                      <button key={n} onClick={() => setCopias(n)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${copias === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                        {n} copia{n > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">{copias === 2 ? 'Una para el cliente, una para el taller (separadas por línea punteada)' : 'Solo una copia en la hoja'}</p>
                </div>
              )}

              {/* T&C */}
              {formato !== 'ticket' && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Términos y condiciones</p>
                  <label className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:bg-gray-50 transition-colors">
                    <input type="checkbox" checked={incluirTC} onChange={e => setIncluirTC(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Imprimir T&C al dorso</p>
                      <p className="text-xs text-gray-400">Se imprime en hoja separada, parte trasera del comprobante</p>
                    </div>
                  </label>
                  {!incluirTC && (
                    <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                      Solo si tu papel ya tiene los T&C pre-impresos al dorso
                    </p>
                  )}
                </div>
              )}

              {/* Resumen */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-0.5">
                <p>• Formato: <strong className="text-gray-700">{FORMAT_INFO[formato].label}</strong></p>
                {formato !== 'ticket' && <p>• Copias: <strong className="text-gray-700">{copias}</strong></p>}
                {formato !== 'ticket' && <p>• T&C al dorso: <strong className="text-gray-700">{incluirTC ? 'Sí' : 'No'}</strong></p>}
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setShowPrintModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleImprimir}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm">
                🖨️ Imprimir ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
