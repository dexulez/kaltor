export function calcularPrecioConIva(precioNeto: number, iva = 19): number {
  return Math.round(precioNeto * (1 + iva / 100))
}

export function calcularPrecioSinIva(precioConIva: number, iva = 19): number {
  return Math.round(precioConIva / (1 + iva / 100))
}

export function calcularIva(precioNeto: number, iva = 19): number {
  return Math.round(precioNeto * (iva / 100))
}

export function calcularPpm(precioNeto: number, ppm = 3): number {
  return Math.round(precioNeto * (ppm / 100))
}

export function calcularMargen(precioVenta: number, precioNeto: number, costo: number): number {
  if (costo === 0) return 0
  return Math.round(((precioNeto - costo) / costo) * 100)
}

export function calcularComisionBancaria(total: number, porcentaje: number): number {
  return Math.round(total * (porcentaje / 100))
}

export function calcularComisionTecnico(
  precioServicio: number,
  costoRepuestos: number,
  porcentajeBase: number,
  porcentajeTipo: number,
  porcentajeMetodoPago: number
): { base: number; bruta: number; neta: number } {
  const base = precioServicio - costoRepuestos
  const bruta = Math.round(base * ((porcentajeBase + porcentajeTipo) / 100))
  const neta = Math.round(bruta * (1 - porcentajeMetodoPago / 100))
  return { base, bruta, neta }
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
}
