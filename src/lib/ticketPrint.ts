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

export type TicketFormato = 'a4' | 'ticket80' | 'ticket57'

export const TICKET_FORMATOS: { key: TicketFormato; label: string; desc: string; icon: string }[] = [
  { key: 'a4',       label: 'A4',         desc: '210 × 297 mm',     icon: '🗒️' },
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

  const isTicket = formato !== 'a4'
  const mm = formato === 'ticket57' ? '57mm' : formato === 'ticket80' ? '80mm' : 'A4'
  const margin = isTicket ? '3mm' : '12mm'
  const bodyPad = isTicket ? '3mm' : '10mm'

  const docLabel: Record<string, string> = {
    boleta: 'BOLETA', factura: 'FACTURA', presupuesto: 'PRESUPUESTO',
  }
  const metodoLabel: Record<string, string> = {
    efectivo: 'Efectivo', transferencia: 'Transferencia',
    debito: 'Débito', credito: 'Crédito',
  }
  const esPresupuesto = data.tipo_documento === 'presupuesto'

  // Logo HTML
  const logoHtml = config.logo_url
    ? `<img src="${config.logo_url}" style="max-height:${isTicket ? '16mm' : '20mm'};max-width:${isTicket ? '40mm' : '60mm'};display:block;object-fit:contain;margin:0 auto ${isTicket ? '2mm' : '0'}">`
    : `<div style="font-size:${isTicket ? '22pt' : '28pt'};text-align:${isTicket ? 'center' : 'left'}">🔧</div>`

  // Items
  const itemsHtml = data.items.map(item =>
    isTicket
      ? `<div style="margin-bottom:3mm">
           <div style="font-weight:600;font-size:10pt">${item.nombre}</div>
           <div style="display:flex;justify-content:space-between;font-size:9.5pt;margin-top:0.5mm">
             <span>${item.cantidad} × ${fmt(item.precio_unitario)}</span>
             <span style="font-weight:bold">${fmt(item.subtotal)}</span>
           </div>
         </div>`
      : `<tr style="border-bottom:1px solid #f0f0f0">
           <td style="padding:2.5mm 2mm;font-size:10pt">${item.nombre}</td>
           <td style="padding:2.5mm 2mm;text-align:center;font-size:10pt">${item.cantidad}</td>
           <td style="padding:2.5mm 2mm;text-align:right;font-size:10pt">${fmt(item.precio_unitario)}</td>
           <td style="padding:2.5mm 2mm;text-align:right;font-weight:bold;font-size:10pt">${fmt(item.subtotal)}</td>
         </tr>`
  ).join('')

  // Totales ticket
  const totalesTicket = `
    <div style="border-top:1px dashed #000;margin-top:3mm;padding-top:3mm">
      ${data.descuento > 0 ? `<div style="display:flex;justify-content:space-between;color:#666;font-size:9.5pt;margin-bottom:1mm"><span>Descuento</span><span>-${fmt(data.descuento)}</span></div>` : ''}
      ${!esPresupuesto ? `
        <div style="display:flex;justify-content:space-between;font-size:9.5pt;margin-bottom:1mm"><span>Neto</span><span>${fmt(data.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:9.5pt;margin-bottom:1mm"><span>IVA (19%)</span><span>${fmt(data.iva)}</span></div>
        ${data.ppm > 0 ? `<div style="display:flex;justify-content:space-between;font-size:9.5pt;margin-bottom:1mm"><span>PPM (3%)</span><span>${fmt(data.ppm)}</span></div>` : ''}
      ` : ''}
      <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:15pt;border-top:2px solid #000;margin-top:2mm;padding-top:2mm">
        <span>TOTAL</span><span>${fmt(data.total)}</span>
      </div>
      <div style="margin-top:2mm;font-size:10pt">Pago: <strong>${metodoLabel[data.metodo_pago] ?? data.metodo_pago}</strong></div>
    </div>`

  // Totales A4
  const totalesA4 = `
    <div style="max-width:280px;margin-left:auto;margin-top:4mm;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
      ${data.descuento > 0 ? `<div style="display:flex;justify-content:space-between;padding:2.5mm 4mm;font-size:10pt;color:#666;border-bottom:1px solid #f0f0f0"><span>Descuento</span><span>-${fmt(data.descuento)}</span></div>` : ''}
      ${!esPresupuesto ? `
        <div style="display:flex;justify-content:space-between;padding:2.5mm 4mm;font-size:10pt;border-bottom:1px solid #f0f0f0"><span>Neto</span><span>${fmt(data.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:2.5mm 4mm;font-size:10pt;border-bottom:1px solid #f0f0f0"><span>IVA (19%)</span><span>${fmt(data.iva)}</span></div>
        ${data.ppm > 0 ? `<div style="display:flex;justify-content:space-between;padding:2.5mm 4mm;font-size:10pt;border-bottom:1px solid #f0f0f0"><span>PPM (3%)</span><span>${fmt(data.ppm)}</span></div>` : ''}
      ` : ''}
      <div style="display:flex;justify-content:space-between;padding:3mm 4mm;font-weight:bold;font-size:16pt;background:#1e3a5f;color:#fff">
        <span>TOTAL</span><span>${fmt(data.total)}</span>
      </div>
      <div style="padding:2.5mm 4mm;font-size:10pt;background:#f9fafb">
        Método de pago: <strong>${metodoLabel[data.metodo_pago] ?? data.metodo_pago}</strong>
      </div>
    </div>`

  let body: string

  if (isTicket) {
    body = `
      <div style="text-align:center;margin-bottom:4mm">
        ${logoHtml}
        <div style="font-size:14pt;font-weight:bold;margin-top:${config.logo_url ? '2mm' : '0'}">${config.nombre_local}</div>
        ${config.rut_local ? `<div style="font-size:10pt">RUT: ${config.rut_local}</div>` : ''}
        ${config.direccion ? `<div style="font-size:9.5pt">${config.direccion}</div>` : ''}
        ${config.telefono ? `<div style="font-size:9.5pt">Tel: ${config.telefono}</div>` : ''}
        ${config.email ? `<div style="font-size:9.5pt">${config.email}</div>` : ''}
      </div>
      <div style="border-top:2px dashed #000;border-bottom:2px dashed #000;padding:2.5mm 0;margin:3mm 0;text-align:center">
        <div style="font-weight:bold;font-size:13pt">${docLabel[data.tipo_documento] ?? data.tipo_documento.toUpperCase()}</div>
        <div style="font-family:monospace;font-size:12pt;margin-top:1mm">${data.numero_venta}</div>
        <div style="font-size:10pt;margin-top:1mm">${fechaHora}</div>
        ${data.cliente_nombre ? `<div style="font-size:10pt;margin-top:1.5mm">Cliente: <strong>${data.cliente_nombre}</strong></div>` : ''}
      </div>
      <div style="margin:3mm 0;border-bottom:1px dashed #000;padding-bottom:3mm">${itemsHtml}</div>
      ${totalesTicket}
      <div style="text-align:center;margin-top:6mm;font-size:10pt;border-top:1px dashed #000;padding-top:3mm">
        ¡Gracias por su preferencia!
      </div>
      <div style="height:14mm"></div>`
  } else {
    body = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e3a5f;padding-bottom:5mm;margin-bottom:6mm">
        <div style="display:flex;align-items:center;gap:4mm">
          ${logoHtml}
          <div>
            <div style="font-size:17pt;font-weight:bold;line-height:1.1">${config.nombre_local}</div>
            ${config.rut_local ? `<div style="font-size:10pt;color:#555;margin-top:1mm">RUT: ${config.rut_local}</div>` : ''}
            ${config.direccion ? `<div style="font-size:10pt;color:#555">${config.direccion}</div>` : ''}
            ${config.telefono ? `<div style="font-size:10pt;color:#555">Tel: ${config.telefono}</div>` : ''}
            ${config.email ? `<div style="font-size:10pt;color:#555">${config.email}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right;background:#1e3a5f;color:#fff;padding:4mm 5mm;border-radius:6px;min-width:50mm">
          <div style="font-size:11pt;font-weight:bold;letter-spacing:1px">${docLabel[data.tipo_documento] ?? data.tipo_documento.toUpperCase()}</div>
          <div style="font-family:monospace;font-size:14pt;color:#fbbf24;margin-top:1mm">${data.numero_venta}</div>
          <div style="font-size:9pt;color:#93c5fd;margin-top:1mm">${fechaHora}</div>
        </div>
      </div>
      ${data.cliente_nombre ? `<p style="margin-bottom:4mm;font-size:11pt;padding:2mm 3mm;background:#f0f9ff;border-left:3px solid #1e3a5f;border-radius:2px">Cliente: <strong>${data.cliente_nombre}</strong></p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-bottom:4mm;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
        <thead>
          <tr style="background:#1e3a5f;color:#fff;font-size:10pt">
            <th style="text-align:left;padding:3mm 3mm">Producto / Servicio</th>
            <th style="text-align:center;padding:3mm">Cant.</th>
            <th style="text-align:right;padding:3mm">P. Unit.</th>
            <th style="text-align:right;padding:3mm">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      ${totalesA4}
      <div style="margin-top:12mm;text-align:center;font-size:10pt;color:#666;border-top:1px solid #eee;padding-top:4mm">
        ¡Gracias por su preferencia! — ${config.nombre_local}
      </div>`
  }

  const winW = formato === 'ticket57' ? '380' : formato === 'ticket80' ? '500' : '720'
  const win = window.open('', '_blank', `width=${winW},height=900`)
  if (!win) { alert('Activa las ventanas emergentes para imprimir'); return }
  win.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>${data.numero_venta}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:${isTicket ? '10pt' : '11pt'};color:#111;padding:${bodyPad}}
  @page{size:${mm}${isTicket ? ' auto' : ''};margin:${margin}}
</style></head><body>${body}</body></html>`)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 400)
}
