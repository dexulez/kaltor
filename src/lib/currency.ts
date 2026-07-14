// Conversión de precios (CLP) a la moneda local del visitante, según su país.
// Fuentes: mindicador.cl (UF y Dólar oficiales de Chile, sin API key) y
// open.er-api.com (tasas USD → resto de monedas, sin API key).

export type ConversionInfo = {
  tipo: 'uf' | 'usd' | 'local'
  codigo: string
  simbolo: string
  locale: string
  factor: number // precio_local = precio_clp * factor
}

export const PAIS_MONEDA: Record<string, { codigo: string; simbolo: string; locale: string }> = {
  AR: { codigo: 'ARS', simbolo: 'AR$',   locale: 'es-AR' },
  BO: { codigo: 'BOB', simbolo: 'Bs',    locale: 'es-BO' },
  BR: { codigo: 'BRL', simbolo: 'R$',    locale: 'pt-BR' },
  CO: { codigo: 'COP', simbolo: 'COL$',  locale: 'es-CO' },
  CR: { codigo: 'CRC', simbolo: '₡',     locale: 'es-CR' },
  DO: { codigo: 'DOP', simbolo: 'RD$',   locale: 'es-DO' },
  GT: { codigo: 'GTQ', simbolo: 'Q',     locale: 'es-GT' },
  HN: { codigo: 'HNL', simbolo: 'L',     locale: 'es-HN' },
  MX: { codigo: 'MXN', simbolo: 'MX$',   locale: 'es-MX' },
  NI: { codigo: 'NIO', simbolo: 'C$',    locale: 'es-NI' },
  PY: { codigo: 'PYG', simbolo: '₲',     locale: 'es-PY' },
  PE: { codigo: 'PEN', simbolo: 'S/',    locale: 'es-PE' },
  UY: { codigo: 'UYU', simbolo: '$U',    locale: 'es-UY' },
  VE: { codigo: 'VES', simbolo: 'Bs',    locale: 'es-VE' },
  ES: { codigo: 'EUR', simbolo: '€',     locale: 'es-ES' },
}

// Países dolarizados o donde el dólar es la referencia más clara, con su locale para formato de número
export const PAISES_USD: Record<string, string> = { US: 'en-US', EC: 'es-EC', SV: 'es-SV', PA: 'es-PA' }

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function obtenerDolarClp(): Promise<number | null> {
  const indicadores = await fetchJson('https://mindicador.cl/api')
  const valor = indicadores?.dolar?.valor
  return typeof valor === 'number' ? valor : null
}

export async function obtenerConversion(countryCode: string | null): Promise<ConversionInfo | null> {
  const pais = (countryCode || 'CL').toUpperCase()

  if (pais === 'CL') {
    const indicadores = await fetchJson('https://mindicador.cl/api')
    const uf = indicadores?.uf?.valor
    if (!uf || typeof uf !== 'number') return null
    return { tipo: 'uf', codigo: 'UF', simbolo: 'UF', locale: 'es-CL', factor: 1 / uf }
  }

  const indicadores = await fetchJson('https://mindicador.cl/api')
  const dolarClp = indicadores?.dolar?.valor
  if (!dolarClp || typeof dolarClp !== 'number') return null

  const localeUsd = PAISES_USD[pais]
  if (localeUsd) {
    return { tipo: 'usd', codigo: 'USD', simbolo: 'US$', locale: localeUsd, factor: 1 / dolarClp }
  }

  const moneda = PAIS_MONEDA[pais]
  if (!moneda) {
    return { tipo: 'usd', codigo: 'USD', simbolo: 'US$', locale: 'en-US', factor: 1 / dolarClp }
  }

  const tasas = await fetchJson('https://open.er-api.com/v6/latest/USD')
  const tasaLocal = tasas?.rates?.[moneda.codigo]
  if (!tasaLocal || typeof tasaLocal !== 'number') {
    return { tipo: 'usd', codigo: 'USD', simbolo: 'US$', locale: 'en-US', factor: 1 / dolarClp }
  }

  return { tipo: 'local', codigo: moneda.codigo, simbolo: moneda.simbolo, locale: moneda.locale, factor: (1 / dolarClp) * tasaLocal }
}

// A partir del precio mensual en USD, calcula el precio local "crudo" (número, sin formatear)
// para cada país con moneda propia (excluye Chile y los países dolarizados, que usan el
// campo CLP o USD directamente). Se usa para recalcular plans.precios_pais cada vez que el
// superadmin guarda un nuevo precio_mensual_usd.
export async function convertirDesdeUsd(usdMensual: number): Promise<Record<string, number>> {
  const tasas = await fetchJson('https://open.er-api.com/v6/latest/USD')
  const resultado: Record<string, number> = {}
  if (!tasas?.rates) return resultado

  for (const [pais, moneda] of Object.entries(PAIS_MONEDA)) {
    if (pais === 'CL') continue
    const tasaLocal = tasas.rates[moneda.codigo]
    if (typeof tasaLocal !== 'number') continue
    resultado[pais] = Math.round(usdMensual * tasaLocal * 100) / 100
  }
  return resultado
}

// Formatea un valor numérico crudo (ya en moneda local) guardado manualmente en precios_pais.
export function formatPrecioPais(valor: number, pais: string): string {
  const moneda = PAIS_MONEDA[pais]
  if (!moneda) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valor)
  }
  try {
    return new Intl.NumberFormat(moneda.locale, { style: 'currency', currency: moneda.codigo }).format(valor)
  } catch {
    return `${moneda.simbolo} ${valor.toLocaleString('es-CL')}`
  }
}

// Resuelve la conversión específica de un plan para el país del visitante, dando prioridad al
// precio manual fijado por el superadmin (precios_pais) o al precio_mensual_usd para países
// dolarizados. Devuelve null cuando no hay override (Chile, o país sin precio manual aún), en
// cuyo caso el llamador debe usar la conversión genérica (obtenerConversion) como respaldo.
export function conversionParaPlan(
  countryCode: string | null,
  plan: { precio_mensual: number; precio_mensual_usd: number; precios_pais?: Record<string, number> }
): ConversionInfo | null {
  const pais = (countryCode || 'CL').toUpperCase()
  if (pais === 'CL' || !plan.precio_mensual) return null

  const localeUsd = PAISES_USD[pais]
  if (localeUsd) {
    return { tipo: 'usd', codigo: 'USD', simbolo: 'US$', locale: localeUsd, factor: plan.precio_mensual_usd / plan.precio_mensual }
  }

  const valorManual = plan.precios_pais?.[pais]
  const moneda = PAIS_MONEDA[pais]
  if (moneda && typeof valorManual === 'number' && valorManual > 0) {
    return { tipo: 'local', codigo: moneda.codigo, simbolo: moneda.simbolo, locale: moneda.locale, factor: valorManual / plan.precio_mensual }
  }

  return null
}

export function formatConversion(precioClp: number, conversion: ConversionInfo): string {
  const valor = precioClp * conversion.factor
  if (conversion.tipo === 'uf') {
    return `${valor.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UF`
  }
  try {
    return new Intl.NumberFormat(conversion.locale, { style: 'currency', currency: conversion.codigo }).format(valor)
  } catch {
    return `${conversion.simbolo} ${Math.round(valor).toLocaleString('es-CL')}`
  }
}
