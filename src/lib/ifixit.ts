// Integración de solo lectura con la API pública de iFixit (sin API key).
// Docs: https://www.ifixit.com/api/2.0/doc/

const IFIXIT_API = 'https://www.ifixit.com/api/2.0'

// La búsqueda de iFixit no expande abreviaturas comunes (ej: "PS3" no
// encuentra nada, hay que buscar "PlayStation 3"). Cubrimos los casos más
// frecuentes para consolas/equipos típicos de un taller.
const ABREVIATURAS: Record<string, string> = {
  ps1: 'PlayStation 1', ps2: 'PlayStation 2', ps3: 'PlayStation 3',
  ps4: 'PlayStation 4', ps5: 'PlayStation 5', psp: 'PlayStation Portable',
  xbox360: 'Xbox 360', xboxone: 'Xbox One',
}

function expandirAbreviaturas(query: string): string {
  return query
    .split(/\s+/)
    .map(palabra => ABREVIATURAS[palabra.toLowerCase().replace(/\s+/g, '')] ?? palabra)
    .join(' ')
}

export interface ResultadoIFixit {
  tipo: 'guide' | 'wiki'
  /** Solo presente cuando tipo === 'guide'. */
  guideid?: number
  titulo: string
  categoria: string
  subject: string | null
  dificultad: string | null
  /** Solo presente cuando tipo === 'wiki' (resumen de la página del equipo/parte). */
  resumen: string | null
  url: string
  imagen: string | null
}

interface ResultadoBusquedaIFixit {
  dataType?: string
  guideid?: number
  title?: string
  category?: string
  namespace?: string
  subject?: string
  difficulty?: string
  summary?: string
  text?: string
  url?: string
  image?: { thumbnail?: string; standard?: string; medium?: string }
}

function mapearResultado(r: ResultadoBusquedaIFixit): ResultadoIFixit {
  const esGuia = r.dataType === 'guide'
  return {
    tipo: esGuia ? 'guide' : 'wiki',
    guideid: esGuia ? r.guideid : undefined,
    titulo: r.title ?? 'Sin título',
    categoria: r.category ?? r.namespace ?? '',
    subject: r.subject ?? null,
    dificultad: r.difficulty ?? null,
    resumen: esGuia ? null : (r.summary || r.text || null),
    url: r.url ?? (esGuia ? `https://www.ifixit.com/Guide/-/${r.guideid}` : ''),
    imagen: r.image?.medium ?? r.image?.standard ?? r.image?.thumbnail ?? null,
  }
}

async function ejecutarBusqueda(query: string, limite: number): Promise<ResultadoIFixit[]> {
  try {
    const url = `${IFIXIT_API}/search/${encodeURIComponent(query)}?limit=${limite}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json() as { results?: ResultadoBusquedaIFixit[] }
    return (data.results ?? [])
      .filter(r => (r.dataType === 'guide' && r.guideid) || (r.dataType === 'wiki' && r.url))
      .map(mapearResultado)
  } catch {
    return []
  }
}

/**
 * Busca guías y páginas de equipo en iFixit. Reintenta automáticamente con
 * abreviaturas expandidas y sin la primera palabra (a menudo la marca, que
 * en la API de iFixit reduce demasiado los resultados) y combina todo lo
 * encontrado, mostrando primero las guías paso a paso.
 */
export async function buscarIFixit(query: string, limite = 12): Promise<ResultadoIFixit[]> {
  const limpio = query.trim()
  if (!limpio) return []

  const variantes = new Set<string>([limpio])
  const expandido = expandirAbreviaturas(limpio)
  variantes.add(expandido)
  const palabras = expandido.split(/\s+/)
  if (palabras.length > 2) variantes.add(palabras.slice(1).join(' '))

  const resultadosPorVariante = await Promise.all([...variantes].map(v => ejecutarBusqueda(v, limite)))

  const vistos = new Set<string>()
  const combinados: ResultadoIFixit[] = []
  for (const lista of resultadosPorVariante) {
    for (const r of lista) {
      if (vistos.has(r.url)) continue
      vistos.add(r.url)
      combinados.push(r)
    }
  }
  combinados.sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'guide' ? -1 : 1))
  return combinados.slice(0, limite)
}

interface LineaPasoIFixit {
  text_raw?: string
  text_rendered?: string
}

interface PasoIFixit {
  title?: string
  lines?: LineaPasoIFixit[]
  media?: { standard?: string }
}

interface ParteIFixit {
  text?: string
  quantity?: number
}

export interface GuiaIFixitDetalle {
  guideid: number
  title?: string
  category?: string
  subject?: string
  difficulty?: string
  introduction_rendered?: string
  conclusion_rendered?: string
  image?: { standard?: string; medium?: string }
  tools?: ParteIFixit[]
  parts?: ParteIFixit[]
  steps?: PasoIFixit[]
}

export async function obtenerGuiaIFixit(guideid: number): Promise<GuiaIFixitDetalle> {
  const res = await fetch(`${IFIXIT_API}/guides/${guideid}`, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`iFixit respondió con estado ${res.status}`)
  return res.json()
}

/** Conversión básica de HTML (campos "_rendered" de iFixit) a texto/markdown simple. */
function htmlATexto(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface ManualPrellenado {
  titulo: string
  contenido: string
  archivos: string[]
  tags: string[]
  fuenteUrl: string
}

function aEsIFixit(url: string): string {
  return url.replace('www.ifixit.com', 'es.ifixit.com')
}

/** Construye el contenido en Markdown (compatible con ManualContenido.tsx) a partir de una guía de iFixit. */
export function guiaAManualPrellenado(guia: GuiaIFixitDetalle, urlOriginal?: string): ManualPrellenado {
  const secciones: string[] = []

  const intro = htmlATexto(guia.introduction_rendered)
  if (intro) secciones.push(`## Introducción\n${intro}`)

  if (guia.tools?.length) {
    secciones.push(`## Herramientas\n${guia.tools.map(t => `- ${t.text}${(t.quantity ?? 1) > 1 ? ` ×${t.quantity}` : ''}`).join('\n')}`)
  }
  if (guia.parts?.length) {
    secciones.push(`## Repuestos\n${guia.parts.map(p => `- ${p.text}${(p.quantity ?? 1) > 1 ? ` ×${p.quantity}` : ''}`).join('\n')}`)
  }

  ;(guia.steps ?? []).forEach((paso, i) => {
    const texto = (paso.lines ?? [])
      .map(l => htmlATexto(l.text_rendered ?? l.text_raw))
      .filter(Boolean)
      .map(t => `- ${t}`)
      .join('\n')
    secciones.push(`## Paso ${i + 1}${paso.title ? `: ${paso.title}` : ''}\n${texto || '_(sin descripción)_'}`)
  })

  const conclusion = htmlATexto(guia.conclusion_rendered)
  if (conclusion) secciones.push(`## Para terminar\n${conclusion}`)

  const fuenteUrl = aEsIFixit(urlOriginal || `https://www.ifixit.com/Guide/-/${guia.guideid}`)
  secciones.push(`---\n_Importado desde [iFixit](${fuenteUrl})._`)

  const archivos = [
    guia.image?.standard ?? guia.image?.medium,
    ...(guia.steps ?? []).map(p => p.media?.standard),
  ].filter((u): u is string => !!u)

  return {
    titulo: guia.title ?? guia.subject ?? 'Guía importada de iFixit',
    contenido: secciones.join('\n\n'),
    archivos: [...new Set(archivos)].slice(0, 12),
    tags: [...new Set([guia.subject, guia.category].filter((t): t is string => !!t).map(t => t.toLowerCase()))],
    fuenteUrl,
  }
}

/** Versión ligera de prellenado para resultados tipo "wiki" (páginas de equipo/parte, sin pasos estructurados). */
export function wikiAManualPrellenado(resultado: { titulo: string; resumen: string | null; imagen: string | null; url: string }): ManualPrellenado {
  const fuenteUrl = aEsIFixit(resultado.url)
  const cuerpo = resultado.resumen?.trim() || '_Esta página de iFixit no tenía un resumen disponible — revisa el link original._'

  return {
    titulo: resultado.titulo,
    contenido: `${cuerpo}\n\n---\n_Importado desde [iFixit](${fuenteUrl})._`,
    archivos: resultado.imagen ? [resultado.imagen] : [],
    tags: [],
    fuenteUrl,
  }
}
