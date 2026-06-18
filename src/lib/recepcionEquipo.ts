import type { ConfigTipoEquipo } from '@/lib/tipoEquipo'

export const MICROSD_SIZES = ['4GB', '8GB', '16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB']

const AREA_GENERICA = '__general__'

export interface AccState {
  simples: string[]
  bandejaSim: boolean
  sim: boolean
  simCantidad: 1 | 2
  sim1Carrier: string
  sim2Carrier: string
  microsd: boolean
  microsdTamano: string
  /** 0 = no incluye mando(s). */
  mandoCantidad: number
  notaLibre: string
}

export const ACC_INICIAL: AccState = {
  simples: [], bandejaSim: false, sim: false, simCantidad: 1, sim1Carrier: '', sim2Carrier: '',
  microsd: false, microsdTamano: '', mandoCantidad: 0, notaLibre: '',
}

export interface CondState {
  equipoApagado: boolean
  sinDanos: boolean
  simples: string[]
  carga: '' | 'si' | 'no_carga'
  cargaVoltios: string
  cargaAmperaje: string
  rayones: string[]
  golpes: string[]
  humedad: string[]
  quemaduras: string[]
}

export const COND_INICIAL: CondState = {
  equipoApagado: false, sinDanos: false, simples: [],
  carga: '', cargaVoltios: '', cargaAmperaje: '',
  rayones: [], golpes: [], humedad: [], quemaduras: [],
}

export function buildAccesorios(acc: AccState, config: ConfigTipoEquipo): string[] {
  const r: string[] = []
  config.accesorios.simples.forEach(label => { if (acc.simples.includes(label)) r.push(label) })

  if (config.accesorios.sim) {
    r.push(acc.bandejaSim ? 'Bandeja de SIM' : 'Sin Bandeja de SIM')
    if (acc.sim) {
      r.push(`SIM 1${acc.sim1Carrier ? `: ${acc.sim1Carrier}` : ''}`)
      if (acc.simCantidad === 2) r.push(`SIM 2${acc.sim2Carrier ? `: ${acc.sim2Carrier}` : ''}`)
    } else {
      r.push('Sin SIM card')
    }
  }

  if (config.accesorios.microsdLabel) {
    const label = config.accesorios.microsdLabel
    if (acc.microsd) r.push(acc.microsdTamano ? `${label} ${acc.microsdTamano}` : label)
    else r.push(`Sin ${label}`)
  }

  if (config.accesorios.mandoCantidad && acc.mandoCantidad > 0) {
    r.push(acc.mandoCantidad > 1 ? `Mando ×${acc.mandoCantidad}` : 'Mando')
  }

  if (config.accesorios.notaLibre && acc.notaLibre.trim()) {
    r.push(acc.notaLibre.trim())
  }

  return r
}

export function parseAccesorios(arr: string[] | null | undefined, config: ConfigTipoEquipo): AccState {
  const lista = arr ?? []
  const simples = config.accesorios.simples.filter(label => lista.includes(label))
  const sim1 = lista.find(a => a.startsWith('SIM 1'))
  const sim2 = lista.find(a => a.startsWith('SIM 2'))
  const microsdLabel = config.accesorios.microsdLabel
  const microsdEntry = microsdLabel ? lista.find(a => a.startsWith(microsdLabel) && a !== `Sin ${microsdLabel}`) : undefined
  const mandoEntry = lista.find(a => a === 'Mando' || a.startsWith('Mando ×'))

  let notaLibre = ''
  if (config.accesorios.notaLibre) {
    const conocidos = new Set(config.accesorios.simples)
    notaLibre = lista.find(a => !conocidos.has(a)) ?? ''
  }

  return {
    simples,
    bandejaSim: lista.includes('Bandeja de SIM'),
    sim: !!(sim1 || sim2),
    simCantidad: sim2 ? 2 : 1,
    sim1Carrier: sim1?.split(': ')[1] ?? '',
    sim2Carrier: sim2?.split(': ')[1] ?? '',
    microsd: !!microsdEntry,
    microsdTamano: microsdEntry && microsdLabel ? microsdEntry.slice(microsdLabel.length).trim() : '',
    mandoCantidad: mandoEntry ? (mandoEntry.includes('×') ? parseInt(mandoEntry.split('×')[1] ?? '1', 10) || 1 : 1) : 0,
    notaLibre,
  }
}

export function buildCondicion(cond: CondState, config: ConfigTipoEquipo): string[] {
  const r: string[] = []
  if (cond.equipoApagado) r.push('Equipo apagado')

  if (config.condicion.cargaPuerto) {
    if (cond.carga === 'si') {
      const v = cond.cargaVoltios.trim(); const a = cond.cargaAmperaje.trim()
      r.push(v || a ? `Carga: ${v ? v + 'V' : ''}${v && a ? ' / ' : ''}${a ? a + 'A' : ''}` : 'Carga: Sí')
    }
    if (cond.carga === 'no_carga') r.push('No carga')
  }

  if (cond.sinDanos) r.push('Sin daños visibles')
  config.condicion.simples.forEach(label => { if (cond.simples.includes(label)) r.push(label) })

  if (config.condicion.areasRayones.length > 0) {
    if (cond.rayones.length) r.push(`Rayones: ${cond.rayones.join(', ')}`)
    if (cond.golpes.length) r.push(`Golpes: ${cond.golpes.join(', ')}`)
  } else {
    if (cond.rayones.includes(AREA_GENERICA)) r.push('Rayones')
    if (cond.golpes.includes(AREA_GENERICA)) r.push('Golpes')
  }

  if (config.condicion.areasHumedad.length > 0) {
    if (cond.humedad.length) r.push(`Humedad: ${cond.humedad.join(', ')}`)
    if (cond.quemaduras.length) r.push(`Quemaduras: ${cond.quemaduras.join(', ')}`)
  } else {
    if (cond.humedad.includes(AREA_GENERICA)) r.push('Humedad')
    if (cond.quemaduras.includes(AREA_GENERICA)) r.push('Quemaduras')
  }

  return r
}

export function parseCondicion(arr: string[] | null | undefined, config: ConfigTipoEquipo): CondState {
  const lista = arr ?? []
  const cargaEntry = lista.find(a => a.startsWith('Carga:'))
  const rayEntry = lista.find(a => a.startsWith('Rayones:'))
  const golEntry = lista.find(a => a.startsWith('Golpes:'))
  const humEntry = lista.find(a => a.startsWith('Humedad:'))
  const queEntry = lista.find(a => a.startsWith('Quemaduras:'))
  const splitAreas = (e?: string) => e ? (e.split(': ')[1]?.split(',').map(s => s.trim()).filter(Boolean) ?? []) : []

  const tieneAreasRayones = config.condicion.areasRayones.length > 0
  const tieneAreasHumedad = config.condicion.areasHumedad.length > 0

  return {
    equipoApagado: lista.includes('Equipo apagado'),
    sinDanos: lista.includes('Sin daños visibles'),
    simples: config.condicion.simples.filter(label => lista.includes(label)),
    carga: lista.includes('No carga') ? 'no_carga' : cargaEntry ? 'si' : '',
    cargaVoltios: cargaEntry ? (cargaEntry.match(/(\d+[.,]?\d*)V/) ?? [])[1] ?? '' : '',
    cargaAmperaje: cargaEntry ? (cargaEntry.match(/(\d+[.,]?\d*)A/) ?? [])[1] ?? '' : '',
    rayones: tieneAreasRayones ? splitAreas(rayEntry) : (lista.includes('Rayones') ? [AREA_GENERICA] : []),
    golpes: tieneAreasRayones ? splitAreas(golEntry) : (lista.includes('Golpes') ? [AREA_GENERICA] : []),
    humedad: tieneAreasHumedad ? splitAreas(humEntry) : (lista.includes('Humedad') ? [AREA_GENERICA] : []),
    quemaduras: tieneAreasHumedad ? splitAreas(queEntry) : (lista.includes('Quemaduras') ? [AREA_GENERICA] : []),
  }
}
