type Nota = { freq: number; dur: number; delay: number; tipo?: OscillatorType; vol?: number }

function tocarNotas(notas: Nota[], volBase = 0.18) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    notas.forEach(({ freq, dur, delay, tipo = 'sine', vol }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = tipo
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay)
      gain.gain.setValueAtTime(0, ctx.currentTime + delay)
      gain.gain.linearRampToValueAtTime(vol ?? volBase, ctx.currentTime + delay + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + dur + 0.05)
    })
    setTimeout(() => ctx.close(), (Math.max(...notas.map(n => n.delay + n.dur)) + 0.3) * 1000)
  } catch { /* Audio no disponible */ }
}

// ══════════════════════════════════════════════════════════════
// OPERACIONES DEL SISTEMA
// ══════════════════════════════════════════════════════════════

/** Éxito genérico — ping agudo corto */
export function soundSuccess() {
  tocarNotas([{ freq: 1046, dur: 0.18, delay: 0 }], 0.14)
}

/** Error — buzzer grave */
export function soundError() {
  tocarNotas([
    { freq: 200, dur: 0.15, delay: 0,    tipo: 'square', vol: 0.12 },
    { freq: 170, dur: 0.20, delay: 0.14, tipo: 'square', vol: 0.10 },
  ])
}

/** Advertencia — tono medio doble */
export function soundWarning() {
  tocarNotas([
    { freq: 440, dur: 0.12, delay: 0 },
    { freq: 370, dur: 0.18, delay: 0.16 },
  ], 0.13)
}

/** Elemento añadido — pop ligero */
export function soundAdd() {
  tocarNotas([
    { freq: 800, dur: 0.08, delay: 0 },
    { freq: 1046, dur: 0.12, delay: 0.07 },
  ], 0.12)
}

/** Elemento eliminado — pop inverso */
export function soundRemove() {
  tocarNotas([
    { freq: 523, dur: 0.08, delay: 0 },
    { freq: 392, dur: 0.12, delay: 0.07 },
  ], 0.11)
}

/** Guardar cambios — doble confirmación */
export function soundSave() {
  tocarNotas([
    { freq: 659, dur: 0.12, delay: 0 },
    { freq: 880, dur: 0.20, delay: 0.13 },
  ], 0.15)
}

// ══════════════════════════════════════════════════════════════
// CAJA / VENTAS
// ══════════════════════════════════════════════════════════════

/** Venta registrada — caja registradora (ka-ching) */
export function soundVenta() {
  tocarNotas([
    { freq: 1319, dur: 0.06, delay: 0 },
    { freq: 1047, dur: 0.06, delay: 0.06 },
    { freq: 1319, dur: 0.06, delay: 0.12 },
    { freq: 1568, dur: 0.18, delay: 0.18 },
  ], 0.16)
}

/** Apertura de caja — campana de caja abierta */
export function soundAperturaCaja() {
  tocarNotas([
    { freq: 523, dur: 0.15, delay: 0 },
    { freq: 659, dur: 0.15, delay: 0.14 },
    { freq: 784, dur: 0.15, delay: 0.28 },
    { freq: 1047, dur: 0.30, delay: 0.42 },
  ], 0.17)
}

/** Cierre de caja — acorde descendente */
export function soundCierreCaja() {
  tocarNotas([
    { freq: 1047, dur: 0.15, delay: 0 },
    { freq: 784, dur: 0.15, delay: 0.14 },
    { freq: 659, dur: 0.15, delay: 0.28 },
    { freq: 523, dur: 0.30, delay: 0.42 },
  ], 0.17)
}

/** Abono registrado — coin drop */
export function soundAbono() {
  tocarNotas([
    { freq: 1568, dur: 0.06, delay: 0 },
    { freq: 1319, dur: 0.08, delay: 0.05 },
    { freq: 880,  dur: 0.15, delay: 0.12 },
  ], 0.14)
}

// ══════════════════════════════════════════════════════════════
// ÓRDENES DE TRABAJO
// ══════════════════════════════════════════════════════════════

/** Nueva OT creada — fanfarria de entrada */
export function soundOTCreada() {
  tocarNotas([
    { freq: 523, dur: 0.10, delay: 0 },
    { freq: 659, dur: 0.10, delay: 0.10 },
    { freq: 784, dur: 0.20, delay: 0.20 },
  ], 0.17)
}

/** OT lista para cobro — acorde alegre */
export function soundOTListo() {
  tocarNotas([
    { freq: 523, dur: 0.15, delay: 0 },
    { freq: 659, dur: 0.15, delay: 0.14 },
    { freq: 784, dur: 0.25, delay: 0.28 },
  ], 0.20)
}

/** OT entregada — fanfarria completa */
export function soundOTEntregada() {
  tocarNotas([
    { freq: 523, dur: 0.10, delay: 0 },
    { freq: 659, dur: 0.10, delay: 0.10 },
    { freq: 784, dur: 0.10, delay: 0.20 },
    { freq: 1047, dur: 0.30, delay: 0.30 },
  ], 0.18)
}

/** Cambio de estado genérico */
export function soundEstadoOT() {
  tocarNotas([{ freq: 698, dur: 0.20, delay: 0 }], 0.13)
}

/** OT rechazada / cancelada */
export function soundOTRechazada() {
  tocarNotas([
    { freq: 392, dur: 0.20, delay: 0,    tipo: 'triangle' },
    { freq: 330, dur: 0.25, delay: 0.18, tipo: 'triangle' },
  ], 0.12)
}

// ══════════════════════════════════════════════════════════════
// COMPRAS / INVENTARIO
// ══════════════════════════════════════════════════════════════

/** Solicitud de compra creada */
export function soundSolicitudCompra() {
  tocarNotas([
    { freq: 698, dur: 0.10, delay: 0 },
    { freq: 698, dur: 0.15, delay: 0.14 },
  ], 0.13)
}

/** Mercancía recibida */
export function soundMercanciaRecibida() {
  tocarNotas([
    { freq: 659, dur: 0.10, delay: 0 },
    { freq: 784, dur: 0.10, delay: 0.12 },
    { freq: 988, dur: 0.20, delay: 0.24 },
  ], 0.16)
}

/** Proveedor confirmó envío */
export function soundEnvioProveedor() {
  tocarNotas([
    { freq: 880,  dur: 0.12, delay: 0 },
    { freq: 1108, dur: 0.20, delay: 0.15 },
  ], 0.15)
}

/** Stock bajo — alerta */
export function soundStockBajo() {
  tocarNotas([
    { freq: 330, dur: 0.15, delay: 0,    tipo: 'square', vol: 0.10 },
    { freq: 330, dur: 0.15, delay: 0.20, tipo: 'square', vol: 0.10 },
    { freq: 277, dur: 0.25, delay: 0.40, tipo: 'square', vol: 0.10 },
  ])
}

// ══════════════════════════════════════════════════════════════
// NOTIFICACIONES DEL BELL
// ══════════════════════════════════════════════════════════════

const SONIDOS_NOTIF: Record<string, () => void> = {
  ot_listo:          soundOTListo,
  ot_entregada:      soundOTEntregada,
  envio_proveedor:   soundEnvioProveedor,
  mercancia_recibida: soundMercanciaRecibida,
  solicitud_compra:  soundSolicitudCompra,
  stock_bajo:        soundStockBajo,
  nuevo_abono:       soundAbono,
  sistema:           () => tocarNotas([{ freq: 880, dur: 0.25, delay: 0 }], 0.12),
}

/** Reproducir sonido por tipo de notificación del bell */
export function playNotificationSound(tipo: string) {
  const fn = SONIDOS_NOTIF[tipo] ?? SONIDOS_NOTIF.sistema
  fn()
}
