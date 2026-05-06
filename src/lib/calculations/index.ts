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

// ── RUT chileno ───────────────────────────────────────────────────────────────
// Formato: 26595544-4 (sin puntos, con guión antes del DV)

export function formatRut(value: string): string {
  // Sin límite de dígitos, solo dash antes del último carácter (DV)
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length <= 1) return clean
  const body = clean.slice(0, -1)
  const dv   = clean.slice(-1)
  return `${body}-${dv}`
}

export function validarRut(rut: string): boolean {
  if (!rut) return true
  const clean = rut.replace(/[^0-9kK]/gi, '').toUpperCase()
  if (clean.length < 2) return false
  const body = clean.slice(0, -1)
  const dv   = clean.slice(-1)
  let sum = 0, mul = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const exp = 11 - (sum % 11)
  const dvExp = exp === 11 ? '0' : exp === 10 ? 'K' : String(exp)
  return dv === dvExp
}
