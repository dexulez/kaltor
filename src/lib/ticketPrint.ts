export interface TicketVentaData {
  numero_venta: string
  created_at: string
  tipo_documento: string
  metodo_pago: string
  cliente_nombre?: string | null
  items: { nombre: string; cantidad: number; precio_unitario: number; subtotal: number }[]
  subtotal: number
  iva: number
  ppm: number
  descuento: number
  total: number
}

export interface TicketConfig {
  nombre_local: string
  rut_local?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  logo_url?: string | null
}

export type TicketFormato = 'a4' | 'a5' | 'ticket80' | 'ticket57'

export const TICKET_FORMATOS: { key: TicketFormato; label: string; desc: string; icon: string }[] = [
  { key: 'a4',       label: 'A4',          desc: '210 × 297 mm',     icon: '🗒️' },
  { key: 'a5',       label: 'A5',          desc: '148 × 210 mm',     icon: '📋' },
  { key: 'ticket80', label: 'Ticket 80mm', desc: 'Térmica estándar', icon: '🧾' },
  { key: 'ticket57', label: 'Ticket 57mm', desc: 'Térmica compacta', icon: '📜' },
]

export function imprimirTicketVenta(
  data: TicketVentaData,
  config: TicketConfig,
  formato: TicketFormato = 'ticket80'
) {
  const fmt = (n: number) => n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })
  const fechaHora = new Date(data.created_at).toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const isTicket = formato === 'ticket80' || formato === 'ticket57'
  const isA5     = formato === 'a5'

  const pageSize = formato === 'ticket57' ? '57mm' : formato === 'ticket80' ? '80mm' : formato === 'a5' ? 'A5' : 'A4'
  const margin   = isTicket ? '3mm' : isA5 ? '8mm' : '12mm'
  const bodyPad  = isTicket ? '3mm' : isA5 ? '6mm' : '10mm'
  const fontSize = isTicket ? '10pt' : isA5 ? '9pt' : '11pt'

  const docLabel = 'COMPROBANTE DE TRANSACCIÓN'
  const metodoLabel: Record<string, string> = {
    efectivo: 'Efectivo', transferencia: 'Transferencia',
    debito: 'Débito', credito: 'Crédito',
  }
  const esPresupuesto = data.tipo_documento === 'presupuesto'

  // ── Datos de la empresa ────────────────────────────────────────────────────
  const nl   = config.nombre_local || ''
  const rut  = config.rut_local    || ''
  const dir  = config.direccion    || ''
  const tel  = config.telefono     || ''
  const mail = config.email        || ''
  const logo = config.logo_url     || ''

  // ── Cabeceras ──────────────────────────────────────────────────────────────

  function cabeceraTicket() {
    return `
      <div style="text-align:center;margin-bottom:4mm;padding-bottom:3mm;border-bottom:2px dashed #000">
        ${logo ? `<img src="${logo}" style="max-height:18mm;max-width:45mm;display:block;margin:0 auto 2.5mm;object-fit:contain">` : ''}
        <div style="font-size:14pt;font-weight:bold;line-height:1.2">${nl}</div>
        ${rut  ? `<div style="font-size:10pt;margin-top:1mm">RUT: ${rut}</div>` : ''}
        ${dir  ? `<div style="font-size:9.5pt;margin-top:0.5mm">${dir}</div>` : ''}
        ${tel  ? `<div style="font-size:9.5pt">Tel: ${tel}</div>` : ''}
        ${mail ? `<div style="font-size:9.5pt">${mail}</div>` : ''}
      </div>`
  }

  // Cabecera compartida para A4 y A5 (misma estructura, distintos tamaños de fuente)
  function cabeceraHoja(fs: { titulo: string; rut: string; dir: string; num: string; sub: string }) {
    const logoBlock = logo
      ? `<img src="${logo}" style="max-height:${isA5 ? '18mm' : '22mm'};max-width:${isA5 ? '50mm' : '60mm'};display:block;object-fit:contain">`
      : ''
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e3a5f;padding-bottom:${isA5 ? '4mm' : '5mm'};margin-bottom:${isA5 ? '4mm' : '6mm'}">
        <div style="display:flex;align-items:center;gap:${isA5 ? '4mm' : '5mm'}">
          ${logoBlock}
          <div>
            <div style="font-size:${fs.titulo};font-weight:bold;line-height:1.1">${nl}</div>
            ${rut  ? `<div style="font-size:${fs.rut};color:#444;margin-top:1.5mm">RUT: ${rut}</div>` : ''}
            ${dir  ? `<div style="font-size:${fs.dir};color:#444">${dir}</div>` : ''}
            ${tel  ? `<div style="font-size:${fs.dir};color:#444">Tel: ${tel}</div>` : ''}
            ${mail ? `<div style="font-size:${fs.dir};color:#444">${mail}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;background:#1e3a5f;color:#fff;padding:${isA5 ? '3mm 4mm' : '4mm 6mm'};border-radius:8px;min-width:${isA5 ? '44mm' : '52mm'};flex-shrink:0">
          <div style="font-size:${fs.sub};font-weight:bold;letter-spacing:1px;color:#93c5fd">${docLabel}</div>
          <div style="font-family:monospace;font-size:${fs.num};color:#fbbf24;margin-top:1mm">${data.numero_venta}</div>
          <div style="font-size:${fs.rut};color:#bfdbfe;margin-top:1mm">${fechaHora}</div>
          ${data.cliente_nombre ? `<div style="font-size:${fs.rut};color:#e0f2fe;margin-top:1mm">${data.cliente_nombre}</div>` : ''}
        </div>
      </div>`
  }

  // ── Items ──────────────────────────────────────────────────────────────────

  const itemsTicket = data.items.map(item => `
    <div style="margin-bottom:3mm">
      <div style="font-weight:600;font-size:10.5pt">${item.nombre}</div>
      <div style="display:flex;justify-content:space-between;font-size:10pt;margin-top:0.5mm">
        <span>${item.cantidad} × ${fmt(item.precio_unitario)}</span>
        <span style="font-weight:bold">${fmt(item.subtotal)}</span>
      </div>
    </div>`).join('')

  function itemsHoja(fsTd: string) {
    return data.items.map(item => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:${isA5 ? '2mm' : '3mm'};font-size:${fsTd}">${item.nombre}</td>
        <td style="padding:${isA5 ? '2mm' : '3mm'};text-align:center;font-size:${fsTd}">${item.cantidad}</td>
        <td style="padding:${isA5 ? '2mm' : '3mm'};text-align:right;font-size:${fsTd}">${fmt(item.precio_unitario)}</td>
        <td style="padding:${isA5 ? '2mm' : '3mm'};text-align:right;font-weight:bold;font-size:${fsTd}">${fmt(item.subtotal)}</td>
      </tr>`).join('')
  }

  // ── Totales ────────────────────────────────────────────────────────────────

  const totalesTicket = `
    <div style="border-top:2px dashed #000;margin-top:3mm;padding-top:3mm">
      ${data.descuento > 0 ? `<div style="display:flex;justify-content:space-between;color:#666;font-size:9.5pt;margin-bottom:1mm"><span>Descuento</span><span>- ${fmt(data.descuento)}</span></div>` : ''}
      ${!esPresupuesto ? `
        <div style="display:flex;justify-content:space-between;font-size:10pt;margin-bottom:1mm"><span>Neto</span><span>${fmt(data.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:10pt;margin-bottom:1mm"><span>IVA (19%)</span><span>${fmt(data.iva)}</span></div>
      ` : ''}
      <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16pt;border-top:2px solid #000;margin-top:2.5mm;padding-top:2.5mm">
        <span>TOTAL</span><span>${fmt(data.total)}</span>
      </div>
      <div style="margin-top:2mm;font-size:10.5pt">Pago: <strong>${metodoLabel[data.metodo_pago] ?? data.metodo_pago}</strong></div>
    </div>`

  function totalesHoja(fsBase: string, fsTot: string, maxW: string) {
    return `
      <div style="max-width:${maxW};margin-left:auto;margin-top:${isA5 ? '4mm' : '5mm'};border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        ${data.descuento > 0 ? `<div style="display:flex;justify-content:space-between;padding:${isA5 ? '2.5mm 3mm' : '3mm 4mm'};font-size:${fsBase};color:#666;border-bottom:1px solid #f0f0f0"><span>Descuento</span><span>- ${fmt(data.descuento)}</span></div>` : ''}
        ${!esPresupuesto ? `
          <div style="display:flex;justify-content:space-between;padding:${isA5 ? '2.5mm 3mm' : '3mm 4mm'};font-size:${fsBase};border-bottom:1px solid #f0f0f0"><span>Neto</span><span>${fmt(data.subtotal)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:${isA5 ? '2.5mm 3mm' : '3mm 4mm'};font-size:${fsBase};border-bottom:1px solid #f0f0f0"><span>IVA (19%)</span><span>${fmt(data.iva)}</span></div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;padding:${isA5 ? '3mm' : '4mm'};font-weight:bold;font-size:${fsTot};background:#1e3a5f;color:#fff">
          <span>TOTAL</span><span>${fmt(data.total)}</span>
        </div>
        <div style="padding:${isA5 ? '2.5mm 3mm' : '3mm 4mm'};font-size:${fsBase};background:#f8fafc">
          Método de pago: <strong>${metodoLabel[data.metodo_pago] ?? data.metodo_pago}</strong>
        </div>
      </div>`
  }

  // ── Pie de página ──────────────────────────────────────────────────────────

  const pieTicket = `
    <div style="text-align:center;margin-top:6mm;padding-top:3mm;border-top:1px dashed #000;font-size:10pt">
      ¡Gracias por su preferencia!
    </div>
    <div style="height:14mm"></div>`

  const pieHoja = `
    <div style="text-align:center;margin-top:${isA5 ? '8mm' : '12mm'};padding-top:4mm;border-top:1px solid #e2e8f0;font-size:10pt;color:#666">
      ¡Gracias por su preferencia!
    </div>`

  // ── Cuerpo completo por formato ────────────────────────────────────────────

  let body: string

  if (isTicket) {
    const infoDocs = `
      <div style="text-align:center;padding:2.5mm 0;margin-bottom:3mm;border-bottom:1px dashed #000">
        <div style="font-weight:bold;font-size:13pt">${docLabel}</div>
        <div style="font-family:monospace;font-size:12pt;margin-top:1mm">${data.numero_venta}</div>
        <div style="font-size:10pt;margin-top:1mm">${fechaHora}</div>
        ${data.cliente_nombre ? `<div style="font-size:10pt;margin-top:1.5mm">Cliente: <strong>${data.cliente_nombre}</strong></div>` : ''}
      </div>`
    body = cabeceraTicket() + infoDocs
      + `<div style="margin:0 0 3mm;border-bottom:1px dashed #000;padding-bottom:3mm">${itemsTicket}</div>`
      + totalesTicket + pieTicket

  } else if (isA5) {
    const clienteRow = data.cliente_nombre
      ? `<p style="margin-bottom:3mm;font-size:9.5pt;padding:2mm 3mm;background:#f0f9ff;border-left:3px solid #1e3a5f;border-radius:3px">Cliente: <strong>${data.cliente_nombre}</strong></p>`
      : ''
    body = cabeceraHoja({ titulo: '14pt', rut: '8.5pt', dir: '8.5pt', num: '12pt', sub: '8pt' })
      + clienteRow
      + `<table style="width:100%;border-collapse:collapse;margin-bottom:3mm;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
           <thead>
             <tr style="background:#f8fafc;font-size:8.5pt;color:#555;border-bottom:2px solid #e2e8f0">
               <th style="text-align:left;padding:2mm">Producto / Servicio</th>
               <th style="text-align:center;padding:2mm">Cant.</th>
               <th style="text-align:right;padding:2mm">P. Unit.</th>
               <th style="text-align:right;padding:2mm">Subtotal</th>
             </tr>
           </thead>
           <tbody>${itemsHoja('9pt')}</tbody>
         </table>`
      + totalesHoja('9pt', '14pt', '240px') + pieHoja

  } else {
    // A4
    const clienteRow = data.cliente_nombre
      ? `<p style="margin-bottom:4mm;font-size:10.5pt;padding:2.5mm 4mm;background:#f0f9ff;border-left:3px solid #1e3a5f;border-radius:3px">Cliente: <strong>${data.cliente_nombre}</strong></p>`
      : ''
    body = cabeceraHoja({ titulo: '18pt', rut: '10pt', dir: '10pt', num: '15pt', sub: '10pt' })
      + clienteRow
      + `<table style="width:100%;border-collapse:collapse;margin-bottom:4mm;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
           <thead>
             <tr style="background:#f8fafc;font-size:10pt;color:#555;border-bottom:2px solid #e2e8f0">
               <th style="text-align:left;padding:3mm">Producto / Servicio</th>
               <th style="text-align:center;padding:3mm">Cant.</th>
               <th style="text-align:right;padding:3mm">P. Unit.</th>
               <th style="text-align:right;padding:3mm">Subtotal</th>
             </tr>
           </thead>
           <tbody>${itemsHoja('10.5pt')}</tbody>
         </table>`
      + totalesHoja('10.5pt', '17pt', '290px') + pieHoja
  }

  // ── Generar ventana de impresión ───────────────────────────────────────────
  const winW = formato === 'ticket57' ? '380' : formato === 'ticket80' ? '500' : formato === 'a5' ? '560' : '720'
  const win = window.open('', '_blank', `width=${winW},height=900`)
  if (!win) { alert('Activa las ventanas emergentes para imprimir'); return }
  win.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>${data.numero_venta}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:${fontSize};color:#111;padding:${bodyPad}}
  @page{size:${pageSize}${isTicket ? ' auto' : ''};margin:${margin}}
  img{display:block}
</style></head><body>${body}</body></html>`)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 400)
}
