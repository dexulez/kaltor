// Reglas de vencimiento SII/Previred. Solo evita fines de semana (sábado/domingo);
// no incluye el calendario de feriados de Chile, así que conviene confirmar la fecha
// exacta con tu contador cuando el vencimiento caiga cerca de un feriado.

function diaDelMesSiguiente(mes: string, dia: number): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m, dia) // mes es 0-indexado en Date, así que m = mes siguiente a `mes` (1-indexado)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function siguienteDiaHabil(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1)
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export type ModalidadF29 = 'papel' | 'electronico' | 'sin_movimiento'

export const MODALIDAD_F29_LABEL: Record<ModalidadF29, string> = {
  papel: 'Papel / caso general (día 12)',
  electronico: 'Facturador electrónico (día 20)',
  sin_movimiento: 'Sin movimiento, declarado en cero (día 28)',
}

/** mes: 'YYYY-MM-01' del período que se declara. Devuelve la fecha de vencimiento del mes siguiente. */
export function vencimientoF29(mes: string, modalidad: ModalidadF29): string {
  if (modalidad === 'papel') return siguienteDiaHabil(diaDelMesSiguiente(mes, 12))
  if (modalidad === 'electronico') return siguienteDiaHabil(diaDelMesSiguiente(mes, 20))
  return diaDelMesSiguiente(mes, 28) // sin movimiento: se mantiene, no se corre
}

/** Vencimientos de Previred (cotizaciones AFP/salud) para el mes siguiente a `mes`. */
export function vencimientosPrevired(mes: string) {
  return {
    presencialODnp: siguienteDiaHabil(diaDelMesSiguiente(mes, 10)),
    electronico: diaDelMesSiguiente(mes, 13), // plazo fatal, no se corre
  }
}
