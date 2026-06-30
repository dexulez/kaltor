/** Envía un mensaje de WhatsApp a través de la API route (credenciales en el servidor) */
export async function enviarWA(telefono: string | null | undefined, mensaje: string): Promise<void> {
  if (!telefono) return
  try {
    await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono, mensaje }),
    })
  } catch { /* silently fail — WA es secundario */ }
}

// ── Templates ────────────────────────────────────────────────────────────────

export function msgOTRecibida(nombre: string, equipo: string, ot: string, local: string) {
  return `Hola ${nombre} 👋\n\nHemos recibido tu *${equipo}* en taller.\n📋 N° OT: *${ot}*\n\nTe avisaremos cuando tengamos novedades.\n\n_${local}_`
}

export function msgOTPresupuestado(nombre: string, equipo: string, ot: string, local: string) {
  return `Hola ${nombre} 🔍\n\nYa tenemos el diagnóstico de tu *${equipo}*.\n📋 N° OT: *${ot}*\n\nPronto te contactaremos con el presupuesto de la reparación.\n\n_${local}_`
}

export function msgOTEsperandoRepuesto(nombre: string, equipo: string, ot: string, local: string) {
  return `Hola ${nombre} ⏳\n\nTu *${equipo}* está en espera de un repuesto.\n📋 N° OT: *${ot}*\n\nTe avisamos en cuanto llegue para continuar con la reparación.\n\n_${local}_`
}

export function msgOTLista(nombre: string, equipo: string, ot: string, local: string) {
  return `Hola ${nombre} ✅\n\n¡Tu *${equipo}* está *listo para retiro*!\n📋 N° OT: *${ot}*\n\nPuedes pasar a buscarlo en horario de atención.\n\n_${local}_`
}

export function msgOTRechazada(nombre: string, equipo: string, ot: string, local: string) {
  return `Hola ${nombre},\n\nLamentablemente no fue posible reparar tu *${equipo}*.\n📋 N° OT: *${ot}*\n\nPuedes pasar a retirarlo cuando gustes.\n\n_${local}_`
}

export function msgOTCobrada(nombre: string, equipo: string, ot: string, total: number, local: string) {
  return `Hola ${nombre} 🧾\n\nTu pago de *$${total.toLocaleString('es-CL')}* por la reparación de *${equipo}* fue registrado.\n📋 N° OT: *${ot}*\n\n¡Gracias por elegirnos! 🙌\n\n_${local}_`
}

export function msgOCProveedor(proveedor: string, items: { nombre: string; cantidad: number }[], ocNumero: string, local: string) {
  const lista = items.map(i => `  • ${i.cantidad}× ${i.nombre}`).join('\n')
  return `Hola *${proveedor}* 👋\n\nSomos *${local}*. Necesitamos cotizar los siguientes repuestos:\n\n${lista}\n\n📋 OC: *${ocNumero}*\n\nPor favor confirmar disponibilidad y precios. ¡Gracias!\n\n_${local}_`
}

export function msgNuevoPedidoB2B(comprador: string, items: { nombre: string; cantidad: number }[], numeroPedido: string, totalEstimado: number) {
  const lista = items.map(i => `  • ${i.cantidad}× ${i.nombre}`).join('\n')
  return `🛍️ *Nuevo pedido de ${comprador}*\n\n${lista}\n\n📋 Pedido: *${numeroPedido}*\nTotal estimado: *$${totalEstimado.toLocaleString('es-CL')}*\n\nRevísalo y confírmalo en el sistema.`
}

export function msgPedidoB2BConfirmado(nombre: string, numeroPedido: string, total: number, local: string) {
  return `Hola ${nombre} ✅\n\nTu pedido *${numeroPedido}* fue confirmado.\nTotal: *$${total.toLocaleString('es-CL')}*\n\nCoordina con nosotros el retiro/envío.\n\n_${local}_`
}

export function msgPedidoB2BRechazado(nombre: string, numeroPedido: string, motivo: string | null, local: string) {
  return `Hola ${nombre},\n\nLamentablemente no pudimos procesar tu pedido *${numeroPedido}*.${motivo ? `\nMotivo: ${motivo}` : ''}\n\nEscríbenos si tienes dudas.\n\n_${local}_`
}

export function msgPedidoB2BEntregado(nombre: string, numeroPedido: string, local: string) {
  return `Hola ${nombre} 📦\n\nTu pedido *${numeroPedido}* fue entregado.\n\n¡Gracias por tu compra! 🙌\n\n_${local}_`
}

export function msgPedidoB2BPagado(nombre: string, numeroPedido: string, total: number, local: string) {
  return `Hola ${nombre} 💰\n\nRegistramos el pago completo de tu pedido *${numeroPedido}* por *$${total.toLocaleString('es-CL')}*.\n\n¡Gracias! 🙌\n\n_${local}_`
}

export function msgRecordatorioPagoB2B(
  nombre: string,
  numeroPedido: string,
  saldoPendiente: number,
  fechaVencimiento: string | null,
  local: string
) {
  const saldo = saldoPendiente.toLocaleString('es-CL')
  const venc = fechaVencimiento ? `\n📅 Fecha límite: *${fechaVencimiento}*` : ''
  return `Hola ${nombre} 🔔\n\nTe recordamos que tienes un saldo pendiente en *${local}*.\n\n📋 Pedido: *${numeroPedido}*\n💰 Saldo: *$${saldo}*${venc}\n\nCualquier consulta, estamos a tu disposición.\n\n_${local}_`
}
