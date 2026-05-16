'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
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
  fecha_estimada_entrega?: string | null
  customers?: { nombre: string; telefono: string; rut?: string | null; email?: string | null } | null
  equipment?: {
    marca: string; modelo: string; color?: string | null; capacidad?: string | null
    imei?: string | null; imei2?: string | null; numero_serie?: string | null
    accesorios?: string[]; condicion_visual?: string[]
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

interface Props { ot: OTParaCompartir; config: Config; baseUrl: string; mostrarTecnico?: boolean }

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

export default function OTBotonesCompartir({ ot, config, baseUrl, mostrarTecnico = true }: Props) {
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [formato, setFormato] = useState<PrintFormat>('a5h')
  const [incluirTC, setIncluirTC] = useState(true)
  const [copias, setCopias] = useState<1 | 2>(2)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')

  const trackingUrl = `${baseUrl}/seguimiento/${ot.codigo_seguimiento}`

  useEffect(() => {
    QRCode.toDataURL(trackingUrl, { width: 160, margin: 1, color: { dark: '#1e3a5f', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => {})
  }, [trackingUrl])
  const cliente = ot.customers
  const equipo = ot.equipment
  const fecha = new Date(ot.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const fechaHoraRecibido = new Date(ot.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const fechaEntregaStr = ot.fecha_estimada_entrega
    ? new Date(ot.fecha_estimada_entrega + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null
  const tc = config.terminos_condiciones || TC_DEFAULT

  // ── Generadores de HTML ────────────────────────────────────────────────────

  const logoHtml = config.logo_url
    ? `<img src="${config.logo_url}" style="max-height:14mm;max-width:50mm;display:block;object-fit:contain" alt="Logo">`
    : `<span style="font-size:22pt">🔧</span>`

  const tcHtml = incluirTC ? `
    <div style="margin-top:3mm;border-top:1px solid #ccc;padding-top:2mm">
      <div style="background:#374151;color:#fff;text-align:center;padding:1mm 2mm;font-size:6pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1mm">
        Cláusulas y Condiciones
      </div>
      <ul style="font-size:5.5pt;column-count:2;column-gap:4mm;line-height:1.3;padding-left:8px">
        ${tc.split('\n').filter(Boolean).map(l => `<li style="margin-bottom:1px">${l.replace(/^•\s*/, '')}</li>`).join('')}
      </ul>
    </div>` : ''

  // ── CSS base compartido ────────────────────────────────────────────────────
  const CSS_BASE = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#111;background:#fff}
    table{width:100%;border-collapse:collapse}
    td{padding:1px 2px;vertical-align:top}
    .box{border:1.5px solid #e5e7eb;border-radius:5px;overflow:hidden;break-inside:avoid}
    .box-hdr{background:#1e3a5f;color:#fff;padding:2mm 3mm;font-size:7.5pt;font-weight:bold;display:flex;align-items:center;gap:2mm;white-space:nowrap}
    .box-hdr span{font-size:11pt;line-height:1}
    .box-body{padding:2.5mm 3mm;font-size:8pt;line-height:1.5}
    .box-body strong{font-weight:600}
    .acc-ok{color:#16a34a;font-weight:bold}
    .sig-row{display:flex;gap:8mm;margin-top:4mm}
    .sig{flex:1;border-top:1px solid #111;padding-top:1mm;text-align:center;font-size:7pt;color:#6b7280}
    .track{border:1.5px dashed #9ca3af;border-radius:4px;padding:2mm 4mm;display:flex;align-items:center;gap:3mm;font-size:7.5pt}
    .track-icon{font-size:13pt;flex-shrink:0}
    .ot-badge{background:#1e3a5f;color:#fff;padding:2.5mm 4mm;border-radius:5px;text-align:right;min-width:44mm}
    .ot-badge-label{font-size:6.5pt;letter-spacing:1px;text-transform:uppercase;color:#93c5fd}
    .ot-badge-num{font-size:11pt;font-weight:bold;font-family:monospace;color:#fbbf24;line-height:1.2}
    .ot-badge-info{font-size:7.5pt;line-height:1.4}
    .title-line{text-align:center;font-size:10.5pt;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:2mm 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin:3mm 0}
    .cobro-tbl td:last-child{text-align:right;font-weight:600}
    .cobro-total{border-top:2px solid #111;font-size:9pt;font-weight:bold}
    .separator{border:none;border-top:3px dashed #d1d5db;margin:6mm 0}`

  // ── Cabecera profesional (igual en todos los formatos) ─────────────────────
  function cabeceraHtml() {
    return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2mm">
      <div style="display:flex;align-items:center;gap:3mm">
        ${logoHtml}
        <div>
          <div style="font-size:11pt;font-weight:bold;line-height:1.1">${config.nombre_local}</div>
          ${config.rut_local ? `<div style="font-size:7.5pt">RUT: ${config.rut_local}</div>` : ''}
          ${config.direccion ? `<div style="font-size:7.5pt">${config.direccion}</div>` : ''}
          ${config.telefono ? `<div style="font-size:7.5pt">Tel: ${config.telefono}</div>` : ''}
        </div>
      </div>
      <div class="ot-badge">
        <div class="ot-badge-label">Orden de Trabajo</div>
        <div class="ot-badge-num">${ot.numero_ot}</div>
        <div class="ot-badge-info">Recibido: ${fechaHoraRecibido}</div>
        ${fechaEntregaStr ? `<div class="ot-badge-info">Entrega est.: ${fechaEntregaStr}</div>` : ''}
      </div>
    </div>`
  }

  // ── Bloques de contenido ───────────────────────────────────────────────────
  function boxCliente() {
    return `<div class="box">
      <div class="box-hdr"><span>&#128100;</span> INFORMACIÓN DEL CLIENTE</div>
      <div class="box-body">
        <div><strong>${cliente?.nombre ?? '—'}</strong></div>
        <div>${cliente?.telefono ?? ''}</div>
        ${cliente?.rut ? `<div>RUT: ${cliente.rut}</div>` : ''}
        ${cliente?.email ? `<div>${cliente.email}</div>` : ''}
      </div>
    </div>`
  }

  function boxEquipo() {
    const accs = equipo?.accesorios?.length
      ? equipo.accesorios.map(a => `${a} <span class="acc-ok">&#10003;</span>`).join(' · ')
      : null
    return `<div class="box" style="height:100%">
      <div class="box-hdr"><span>&#128241;</span> DETALLES DEL EQUIPO</div>
      <div class="box-body" style="word-break:break-word">
        <div><strong>${equipo?.marca ?? ''} ${equipo?.modelo ?? ''}</strong></div>
        ${(equipo?.color || equipo?.capacidad) ? `<div>${[equipo?.color, equipo?.capacidad].filter(Boolean).join(' · ')}</div>` : ''}
        ${equipo?.imei ? `<div style="font-family:monospace;font-size:7pt;word-break:break-all">IMEI 1: ${equipo.imei}</div>` : ''}
        ${equipo?.imei2 ? `<div style="font-family:monospace;font-size:7pt;word-break:break-all">IMEI 2: ${equipo.imei2}</div>` : ''}
        ${equipo?.numero_serie ? `<div style="font-family:monospace;font-size:7pt">S/N: ${equipo.numero_serie}</div>` : ''}
        ${accs ? `<div style="font-size:7.5pt;line-height:1.6">Acc: ${accs}</div>` : ''}
        ${equipo?.condicion_visual?.length ? `<div style="font-size:7.5pt;line-height:1.6">Cond: ${equipo.condicion_visual.join(' · ')}</div>` : ''}
        ${equipo?.observaciones ? `<div style="font-size:7.5pt;margin-top:1mm"><strong>Obs:</strong> ${equipo.observaciones}</div>` : ''}
      </div>
    </div>`
  }

  function boxServicio() {
    // 20% más grande: font-size 9.6pt, padding 3mm
    return `<div class="box">
      <div class="box-hdr"><span>&#128295;</span> INFORMACIÓN DEL SERVICIO</div>
      <div class="box-body" style="font-size:9.6pt;padding:3mm 3.5mm;line-height:1.6">
        ${ot.tipo_reparacion ? `<div><strong>Tipo:</strong> ${TIPO_LABELS[ot.tipo_reparacion] ?? ot.tipo_reparacion}</div>` : ''}
        ${mostrarTecnico && ot.user_profiles ? `<div><strong>Técnico:</strong> ${ot.user_profiles.nombre_completo}</div>` : ''}
        <div><strong>Falla:</strong> ${equipo?.falla_reportada ?? '—'}</div>
        ${equipo?.observaciones ? `<div><strong>Obs:</strong> ${equipo.observaciones}</div>` : ''}
        ${ot.diagnostico_tecnico ? `<div><strong>Diagnóstico:</strong> ${ot.diagnostico_tecnico}</div>` : ''}
      </div>
    </div>`
  }

  function boxCobro() {
    const rows = [
      ot.presupuesto_estimado ? `<tr><td>Presupuesto est.</td><td style="font-weight:bold">${formatCLP(ot.presupuesto_estimado)}</td></tr>` : '',
      ot.precio_servicio ? `<tr class="cobro-total"><td>Total</td><td style="color:#16a34a">${formatCLP(ot.precio_servicio)}</td></tr>` : '',
    ].filter(Boolean).join('')
    return `<div class="box">
      <div class="box-hdr"><span>&#36;</span> DETALLES DE COBRO</div>
      <div class="box-body" style="font-size:6.5pt;padding:2mm 3mm;line-height:1.4">
        <table class="cobro-tbl">
          <thead><tr style="border-bottom:1px solid #e5e7eb;font-size:6pt;color:#6b7280"><td>Concepto</td><td style="text-align:right">Monto</td></tr></thead>
          <tbody>${rows || '<tr><td colspan="2" style="color:#9ca3af;font-size:6pt">Sin precio asignado</td></tr>'}</tbody>
        </table>
      </div>
    </div>`
  }

  function trackHtml() {
    const qrImg = qrDataUrl
      ? `<img src="${qrDataUrl}" style="width:22mm;height:22mm;display:block;flex-shrink:0" alt="QR seguimiento">`
      : `<div style="width:22mm;height:22mm;flex-shrink:0;border:1px dashed #9ca3af;display:flex;align-items:center;justify-content:center;font-size:7pt;color:#9ca3af">QR</div>`
    return `<div class="track">
      ${qrImg}
      <div>
        <div style="font-size:7pt;color:#6b7280;margin-bottom:1mm">Escanea para ver el estado de tu reparación</div>
        <div style="font-size:7.5pt"><strong><a href="${trackingUrl}" style="color:#2563eb;text-decoration:none">${trackingUrl}</a></strong></div>
      </div>
    </div>`
  }

  function firmasHtml() {
    return `<div class="sig-row">
      <div class="sig">Firma y RUT cliente</div>
      <div class="sig">Firma técnico / Sello</div>
    </div>`
  }

  // ── Bloque de dos columnas: izq=Cliente+Servicio+Cobro, der=Equipo ──────────
  function dosColumnas(gap = '2mm', colLeft = '44%') {
    return `
    <div style="display:grid;grid-template-columns:${colLeft} 1fr;gap:${gap};margin-bottom:${gap}">
      <div style="display:flex;flex-direction:column;gap:${gap}">
        ${boxCliente()}${boxServicio()}${boxCobro()}
      </div>
      <div>${boxEquipo()}</div>
    </div>`
  }

  function firmaRow() {
    return `<div style="display:flex;gap:8mm;margin-top:2mm">
      <div style="text-align:center"><div style="height:10mm;border-bottom:1px solid #000;width:40mm"></div><div style="font-size:6.5pt;color:#6b7280;margin-top:1mm">Firma y RUT cliente</div></div>
      <div style="text-align:center"><div style="height:10mm;border-bottom:1px solid #000;width:40mm"></div><div style="font-size:6.5pt;color:#6b7280;margin-top:1mm">Firma técnico / Sello</div></div>
    </div>`
  }

  // ── Generar cuerpo HTML por formato ───────────────────────────────────────

  function generarCuerpo(): string {
    // ── A5 Horizontal ─────────────────────────────────────────────────────────
    if (formato === 'a5h') {
      const unaHoja = `
        ${cabeceraHtml()}
        <div class="title-line">COMPROBANTE DE RECEPCIÓN</div>
        ${dosColumnas('2mm', '44%')}
        <div style="display:flex;align-items:center;gap:3mm;margin-top:2mm">
          ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:18mm;height:18mm;display:block;flex-shrink:0">` : ''}
          <div style="font-size:7pt;color:#6b7280">
            <div>Escanea para ver el estado de tu reparación</div>
            <div style="font-family:monospace;font-size:6.5pt">${trackingUrl}</div>
          </div>
          <div style="flex:1"></div>
          ${firmaRow()}
        </div>`

      if (copias === 1) return unaHoja + tcHtml

      const copia2 = `
        <hr class="separator">
        ${cabeceraHtml()}
        ${dosColumnas('2mm', '44%')}
        ${firmaRow()}`
      return unaHoja + copia2 + tcHtml
    }

    // ── A5 Vertical ────────────────────────────────────────────────────────────
    if (formato === 'a5v') {
      const una = `
        ${cabeceraHtml()}
        <div class="title-line">COMPROBANTE DE RECEPCIÓN</div>
        ${dosColumnas('2mm', '44%')}
        ${trackHtml()}${firmasHtml()}`
      const copia2 = copias === 2 ? `<hr class="separator">${cabeceraHtml()}${dosColumnas('2mm', '44%')}${firmasHtml()}` : ''
      return una + copia2 + tcHtml
    }

    if (formato === 'a4') {
      return `
        ${cabeceraHtml()}
        <div class="title-line">COMPROBANTE DE RECEPCIÓN</div>
        ${dosColumnas('3mm', '44%')}
        ${trackHtml()}${firmasHtml()}
        <hr class="separator">
        ${cabeceraHtml()}
        ${dosColumnas('3mm', '44%')}
        ${firmasHtml()}
        ${tcHtml}`
    }

    // Ticket 80mm térmico
    const sT = (t: string) => `<div style="font-weight:bold;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:0.5mm 0;margin:2mm 0;font-size:7.5pt;text-transform:uppercase;text-align:center">${t}</div>`
    return `
      <div style="text-align:center;margin-bottom:2mm">${logoHtml}
        <div style="font-size:9pt;font-weight:bold">${config.nombre_local}</div>
        ${config.telefono ? `<div>${config.telefono}</div>` : ''}
      </div>
      <div style="text-align:center;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:1.5mm 0;margin:2mm 0">
        <div style="font-size:9pt;font-weight:bold;font-family:monospace">${ot.numero_ot}</div>
        <div>Fecha: ${fecha}</div>
      </div>
      ${sT('CLIENTE')}<div><strong>${cliente?.nombre ?? '—'}</strong><br>${cliente?.telefono ?? ''}${cliente?.rut ? `<br>RUT: ${cliente.rut}` : ''}</div>
      ${sT('EQUIPO')}<div><strong>${equipo?.marca ?? ''} ${equipo?.modelo ?? ''}</strong>${equipo?.imei ? `<br><span style="font-family:monospace;font-size:7pt">IMEI: ${equipo.imei}</span>` : ''}</div>
      ${sT('FALLA')}<div>${equipo?.falla_reportada ?? '—'}</div>
      ${ot.presupuesto_estimado ? `${sT('PRESUPUESTO')}<div style="font-size:9pt;font-weight:bold">${formatCLP(ot.presupuesto_estimado)}</div>` : ''}
      ${ot.precio_servicio ? `${sT('TOTAL')}<div style="font-size:10pt;font-weight:bold;color:#16a34a">${formatCLP(ot.precio_servicio)}</div>` : ''}
      <div style="border-top:1px dashed #000;margin:3mm 0;padding-top:1.5mm;font-size:7pt;text-align:center">Seguimiento: ${ot.codigo_seguimiento}</div>
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
  ${CSS_BASE}
  ${getPageCSS()}
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
