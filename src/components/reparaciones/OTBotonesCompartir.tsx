'use client'

import { useState } from 'react'
import { formatCLP } from '@/lib/calculations'

const TIPO_LABELS: Record<string, string> = {
  pantalla: 'Pantalla', bateria: 'Batería', placa: 'Placa madre',
  software: 'Software', camara: 'Cámara', conector: 'Conector', otro: 'Otro',
}

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
  customers?: {
    nombre: string; telefono: string; rut?: string | null; email?: string | null
  } | null
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

interface Props {
  ot: OTParaCompartir
  config: Config
  baseUrl: string
}

const TC_DEFAULT = `• El cliente declara que los datos proporcionados y el equipo entregado es de su propiedad y es totalmente responsable del mismo.
• Todo equipo marcado como RIESGOSO tiene la probabilidad de daño permanente, el cliente acepta el riesgo llegando a un acuerdo mutuo entre las partes.
• Todo equipo MOJADO se considerará tipo de reparación RIESGOSA. Todo equipo MOJADO después de la entrega pierde cualquier garantía.
• Equipos con PANTALLA APAGADA NO TIENEN GARANTÍA, EL CLIENTE ASUME Y AUTORIZA SU REPARACIÓN SIENDO CONSCIENTE DE ESTO.
• En caso de garantía, la empresa no se hace responsable por daños ocasionados por mal uso o imprudencia del cliente.
• Pantallas y Glases NO TIENEN GARANTÍA.
• Las pantallas solo tienen garantía de 30 días si deja de funcionar el táctil, sin daños por mal uso.
• La empresa tiene sesenta (60) días después de la fecha de entrega pautada en este documento.
• El cliente declara haber leído estas condiciones y aceptarlas al momento de FIRMAR.
• Documento válido SÓLO si tiene firma de un funcionario y sello de la empresa.`

export default function OTBotonesCompartir({ ot, config, baseUrl }: Props) {
  const [showSelector, setShowSelector] = useState(false)

  const trackingUrl = `${baseUrl}/seguimiento/${ot.codigo_seguimiento}`
  const cliente = ot.customers
  const equipo = ot.equipment
  const fecha = new Date(ot.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const tc = config.terminos_condiciones || TC_DEFAULT

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  function getWhatsAppUrl(destino: 'cliente' | 'empresa') {
    const phone = destino === 'cliente'
      ? (cliente?.telefono ?? '').replace(/\D/g, '')
      : (config.whatsapp ?? '').replace(/\D/g, '')

    const nombre = cliente?.nombre ?? 'Cliente'
    const equipo_txt = equipo ? `${equipo.marca} ${equipo.modelo}` : 'equipo'

    const mensaje = `Hola ${nombre}, te informamos sobre tu ${equipo_txt} en ${config.nombre_local}.

OT: *${ot.numero_ot}*
Seguimiento: ${trackingUrl}

Puedes ver el estado actualizado de tu reparación en el link. Ante cualquier consulta no dudes en contactarnos.`

    return `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`
  }

  // ── Email ──────────────────────────────────────────────────────────────────
  function getEmailUrl() {
    const subject = `Estado de tu reparación ${ot.numero_ot} - ${config.nombre_local}`
    const nombre = cliente?.nombre ?? 'Cliente'
    const equipo_txt = equipo ? `${equipo.marca} ${equipo.modelo}` : 'equipo'
    const body = `Hola ${nombre},

Te informamos sobre el estado de tu ${equipo_txt} en ${config.nombre_local}.

Número de OT: ${ot.numero_ot}
Estado actual: ${ot.estado.replace(/_/g, ' ')}
Código de seguimiento: ${ot.codigo_seguimiento}

Puedes hacer seguimiento en línea aquí:
${trackingUrl}

Ante cualquier consulta, contáctanos${config.telefono ? ` al ${config.telefono}` : ''}.

${config.nombre_local}`

    const email = cliente?.email ?? ''
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  // ── Imprimir comprobante de recepción ──────────────────────────────────────
  function handleImprimir() {
    const win = window.open('', '_blank', 'width=620,height=900')
    if (!win) { alert('Permite popups para imprimir'); return }

    const presupuesto = ot.presupuesto_estimado
      ? `<tr><td><strong>Presupuesto est.:</strong></td><td>${formatCLP(ot.presupuesto_estimado)}</td></tr>`
      : ''
    const precio = ot.precio_servicio
      ? `<tr><td><strong>Precio final:</strong></td><td><strong style="color:#16a34a">${formatCLP(ot.precio_servicio)}</strong></td></tr>`
      : ''
    const imeiRow = equipo?.imei
      ? `<tr><td><strong>IMEI:</strong></td><td style="font-family:monospace">${equipo.imei}</td></tr>` : ''
    const accRow = equipo?.accesorios?.length
      ? `<tr><td><strong>Accesorios:</strong></td><td>${equipo.accesorios.join(', ')}</td></tr>` : ''
    const condRow = equipo?.condicion_visual?.length
      ? `<tr><td><strong>Condición:</strong></td><td>${equipo.condicion_visual.join(', ')}</td></tr>` : ''
    const tecRow = ot.user_profiles
      ? `<tr><td><strong>Técnico:</strong></td><td>${ot.user_profiles.nombre_completo}</td></tr>` : ''
    const logoHtml = config.logo_url
      ? `<img src="${config.logo_url}" style="max-height:14mm;max-width:45mm;display:block;margin:0 auto 2mm" alt="Logo">`
      : ''
    const tipoRow = ot.tipo_reparacion
      ? `<tr><td><strong>Tipo:</strong></td><td>${TIPO_LABELS[ot.tipo_reparacion] ?? ot.tipo_reparacion}</td></tr>` : ''

    const tcLines = tc.split('\n').filter(Boolean).map(l => `<li style="margin-bottom:1.5px">${l.replace(/^•\s*/, '')}</li>`).join('')

    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Comprobante ${ot.numero_ot}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#000;background:#fff}
  @page{size:A5;margin:6mm}
  h1{font-size:10pt;text-align:center;text-transform:uppercase;letter-spacing:1px;margin:2mm 0}
  .header{text-align:center;border-bottom:2px solid #000;padding-bottom:3mm;margin-bottom:3mm}
  .empresa{font-size:11pt;font-weight:bold}
  .section-title{font-weight:bold;border-bottom:1px solid #777;margin:2mm 0 1mm;padding-bottom:0.5mm;font-size:7.5pt;text-transform:uppercase;letter-spacing:0.5px}
  table{width:100%;border-collapse:collapse;font-size:8pt}
  td{padding:1px 2px;vertical-align:top}
  td:first-child{width:38%;color:#333}
  .ot-num{font-family:monospace;font-size:9pt;font-weight:bold;color:#1a4e9f}
  .falla-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:3px;padding:2mm;margin:1mm 0;font-size:8pt}
  .firmas{display:flex;gap:8mm;margin-top:6mm}
  .firma-box{flex:1}
  .firma-space{height:12mm;border-bottom:1px solid #000}
  .firma-label{text-align:center;font-size:7pt;padding-top:1mm}
  .tc-title{font-size:8pt;font-weight:bold;text-align:center;margin:3mm 0 2mm;text-transform:uppercase;letter-spacing:0.5px;background:#374151;color:#fff;padding:1.5mm}
  .tc-box{font-size:6.5pt;column-count:2;column-gap:4mm;line-height:1.4}
  .tc-box li{margin-bottom:1.5px;list-style-type:disc;margin-left:8px}
  .tracking-box{font-size:7pt;border:1px dashed #aaa;padding:2mm;text-align:center;margin-top:2mm;border-radius:3px}
  .separator{border:none;border-top:3px dashed #aaa;margin:8mm 0}
</style>
</head>
<body>
<!-- COPIA 1 -->
${logoHtml}
<div class="header">
  <div class="empresa">${config.nombre_local}</div>
  ${config.rut_local ? `<div>RUT: ${config.rut_local}</div>` : ''}
  ${config.direccion ? `<div>${config.direccion}</div>` : ''}
  ${config.telefono ? `<div>Tel: ${config.telefono}</div>` : ''}
</div>
<h1>Comprobante de Recepción de Equipo</h1>
<div style="display:flex;justify-content:space-between;margin-bottom:2mm">
  <div><span class="ot-num">${ot.numero_ot}</span></div>
  <div style="text-align:right;font-size:7.5pt">Fecha: ${fecha}<br>Garantía: ${ot.dias_garantia ?? 30} días</div>
</div>

<div class="section-title">Cliente</div>
<table><tbody>
  <tr><td><strong>Nombre:</strong></td><td>${cliente?.nombre ?? '—'}</td></tr>
  <tr><td><strong>Teléfono:</strong></td><td>${cliente?.telefono ?? '—'}</td></tr>
  ${cliente?.rut ? `<tr><td><strong>RUT:</strong></td><td>${cliente.rut}</td></tr>` : ''}
  ${cliente?.email ? `<tr><td><strong>Email:</strong></td><td>${cliente.email}</td></tr>` : ''}
</tbody></table>

<div class="section-title">Equipo</div>
<table><tbody>
  <tr><td><strong>Equipo:</strong></td><td><strong>${equipo?.marca ?? ''} ${equipo?.modelo ?? ''}</strong></td></tr>
  ${equipo?.color || equipo?.capacidad ? `<tr><td><strong>Características:</strong></td><td>${[equipo?.color, equipo?.capacidad].filter(Boolean).join(' · ')}</td></tr>` : ''}
  ${imeiRow}${accRow}${condRow}
</tbody></table>

<div class="section-title">Servicio</div>
<table><tbody>
  ${tipoRow}${tecRow}${presupuesto}${precio}
</tbody></table>
<div class="falla-box"><strong>Falla reportada:</strong> ${equipo?.falla_reportada ?? '—'}</div>

<div class="tracking-box">
  Seguimiento en línea: <strong>${trackingUrl}</strong>
</div>

<div class="firmas">
  <div class="firma-box"><div class="firma-space"></div><div class="firma-label">Firma y RUT cliente</div></div>
  <div class="firma-box"><div class="firma-space"></div><div class="firma-label">Firma técnico / Sello empresa</div></div>
</div>

<p style="text-align:center;font-size:7pt;margin-top:3mm;color:#666">★ CONDICIONES Y CLÁUSULAS AL DORSO ★</p>

<hr class="separator">

<!-- COPIA 2 - igual -->
${logoHtml}
<div class="header">
  <div class="empresa">${config.nombre_local}</div>
  ${config.rut_local ? `<div>RUT: ${config.rut_local}</div>` : ''}
  ${config.direccion ? `<div>${config.direccion}</div>` : ''}
</div>
<h1>Comprobante de Recepción de Equipo</h1>
<div style="display:flex;justify-content:space-between;margin-bottom:2mm">
  <span class="ot-num">${ot.numero_ot}</span>
  <span style="font-size:7.5pt">Fecha: ${fecha}</span>
</div>
<table><tbody>
  <tr><td><strong>Cliente:</strong></td><td>${cliente?.nombre ?? '—'} — ${cliente?.telefono ?? ''}</td></tr>
  <tr><td><strong>Equipo:</strong></td><td>${equipo?.marca ?? ''} ${equipo?.modelo ?? ''}</td></tr>
  ${equipo?.imei ? `<tr><td><strong>IMEI:</strong></td><td style="font-family:monospace">${equipo.imei}</td></tr>` : ''}
  ${presupuesto}${precio}
</tbody></table>
<div class="falla-box" style="margin-top:2mm"><strong>Falla:</strong> ${equipo?.falla_reportada ?? '—'}</div>
<div class="firmas" style="margin-top:4mm">
  <div class="firma-box"><div class="firma-space"></div><div class="firma-label">Firma cliente</div></div>
  <div class="firma-box"><div class="firma-space"></div><div class="firma-label">Sello empresa</div></div>
</div>

<!-- TÉRMINOS Y CONDICIONES (dorso) — en hoja separada -->
<div style="page-break-before:always">
  <div class="tc-title">Cláusulas y Condiciones para la Recepción de Equipos</div>
  <ul class="tc-box">${tcLines}</ul>
  <p style="text-align:center;font-size:7pt;margin-top:4mm;color:#555">
    ${config.nombre_local}${config.rut_local ? ` · RUT ${config.rut_local}` : ''}${config.telefono ? ` · ${config.telefono}` : ''}
  </p>
</div>
</body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 300)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Imprimir */}
      <button
        onClick={handleImprimir}
        className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-900 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
      >
        🖨️ Imprimir comprobante
      </button>

      {/* WhatsApp */}
      <div className="relative">
        <button
          onClick={() => setShowSelector(s => !s)}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          📲 Enviar seguimiento
        </button>
        {showSelector && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 w-64 p-2 space-y-1">
            <p className="text-xs text-gray-500 px-2 py-1 font-medium uppercase tracking-wide">Enviar por:</p>

            {/* WhatsApp al cliente */}
            {cliente?.telefono && (
              <a
                href={getWhatsAppUrl('cliente')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowSelector(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-green-50 text-sm font-medium text-gray-700"
              >
                <span className="text-lg">📱</span>
                <div>
                  <p className="text-sm font-medium">WhatsApp al cliente</p>
                  <p className="text-xs text-gray-400">{cliente.telefono}</p>
                </div>
              </a>
            )}

            {/* WhatsApp empresa/empresa */}
            {config.whatsapp && (
              <a
                href={getWhatsAppUrl('empresa')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowSelector(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-green-50 text-sm font-medium text-gray-700"
              >
                <span className="text-lg">🏪</span>
                <div>
                  <p className="text-sm font-medium">WhatsApp empresa</p>
                  <p className="text-xs text-gray-400">{config.whatsapp}</p>
                </div>
              </a>
            )}

            {/* Email */}
            {cliente?.email && (
              <a
                href={getEmailUrl()}
                onClick={() => setShowSelector(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-sm font-medium text-gray-700"
              >
                <span className="text-lg">📧</span>
                <div>
                  <p className="text-sm font-medium">Correo electrónico</p>
                  <p className="text-xs text-gray-400">{cliente.email}</p>
                </div>
              </a>
            )}

            {/* Copiar link */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(trackingUrl)
                  .then(() => alert('Link copiado al portapapeles'))
                  .catch(() => alert(trackingUrl))
                setShowSelector(false)
              }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 w-full text-left"
            >
              <span className="text-lg">🔗</span>
              <div>
                <p className="text-sm font-medium">Copiar link de seguimiento</p>
                <p className="text-xs text-gray-400 truncate max-w-40">{trackingUrl}</p>
              </div>
            </button>

            <div className="px-2 pt-1 pb-0.5 border-t">
              <p className="text-xs text-gray-400 text-center">El cliente podrá ver el estado en tiempo real</p>
            </div>
          </div>
        )}
      </div>

      {/* Cerrar selector al hacer click afuera */}
      {showSelector && (
        <div className="fixed inset-0 z-10" onClick={() => setShowSelector(false)} />
      )}
    </div>
  )
}
