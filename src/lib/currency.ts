// Conversión de precios (CLP) a la moneda local del visitante, según su país.
// Fuentes: mindicador.cl (UF y Dólar oficiales de Chile, sin API key) y
// open.er-api.com (tasas USD → resto de monedas, sin API key).

export type ConversionInfo = {
  tipo: 'uf' | 'usd' | 'local'
  codigo: string
  simbolo: string
  factor: number // precio_local = precio_clp * factor
}

const PAIS_MONEDA: Record<string, { codigo: string; simbolo: string }> = {
  AR: { codigo: 'ARS', simbolo: 'AR$' },
  BO: { codigo: 'BOB', simbolo: 'Bs' },
  BR: { codigo: 'BRL', simbolo: 'R$' },
  CO: { codigo: 'COP', simbolo: 'COL$' },
  CR: { codigo: 'CRC', simbolo: '₡' },
  DO: { codigo: 'DOP', simbolo: 'RD$' },
  GT: { codigo: 'GTQ', simbolo: 'Q' },
  HN: { codigo: 'HNL', simbolo: 'L' },
  MX: { codigo: 'MXN', simbolo: 'MX$' },
  NI: { codigo: 'NIO', simbolo: 'C$' },
  PY: { codigo: 'PYG', simbolo: '₲' },
  PE: { codigo: 'PEN', simbolo: 'S/' },
  UY: { codigo: 'UYU', simbolo: '$U' },
  VE: { codigo: 'VES', simbolo: 'Bs' },
  ES: { codigo: 'EUR', simbolo: '€' },
}

// Países dolarizados o donde el dólar es la referencia más clara
const PAISES_USD = new Set(['US', 'EC', 'SV', 'PA'])

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function obtenerConversion(countryCode: string | null): Promise<ConversionInfo | null> {
  const pais = (countryCode || 'CL').toUpperCase()

  if (pais === 'CL') {
    const indicadores = await fetchJson('https://mindicador.cl/api')
    const uf = indicadores?.uf?.valor
    if (!uf || typeof uf !== 'number') return null
    return { tipo: 'uf', codigo: 'UF', simbolo: 'UF', factor: 1 / uf }
  }

  const indicadores = await fetchJson('https://mindicador.cl/api')
  const dolarClp = indicadores?.dolar?.valor
  if (!dolarClp || typeof dolarClp !== 'number') return null

  if (PAISES_USD.has(pais)) {
    return { tipo: 'usd', codigo: 'USD', simbolo: 'US$', factor: 1 / dolarClp }
  }

  const moneda = PAIS_MONEDA[pais]
  if (!moneda) {
    return { tipo: 'usd', codigo: 'USD', simbolo: 'US$', factor: 1 / dolarClp }
  }

  const tasas = await fetchJson('https://open.er-api.com/v6/latest/USD')
  const tasaLocal = tasas?.rates?.[moneda.codigo]
  if (!tasaLocal || typeof tasaLocal !== 'number') {
    return { tipo: 'usd', codigo: 'USD', simbolo: 'US$', factor: 1 / dolarClp }
  }

  return { tipo: 'local', codigo: moneda.codigo, simbolo: moneda.simbolo, factor: (1 / dolarClp) * tasaLocal }
}

export function formatConversion(precioClp: number, conversion: ConversionInfo): string {
  const valor = precioClp * conversion.factor
  if (conversion.tipo === 'uf') {
    return `${valor.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF`
  }
  return `${conversion.simbolo} ${Math.round(valor).toLocaleString('es-CL')}`
}
