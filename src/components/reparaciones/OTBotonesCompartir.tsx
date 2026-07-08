'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { formatCLP } from '@/lib/calculations'
import { createClient } from '@/lib/supabase/client'
import { labelTipoEquipo } from '@/lib/tipoEquipo'

const TIPO_LABELS: Record<string, string> = {
  pantalla: 'Pantalla', bateria: 'Batería', placa: 'Placa madre',
  software: 'Software', camara: 'Cámara', conector: 'Conector', otro: 'Otro',
}

type PrintFormat = 'a5h' | 'a5v' | 'a4' | 'ticket'

interface OTParaCompartir {
  id: string
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
    tipo_equipo?: string | null; marca: string; modelo: string; color?: string | null; capacidad?: string | null
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
  ticket: { label: 'Ticket térmico', desc: '57 / 80 mm × continuo', icon: '🧾' },
}

export default function OTBotonesCompartir({ ot, config, baseUrl, mostrarTecnico = true }: Props) {
  const supabase = createClient()
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [formato, setFormato] = useState<PrintFormat>('a5h')
  const [incluirTC, setIncluirTC] = useState(true)
  const [copias, setCopias] = useState<1 | 2>(2)
  const [anchoTicket, setAnchoTicket] = useState<57 | 80>(80)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [qrOtDataUrl, setQrOtDataUrl] = useState<string>('')
  const detallesRef = useRef<{ servicios: string[]; repuestos: string[] }>({ servicios: [], repuestos: [] })

  // Carga servicios y repuestos para el ticket
  useEffect(() => {
    async function cargarDetalles() {
      const [{ data: items }, { data: roServices }] = await Promise.all([
        supabase.from('repair_items').select('nombre, cantidad').eq('repair_order_id', ot.id),
        supabase.from('repair_order_services').select('service_id').eq('repair_order_id', ot.id),
      ])
      const repuestos = (items ?? []).map(i => i.cantidad > 1 ? `${i.nombre} ×${i.cantidad}` : i.nombre)
      let servicios: string[] = []
      if (roServices?.length) {
        const ids = roServices.map(r => r.service_id)
        const { data: srvs } = await supabase.from('repair_services').select('nombre').in('id', ids)
        servicios = (srvs ?? []).map(s => s.nombre)
      }
      detallesRef.current = { servicios, repuestos }
    }
    cargarDetalles()
  }, [ot.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const trackingUrl = `${baseUrl}/seguimiento/${ot.codigo_seguimiento}`
  const otInternaUrl = `${baseUrl}/reparaciones/${ot.id}`

  useEffect(() => {
    QRCode.toDataURL(trackingUrl, { width: 160, margin: 1, color: { dark: '#1e3a5f', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => {})
  }, [trackingUrl])

  useEffect(() => {
    QRCode.toDataURL(otInternaUrl, { width: 160, margin: 1, color: { dark: '#1e3a5f', light: '#ffffff' } })
      .then(setQrOtDataUrl)
      .catch(() => {})
  }, [otInternaUrl])
  const cliente = ot.customers
  const equipo = ot.equipment
  const telLlamar = cliente?.telefono ? cliente.telefono.replace(/[^\d+]/g, '') : ''
  const fechaHoraRecibido = new Date(ot.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const fechaEntregaStr = ot.fecha_estimada_entrega
    ? new Date(ot.fecha_estimada_entrega + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null
  const tc = config.terminos_condiciones || TC_DEFAULT

  // ── Generadores de HTML ────────────────────────────────────────────────────

  const logoHtml = config.logo_url
    ? `<img src="${config.logo_url}" style="max-height:11mm;max-width:42mm;display:block;object-fit:contain" alt="Logo">`
    : `<span style="font-size:18pt">🔧</span>`

  // A4/Carta: T&C en la misma página, fluye bajo el contenido OT
  const tcSamePageHtml = incluirTC ? `
    <div style="margin-top:4mm;border-top:1.5px solid #374151;padding-top:2.5mm">
      <div style="background:#374151;color:#fff;text-align:center;padding:1.5mm 3mm;font-size:6.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2mm">
        Cláusulas y Condiciones de Servicio
      </div>
      <ol style="font-size:6pt;column-count:2;column-gap:5mm;line-height:1.4;padding-left:5mm;margin:0">
        ${tc.split('\n').filter(Boolean).map(l => `<li style="margin-bottom:1.5mm;break-inside:avoid">${l.replace(/^•\s*/, '')}</li>`).join('')}
      </ol>
    </div>` : ''

  // A5: T&C en página trasera (salto de página), sin líneas de firma
  function tcBackPageHtml(cols: number): string {
    if (!incluirTC) return ''
    return `
    <div style="page-break-before:always">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1e3a5f;padding-bottom:2.5mm;margin-bottom:4mm">
        <div style="font-size:9pt;font-weight:bold;color:#1e3a5f">${config.nombre_local}</div>
        <div style="font-size:7.5pt;font-family:monospace;color:#374151">${ot.numero_ot}</div>
      </div>
      <div style="text-align:center;font-size:10pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:4mm;color:#1e3a5f">
        Cláusulas y Condiciones de Servicio
      </div>
      <ol style="font-size:8.5pt;column-count:${cols};column-gap:6mm;line-height:1.6;padding-left:5mm;margin:0">
        ${tc.split('\n').filter(Boolean).map(l => `<li style="margin-bottom:2.5mm;break-inside:avoid">${l.replace(/^•\s*/, '')}</li>`).join('')}
      </ol>
    </div>`
  }

  const tcTicketHtml = incluirTC ? `
    <div style="border-top:1.5px dashed #000;margin-top:4mm;padding-top:3mm">
      <div style="font-weight:bold;text-align:center;font-size:8.5pt;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2mm">TÉRMINOS Y CONDICIONES</div>
      <ol style="font-size:7pt;line-height:1.45;padding-left:5mm;margin:0">
        ${tc.split('\n').filter(Boolean).map(l => `<li style="margin-bottom:1.5mm">${l.replace(/^•\s*/, '')}</li>`).join('')}
      </ol>
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
    .title-line{text-align:center;font-size:9pt;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:1mm 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin:1.5mm 0}
    .cobro-tbl td:last-child{text-align:right;font-weight:600}
    .cobro-total{border-top:2px solid #111;font-size:9pt;font-weight:bold}
    .separator{border:none;height:0;margin:0;page-break-before:always;break-before:page}`

  // ── Cabecera profesional (igual en todos los formatos) ─────────────────────
  function cabeceraHtml() {
    return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1mm">
      <div style="display:flex;align-items:center;gap:2mm">
        ${logoHtml}
        <div>
          <div style="font-size:10pt;font-weight:bold;line-height:1.1">${config.nombre_local}</div>
          ${config.rut_local ? `<div style="font-size:7pt">RUT: ${config.rut_local}</div>` : ''}
          ${config.direccion ? `<div style="font-size:7pt">${config.direccion}</div>` : ''}
          ${config.telefono ? `<div style="font-size:7pt">Tel: ${config.telefono}</div>` : ''}
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
    // Deduplicar condicion_visual ignorando mayúsculas/minúsculas (mantiene última versión = la capitalizada)
    const condDedup = equipo?.condicion_visual?.length
      ? [...new Map(equipo.condicion_visual.map(c => [c.toLowerCase(), c])).values()]
      : []
    return `<div class="box" style="height:100%">
      <div class="box-hdr"><span>&#128241;</span> DETALLES DEL EQUIPO</div>
      <div class="box-body" style="word-break:break-word">
        <div><strong>${[labelTipoEquipo(equipo?.tipo_equipo), equipo?.marca, equipo?.modelo].filter(Boolean).join(' ')}</strong></div>
        ${(equipo?.color || equipo?.capacidad) ? `<div>${[equipo?.color, equipo?.capacidad].filter(Boolean).join(' · ')}</div>` : ''}
        ${equipo?.imei ? `<div style="font-family:monospace;font-size:7pt;word-break:break-all">IMEI 1: ${equipo.imei}</div>` : ''}
        ${equipo?.imei2 ? `<div style="font-family:monospace;font-size:7pt;word-break:break-all">IMEI 2: ${equipo.imei2}</div>` : ''}
        ${equipo?.numero_serie ? `<div style="font-family:monospace;font-size:7pt">S/N: ${equipo.numero_serie}</div>` : ''}
        ${accs ? `<div style="font-size:7.5pt;line-height:1.6">Acc: ${accs}</div>` : ''}
        ${condDedup.length ? `<div style="font-size:7.5pt;line-height:1.6">Cond: ${condDedup.join(' · ')}</div>` : ''}
      </div>
    </div>`
  }

  function boxServicio() {
    const { servicios, repuestos: reps } = detallesRef.current
    const serviciosHtml = servicios.length
      ? `<div style="margin-top:1mm"><strong>Servicios:</strong><ul style="margin:0 0 0 3mm;padding:0;list-style:disc;font-size:7pt">${servicios.map(s => `<li style="margin-bottom:0">${s}</li>`).join('')}</ul></div>` : ''
    const repuestosHtml = reps.length
      ? `<div style="margin-top:1mm"><strong>Repuestos:</strong><ul style="margin:0 0 0 3mm;padding:0;list-style:disc;font-size:7pt">${reps.map(r => `<li style="margin-bottom:0">${r}</li>`).join('')}</ul></div>` : ''
    return `<div class="box">
      <div class="box-hdr"><span>&#128295;</span> INFORMACIÓN DEL SERVICIO</div>
      <div class="box-body" style="font-size:7.5pt;padding:1.5mm 2.5mm;line-height:1.4">
        ${ot.tipo_reparacion ? `<div><strong>Tipo:</strong> ${TIPO_LABELS[ot.tipo_reparacion] ?? ot.tipo_reparacion}</div>` : ''}
        ${mostrarTecnico && ot.user_profiles ? `<div><strong>Técnico:</strong> ${ot.user_profiles.nombre_completo}</div>` : ''}
        <div><strong>Falla:</strong> ${equipo?.falla_reportada ?? '—'}</div>
        ${equipo?.observaciones ? `<div><strong>Obs:</strong> ${equipo.observaciones}</div>` : ''}
        ${serviciosHtml}
        ${repuestosHtml}
        ${ot.diagnostico_tecnico ? `<div style="margin-top:1mm"><strong>Diagnóstico:</strong> ${ot.diagnostico_tecnico}</div>` : ''}
      </div>
    </div>`
  }

  function boxCobro() {
    const monto = ot.precio_servicio ?? ot.presupuesto_estimado
    const esPresupuesto = !ot.precio_servicio && !!ot.presupuesto_estimado
    return `<div class="box">
      <div class="box-hdr"><span>&#36;</span> DETALLES DE COBRO</div>
      <div class="box-body" style="padding:1.5mm 2.5mm">
        ${monto
          ? `<div style="display:flex;justify-content:space-between;align-items:center;border-top:1.5px solid #111;padding-top:1.5mm">
               <span style="font-size:7.5pt;font-weight:bold;text-transform:uppercase">${esPresupuesto ? 'Presupuesto est.' : 'Total a cobrar'}</span>
               <span style="font-size:12pt;font-weight:bold;color:#16a34a">${formatCLP(monto)}</span>
             </div>`
          : `<div style="color:#9ca3af;font-size:7pt;text-align:center;padding:1.5mm 0">Sin precio asignado</div>`
        }
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

  function trackHtmlOT() {
    const qrImg = qrOtDataUrl
      ? `<img src="${qrOtDataUrl}" style="width:22mm;height:22mm;display:block;flex-shrink:0" alt="QR acceso a la OT">`
      : `<div style="width:22mm;height:22mm;flex-shrink:0;border:1px dashed #9ca3af;display:flex;align-items:center;justify-content:center;font-size:7pt;color:#9ca3af">QR</div>`
    return `<div class="track">
      ${qrImg}
      <div>
        <div style="font-size:7pt;color:#6b7280;margin-bottom:1mm">Escanear para abrir la OT en el sistema</div>
        <div style="font-size:7pt;color:#9ca3af">Uso interno · técnicos</div>
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
        ${dosColumnas('1.5mm', '44%')}
        <div style="display:flex;align-items:center;gap:2mm;margin-top:1.5mm">
          ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:14mm;height:14mm;display:block;flex-shrink:0">` : ''}
          <div style="font-size:6pt;color:#6b7280">
            <div>Escanea para ver el estado de tu reparación</div>
            <div style="font-family:monospace;font-size:5.5pt">${trackingUrl}</div>
          </div>
          <div style="flex:1"></div>
          ${firmaRow()}
        </div>`

      if (copias === 1) return unaHoja + tcBackPageHtml(2)

      const copia2 = `
        <hr class="separator">
        ${cabeceraHtml()}
        ${dosColumnas('1.5mm', '44%')}
        <div style="display:flex;align-items:center;gap:2mm;margin-top:1.5mm">
          ${qrOtDataUrl ? `<img src="${qrOtDataUrl}" style="width:14mm;height:14mm;display:block;flex-shrink:0">` : ''}
          <div style="font-size:6pt;color:#6b7280">
            <div>Escanear para abrir la OT en el sistema</div>
            <div style="color:#9ca3af">Uso interno · técnicos</div>
          </div>
          <div style="flex:1"></div>
          ${firmaRow()}
        </div>`
      return unaHoja + copia2 + tcBackPageHtml(2)
    }

    // ── A5 Vertical ────────────────────────────────────────────────────────────
    if (formato === 'a5v') {
      const una = `
        ${cabeceraHtml()}
        <div class="title-line">COMPROBANTE DE RECEPCIÓN</div>
        ${dosColumnas('2mm', '44%')}
        ${trackHtml()}${firmasHtml()}`
      const copia2 = copias === 2 ? `<hr class="separator">${cabeceraHtml()}${dosColumnas('2mm', '44%')}${trackHtmlOT()}${firmasHtml()}` : ''
      return una + copia2 + tcBackPageHtml(1)
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
        ${trackHtmlOT()}
        ${firmasHtml()}
        ${tcSamePageHtml}`
    }

    // ── Ticket 80mm — datos completos ──────────────────────────────────────
    const sT = (t: string) => `<div style="font-weight:bold;border-top:1.5px dashed #000;border-bottom:1.5px dashed #000;padding:1mm 0;margin:2.5mm 0;font-size:8pt;text-transform:uppercase;text-align:center;letter-spacing:0.5px">${t}</div>`

    // Deduplicar condición visual
    const condDedup80 = equipo?.condicion_visual?.length
      ? [...new Map(equipo.condicion_visual.map(c => [c.toLowerCase(), c])).values()]
      : []
    const accs80 = equipo?.accesorios?.length
      ? equipo.accesorios.join(' ✓ · ') + ' ✓'
      : null

    const qrImg80 = qrDataUrl
      ? `<img src="${qrDataUrl}" style="width:28mm;height:28mm;display:block;margin:0 auto 1.5mm">`
      : ''

    return `
      <!-- Empresa -->
      <div style="text-align:center;margin-bottom:3mm;padding-bottom:2.5mm;border-bottom:2px dashed #000">
        ${config.logo_url ? `<img src="${config.logo_url}" style="max-height:18mm;max-width:55mm;display:block;margin:0 auto 2mm;object-fit:contain">` : ''}
        <div style="font-size:11pt;font-weight:bold;line-height:1.2">${config.nombre_local}</div>
        ${config.rut_local  ? `<div style="font-size:8.5pt">RUT: ${config.rut_local}</div>`       : ''}
        ${config.direccion  ? `<div style="font-size:8.5pt">${config.direccion}</div>`             : ''}
        ${config.telefono   ? `<div style="font-size:8.5pt">Tel: ${config.telefono}</div>`         : ''}
        ${config.email      ? `<div style="font-size:8pt">${config.email}</div>`                   : ''}
      </div>

      <!-- OT info -->
      <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:2mm;margin-bottom:2mm">
        <div style="font-size:8pt;letter-spacing:1px;text-transform:uppercase">COMPROBANTE DE RECEPCIÓN</div>
        <div style="font-size:13pt;font-weight:bold;font-family:monospace;margin:1mm 0">${ot.numero_ot}</div>
        <div style="font-size:8.5pt">Recibido: ${fechaHoraRecibido}</div>
        ${fechaEntregaStr ? `<div style="font-size:8.5pt">Entrega est.: ${fechaEntregaStr}</div>` : ''}
      </div>

      <!-- Cliente -->
      ${sT('CLIENTE')}
      <div style="font-size:9pt;line-height:1.5">
        <div><strong>${cliente?.nombre ?? '—'}</strong></div>
        <div>${cliente?.telefono ?? ''}</div>
        ${cliente?.rut   ? `<div>RUT: ${cliente.rut}</div>`   : ''}
        ${cliente?.email ? `<div>${cliente.email}</div>`       : ''}
      </div>

      <!-- Equipo -->
      ${sT('EQUIPO')}
      <div style="font-size:8.5pt;line-height:1.5">
        <div><strong>${[labelTipoEquipo(equipo?.tipo_equipo), equipo?.marca, equipo?.modelo].filter(Boolean).join(' ')}</strong></div>
        ${(equipo?.color || equipo?.capacidad) ? `<div>${[equipo?.color, equipo?.capacidad].filter(Boolean).join(' · ')}</div>` : ''}
        ${equipo?.imei  ? `<div style="font-family:monospace;font-size:8pt">IMEI 1: ${equipo.imei}</div>`  : ''}
        ${equipo?.imei2 ? `<div style="font-family:monospace;font-size:8pt">IMEI 2: ${equipo.imei2}</div>` : ''}
        ${equipo?.numero_serie ? `<div style="font-family:monospace;font-size:8pt">S/N: ${equipo.numero_serie}</div>` : ''}
        ${accs80  ? `<div style="font-size:8pt;margin-top:0.5mm">Acc: ${accs80}</div>`                            : ''}
        ${condDedup80.length ? `<div style="font-size:8pt">Cond: ${condDedup80.join(' · ')}</div>`                : ''}
      </div>

      <!-- Servicio -->
      ${sT('SERVICIO')}
      <div style="font-size:8.5pt;line-height:1.5">
        ${ot.tipo_reparacion ? `<div>Tipo: <strong>${TIPO_LABELS[ot.tipo_reparacion] ?? ot.tipo_reparacion}</strong></div>` : ''}
        ${mostrarTecnico && ot.user_profiles ? `<div>Técnico: ${ot.user_profiles.nombre_completo}</div>` : ''}
        <div><strong>Falla:</strong> ${equipo?.falla_reportada ?? '—'}</div>
        ${equipo?.observaciones ? `<div style="font-size:8pt"><strong>Obs:</strong> ${equipo.observaciones}</div>` : ''}
        ${detallesRef.current.servicios.length ? `<div style="margin-top:1mm"><strong>Servicios:</strong> ${detallesRef.current.servicios.join(', ')}</div>` : ''}
        ${detallesRef.current.repuestos.length ? `<div><strong>Repuestos:</strong> ${detallesRef.current.repuestos.join(', ')}</div>` : ''}
        ${ot.diagnostico_tecnico ? `<div style="font-size:8pt"><strong>Diagnóstico:</strong> ${ot.diagnostico_tecnico}</div>` : ''}
      </div>

      <!-- Cobro -->
      ${(ot.precio_servicio || ot.presupuesto_estimado) ? `
        ${sT('COBRO')}
        <div style="display:flex;justify-content:space-between;align-items:center;border-top:2px solid #000;padding-top:1.5mm;margin-top:0.5mm">
          <span style="font-size:9pt;font-weight:bold">${ot.precio_servicio ? 'TOTAL A COBRAR' : 'PRESUPUESTO EST.'}</span>
          <span style="font-size:13pt;font-weight:bold">${formatCLP(ot.precio_servicio ?? ot.presupuesto_estimado ?? 0)}</span>
        </div>` : ''}

      <!-- QR + Seguimiento -->
      <div style="text-align:center;margin:3mm 0;border-top:1px dashed #000;padding-top:2.5mm">
        ${qrImg80}
        <div style="font-size:8pt;margin-bottom:0.5mm">Escanea para ver el estado de tu reparación</div>
        <div style="font-size:7.5pt;font-family:monospace;word-break:break-all;color:#1e3a5f">${trackingUrl}</div>
      </div>

      <!-- Firma técnico -->
      <div style="margin-top:3mm">
        <div style="height:14mm;border-bottom:1.5px solid #000;margin-bottom:1.5mm"></div>
        <div style="text-align:center;font-size:8pt;color:#555">Firma técnico / Sello empresa</div>
      </div>
      ${tcTicketHtml}
      <!-- Firma cliente -->
      <div style="margin-top:4mm">
        <div style="height:14mm;border-bottom:1.5px solid #000;margin-bottom:1.5mm"></div>
        <div style="text-align:center;font-size:8pt;color:#555">${incluirTC ? 'Firma y RUT cliente — acepta los T&amp;C' : 'Firma y RUT cliente'}</div>
      </div>
      <div style="height:14mm"></div>`
  }

  // ── CSS por formato ────────────────────────────────────────────────────────

  function getPageCSS(): string {
    if (formato === 'a5h') return `
      @page { size: A5 landscape; margin: 4mm; }
      @media print { body { zoom: 0.92; } }`
    if (formato === 'a5v') return `@page { size: A5 portrait; margin: 6mm; }`
    if (formato === 'a4')  return `@page { size: A4; margin: 10mm; }`
    return `@page { size: ${anchoTicket}mm auto; margin: 3mm; }` // ticket
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

  function handleImprimirSoloTC() {
    const win = window.open('', '_blank', 'width=700,height=900')
    if (!win) { alert('Permite popups para imprimir'); return }

    const clausulas = tc.split('\n').filter(Boolean)
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>T&C ${ot.numero_ot}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#111;background:#fff;padding:10mm}
  @page{size:A5 landscape;margin:10mm}
</style>
</head>
<body>
  <!-- Cabecera -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e3a5f;padding-bottom:3mm;margin-bottom:4mm">
    <div style="display:flex;align-items:center;gap:3mm">
      ${config.logo_url ? `<img src="${config.logo_url}" style="max-height:12mm;max-width:40mm;object-fit:contain" alt="Logo">` : '<span style="font-size:18pt">🔧</span>'}
      <div>
        <div style="font-size:11pt;font-weight:bold">${config.nombre_local}</div>
        ${config.rut_local  ? `<div style="font-size:7.5pt">RUT: ${config.rut_local}</div>`  : ''}
        ${config.direccion  ? `<div style="font-size:7.5pt">${config.direccion}</div>`        : ''}
        ${config.telefono   ? `<div style="font-size:7.5pt">Tel: ${config.telefono}</div>`    : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:7pt;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Orden de Trabajo</div>
      <div style="font-size:14pt;font-weight:bold;font-family:monospace;color:#1e3a5f">${ot.numero_ot}</div>
      <div style="font-size:7.5pt;color:#374151">${cliente?.nombre ?? ''}</div>
    </div>
  </div>

  <!-- Título -->
  <div style="text-align:center;font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4mm;color:#1e3a5f">
    Cláusulas y Condiciones de Servicio
  </div>

  <!-- Cláusulas en 2 columnas -->
  <ol style="font-size:8.5pt;line-height:1.6;padding-left:5mm;column-count:2;column-gap:8mm">
    ${clausulas.map(l => `<li style="margin-bottom:2mm;break-inside:avoid">${l.replace(/^•\s*/, '')}</li>`).join('')}
  </ol>

  <!-- Firma -->
  <div style="margin-top:6mm;display:flex;gap:16mm;border-top:1px solid #e5e7eb;padding-top:4mm">
    <div style="flex:1;text-align:center">
      <div style="height:14mm;border-bottom:1.5px solid #111;margin-bottom:2mm"></div>
      <div style="font-size:7.5pt;color:#555">Firma y RUT cliente — Acepta las condiciones</div>
    </div>
    <div style="flex:1;text-align:center">
      <div style="height:14mm;border-bottom:1.5px solid #111;margin-bottom:2mm"></div>
      <div style="font-size:7.5pt;color:#555">Firma técnico / Sello empresa</div>
    </div>
  </div>
</body>
</html>`

    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
    setShowPrintModal(false)
  }

  // ── WhatsApp / Email ───────────────────────────────────────────────────────
  function getWhatsAppUrl(destino: 'cliente' | 'empresa') {
    const phone = (destino === 'cliente' ? (cliente?.telefono ?? '') : (config.whatsapp ?? '')).replace(/\D/g, '')

    // Bloque de datos de la empresa
    const firma: string[] = []
    if (config.nombre_local) firma.push(`*${config.nombre_local}*`)
    if (config.rut_local)    firma.push(`RUT: ${config.rut_local}`)
    if (config.direccion)    firma.push(config.direccion)
    if (config.telefono)     firma.push(`Tel: ${config.telefono}`)
    if (config.email)        firma.push(config.email)

    const estadoLabel: Record<string, string> = {
      recibido: 'Recibido', en_diagnostico: 'En diagnóstico',
      presupuestado: 'Presupuestando', aprobado: 'Aceptado', rechazado: 'Rechazado',
      esperando_repuesto: 'Esperando repuesto', en_reparacion: 'En reparación',
      listo: 'Listo para retirar', para_entrega: 'Para entrega',
      entregado: 'Entregado', en_garantia: 'En garantía', cancelado: 'Cancelado',
    }

    const msg = [
      `Hola ${cliente?.nombre ?? 'cliente'}, te informamos sobre el estado de tu *${[labelTipoEquipo(equipo?.tipo_equipo), equipo?.marca, equipo?.modelo].filter(Boolean).join(' ')}*.`,
      '',
      firma.join('\n'),
      '',
      `OT: *${ot.numero_ot}*`,
      `Estado: *${estadoLabel[ot.estado] ?? ot.estado.replace(/_/g, ' ')}*`,
      '',
      `Seguimiento en línea:\n${trackingUrl}`,
    ].join('\n')

    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  function getEmailUrl() {
    const firma: string[] = []
    if (config.nombre_local) firma.push(config.nombre_local)
    if (config.rut_local)    firma.push(`RUT: ${config.rut_local}`)
    if (config.direccion)    firma.push(config.direccion)
    if (config.telefono)     firma.push(`Tel: ${config.telefono}`)
    if (config.email)        firma.push(config.email)

    const subject = `Estado de tu reparación ${ot.numero_ot}`
    const body = [
      `Hola ${cliente?.nombre ?? 'cliente'},`,
      '',
      `Te informamos sobre el estado de tu ${[labelTipoEquipo(equipo?.tipo_equipo), equipo?.marca, equipo?.modelo].filter(Boolean).join(' ')}.`,
      '',
      `OT: ${ot.numero_ot}`,
      `Estado: ${ot.estado.replace(/_/g, ' ')}`,
      '',
      `Seguimiento en línea:\n${trackingUrl}`,
      '',
      firma.join('\n'),
    ].join('\n')

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
        <button
          onClick={() => setShowShareMenu(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          📲 Enviar seguimiento
        </button>

        {/* Llamar — solo en móvil, abre el marcador directo */}
        {telLlamar && (
          <a
            href={`tel:${telLlamar}`}
            className="sm:hidden flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            📞 Llamar
          </a>
        )}

        {/* Modal bottom-sheet — visible en cualquier tamaño de pantalla */}
        {showShareMenu && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
            onClick={() => setShowShareMenu(false)}
          >
            <div
              className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <p className="font-semibold text-gray-800">Enviar seguimiento</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{ot.numero_ot}</p>
                </div>
                <button onClick={() => setShowShareMenu(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
              </div>

              {/* Opciones */}
              <div className="p-3 space-y-1">
                {cliente?.telefono && (
                  <a href={getWhatsAppUrl('cliente')} target="_blank" rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-green-50 text-gray-700 transition-colors">
                    <span className="text-2xl">📱</span>
                    <div>
                      <p className="text-sm font-semibold">WhatsApp al cliente</p>
                      <p className="text-xs text-gray-400">{cliente.telefono}</p>
                    </div>
                  </a>
                )}
                {config.whatsapp && (
                  <a href={getWhatsAppUrl('empresa')} target="_blank" rel="noopener noreferrer"
                    onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-green-50 text-gray-700 transition-colors">
                    <span className="text-2xl">🏪</span>
                    <div>
                      <p className="text-sm font-semibold">WhatsApp empresa</p>
                      <p className="text-xs text-gray-400">{config.whatsapp}</p>
                    </div>
                  </a>
                )}
                {cliente?.email && (
                  <a href={getEmailUrl()} onClick={() => setShowShareMenu(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-blue-50 text-gray-700 transition-colors">
                    <span className="text-2xl">📧</span>
                    <div>
                      <p className="text-sm font-semibold">Correo electrónico</p>
                      <p className="text-xs text-gray-400">{cliente.email}</p>
                    </div>
                  </a>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(trackingUrl).catch(() => {})
                    alert('Link copiado')
                    setShowShareMenu(false)
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 text-gray-700 w-full text-left transition-colors">
                  <span className="text-2xl">🔗</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Copiar link de seguimiento</p>
                    <p className="text-xs text-gray-400 truncate">{trackingUrl}</p>
                  </div>
                </button>
              </div>

              <div className="px-4 pb-5 pt-1">
                <button onClick={() => setShowShareMenu(false)}
                  className="w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
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

              {/* Ancho impresora (solo para ticket) */}
              {formato === 'ticket' && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Ancho impresora</p>
                  <div className="flex gap-2">
                    {([57, 80] as const).map(w => (
                      <button key={w} onClick={() => setAnchoTicket(w)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${anchoTicket === w ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                        {w}mm
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                  <p className="text-xs text-gray-400">{copias === 2 ? 'Una para el cliente, una para el taller — cada una se imprime en una hoja distinta' : 'Solo una copia en la hoja'}</p>
                </div>
              )}

              {/* T&C */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Términos y condiciones</p>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:bg-gray-50 transition-colors">
                  <input type="checkbox" checked={incluirTC} onChange={e => setIncluirTC(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{formato === 'ticket' ? 'Imprimir T&C al final del ticket' : 'Imprimir T&C al dorso'}</p>
                    <p className="text-xs text-gray-400">{formato === 'ticket' ? 'Se imprime al final del ticket con espacio para firma del cliente' : 'Se imprime en hoja separada, parte trasera del comprobante'}</p>
                  </div>
                </label>
                {!incluirTC && formato !== 'ticket' && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                    Solo si tu papel ya tiene los T&C pre-impresos al dorso
                  </p>
                )}
              </div>

              {/* Resumen */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-0.5">
                <p>• Formato: <strong className="text-gray-700">{FORMAT_INFO[formato].label}{formato === 'ticket' ? ` ${anchoTicket}mm` : ''}</strong></p>
                {formato !== 'ticket' && <p>• Copias: <strong className="text-gray-700">{copias}</strong></p>}
                <p>• T&C: <strong className="text-gray-700">{incluirTC ? 'Sí' : 'No'}</strong></p>
              </div>
            </div>

            <div className="px-5 pb-5 space-y-2">
              <div className="flex gap-3">
                <button onClick={() => setShowPrintModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleImprimir}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm">
                  🖨️ Imprimir ahora
                </button>
              </div>
              <button onClick={handleImprimirSoloTC}
                className="w-full py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
                📄 Imprimir solo cláusulas y condiciones
                <span className="text-xs text-gray-400">(sin impresora doble cara)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

