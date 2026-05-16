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
}

export type TicketFormato = 'a4' | 'ticket80' | 'ticket57'

export const TICKET_FORMATOS: { key: TicketFormato; label: string; desc: string; icon: string }[] = [
  { key: 'a4',       label: 'A4',         desc: '210 × 297 mm',         icon: '🗒️' },
  { key: 'ticket80', label: 'Ticket 80mm', desc: 'Térmica estándar',     icon: '🧾' },
  { key: 'ticket57', label: 'Ticket 57mm', desc: 'Térmica compacta',     icon: '📜' },
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
  const margin = isTicket ? '2mm' : '10mm'
  const fontSize = isTicket ? '8pt' : '9pt'
  const bodyPad = isTicket ? '2mm' : '8mm'

  const docLabel: Record<string, string> = {
    boleta: 'BOLETA', factura: 'FACTURA', presupuesto: 'PRESUPUESTO',
  }
  const metodoLabel: Record<string, string> = {
    efectivo: 'Efectivo', transferencia: 'Transferencia',
    debito: 'Débito', credito: 'Crédito',
  }
  const esPresupuesto = data.tipo_documento === 'presupuesto'

  // Items
  const itemsHtml = data.items.map(item =>
    isTicket
      ? `<div style="margin-bottom:2mm">
           <div style="font-weight:600">${item.nombre}</div>
           <div style="display:flex;justify-content:space-between;font-size:7.5pt">
             <span>${item.cantidad} × ${fmt(item.precio_unitario)}</span>
             <span style="font-weight:bold">${fmt(item.subtotal)}</span>
           </div>
         </div>`
      : `<tr style="border-bottom:1px solid #f0f0f0">
           <td style="padding:2mm">${item.nombre}</td>
           <td style="padding:2mm;text-align:center">${item.cantidad}</td>
           <td style="padding:2mm;text-align:right">${fmt(item.precio_unitario)}</td>
           <td style="padding:2mm;text-align:right;font-weight:bold">${fmt(item.subtotal)}</td>
         </tr>`
  ).join('')

  // Totales
  const totalesTicket = `
    <div style="border-top:1px dashed #000;margin-top:2mm;padding-top:2mm">
      ${data.descuento > 0 ? `<div style="display:flex;justify-content:space-between;color:#666"><span>Descuento</span><span>-${fmt(data.descuento)}</span></div>` : ''}
      ${!esPresupuesto ? `
        <div style="display:flex;justify-content:space-between"><span>Neto</span><span>${fmt(data.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between"><span>IVA (19%)</span><span>${fmt(data.iva)}</span></div>
        ${data.ppm > 0 ? `<div style="display:flex;justify-content:space-between"><span>PPM (3%)</span><span>${fmt(data.ppm)}</span></div>` : ''}
      ` : ''}
      <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:12pt;border-top:1.5px solid #000;margin-top:1.5mm;padding-top:1.5mm">
        <span>TOTAL</span><span>${fmt(data.total)}</span>
      </div>
      <div style="margin-top:1mm;font-size:7.5pt">Pago: <strong>${metodoLabel[data.metodo_pago] ?? data.metodo_pago}</strong></div>
    </div>`

  const totalesA4 = `
    <div style="max-width:240px;margin-left:auto;margin-top:3mm;font-size:9pt">
      ${data.descuento > 0 ? `<div style="display:flex;justify-content:space-between;color:#666;padding:1mm 0"><span>Descuento</span><span>-${fmt(data.descuento)}</span></div>` : ''}
      ${!esPresupuesto ? `
        <div style="display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px solid #eee"><span>Neto</span><span>${fmt(data.subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px solid #eee"><span>IVA (19%)</span><span>${fmt(data.iva)}</span></div>
        ${data.ppm > 0 ? `<div style="display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px solid #eee"><span>PPM (3%)</span><span>${fmt(data.ppm)}</span></div>` : ''}
      ` : ''}
      <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13pt;border-top:2px solid #111;margin-top:2mm;padding-top:2mm">
        <span>TOTAL</span><span>${fmt(data.total)}</span>
      </div>
      <div style="margin-top:2mm">Método de pago: <strong>${metodoLabel[data.metodo_pago] ?? data.metodo_pago}</strong></div>
    </div>`

  let body: string
  if (isTicket) {
    body = `
      <div style="text-align:center;margin-bottom:3mm">
        <div style="font-size:11pt;font-weight:bold">${config.nombre_local}</div>
        ${config.rut_local ? `<div>RUT: ${config.rut_local}</div>` : ''}
        ${config.direccion ? `<div>${config.direccion}</div>` : ''}
        ${config.telefono ? `<div>Tel: ${config.telefono}</div>` : ''}
      </div>
      <div style="border-top:1px dashed #000;border-bottom:1px dashed #000;padding:1.5mm 0;margin:2mm 0;text-align:center">
        <div style="font-weight:bold;font-size:10pt">${docLabel[data.tipo_documento] ?? data.tipo_documento.toUpperCase()}</div>
        <div style="font-family:monospace;font-size:9pt">${data.numero_venta}</div>
        <div>${fechaHora}</div>
        ${data.cliente_nombre ? `<div style="margin-top:1mm">Cliente: <strong>${data.cliente_nombre}</strong></div>` : ''}
      </div>
      <div style="margin:2mm 0;border-bottom:1px dashed #000;padding-bottom:2mm">${itemsHtml}</div>
      ${totalesTicket}
      <div style="text-align:center;margin-top:5mm;font-size:7.5pt;border-top:1px dashed #000;padding-top:2mm">
        ¡Gracias por su preferencia!
      </div>
      <div style="height:12mm"></div>`
  } else {
    body = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:4mm;margin-bottom:5mm">
        <div>
          <div style="font-size:15pt;font-weight:bold">${config.nombre_local}</div>
          ${config.rut_local ? `<div style="font-size:8pt;color:#555">RUT: ${config.rut_local}</div>` : ''}
          ${config.direccion ? `<div style="font-size:8pt;color:#555">${config.direccion}</div>` : ''}
          ${config.telefono ? `<div style="font-size:8pt;color:#555">Tel: ${config.telefono}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:13pt;font-weight:bold">${docLabel[data.tipo_documento] ?? data.tipo_documento.toUpperCase()}</div>
          <div style="font-family:monospace;font-size:11pt;color:#1e3a8a">${data.numero_venta}</div>
          <div style="font-size:8pt;color:#555">${fechaHora}</div>
        </div>
      </div>
      ${data.cliente_nombre ? `<p style="margin-bottom:3mm;font-size:9pt">Cliente: <strong>${data.cliente_nombre}</strong></p>` : ''}
      <table style="width:100%;border-collapse:collapse;margin-bottom:3mm">
        <thead>
          <tr style="border-bottom:2px solid #111;font-size:8pt;color:#555">
            <th style="text-align:left;padding:2mm 2mm">Producto / Servicio</th>
            <th style="text-align:center;padding:2mm">Cant.</th>
            <th style="text-align:right;padding:2mm">P. Unit.</th>
            <th style="text-align:right;padding:2mm">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      ${totalesA4}
      <div style="margin-top:10mm;text-align:center;font-size:8pt;color:#666;border-top:1px solid #eee;padding-top:3mm">
        ¡Gracias por su preferencia! — ${config.nombre_local}
      </div>`
  }

  const winW = formato === 'ticket57' ? '380' : formato === 'ticket80' ? '480' : '700'
  const win = window.open('', '_blank', `width=${winW},height=800`)
  if (!win) { alert('Activa las ventanas emergentes para imprimir'); return }
  win.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>${data.numero_venta}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:${fontSize};color:#111;padding:${bodyPad}}
  @page{size:${mm}${isTicket ? ' auto' : ''};margin:${margin}}
</style></head><body>${body}</body></html>`)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 400)
}
