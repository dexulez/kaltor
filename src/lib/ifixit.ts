// Integración de solo lectura con la API pública de iFixit (sin API key).
// Docs: https://www.ifixit.com/api/2.0/doc/

const IFIXIT_API = 'https://www.ifixit.com/api/2.0'

export interface GuiaIFixitResumen {
  guideid: number
  titulo: string
  categoria: string
  subject: string | null
  dificultad: string | null
  url: string
  imagen: string | null
}

interface ResultadoBusquedaIFixit {
  dataType?: string
  guideid?: number
  title?: string
  category?: string
  subject?: string
  difficulty?: string
  url?: string
  image?: { thumbnail?: string; standard?: string; medium?: string }
}

/** Busca guías de reparación en iFixit. Solo devuelve resultados de tipo "guide". */
export async function buscarGuiasIFixit(query: string, limite = 12): Promise<GuiaIFixitResumen[]> {
  const url = `${IFIXIT_API}/search/${encodeURIComponent(query)}?limit=${limite}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`iFixit respondió con estado ${res.status}`)

  const data = await res.json() as { results?: ResultadoBusquedaIFixit[] }
  return (data.results ?? [])
    .filter((r): r is ResultadoBusquedaIFixit & { guideid: number } => r.dataType === 'guide' && typeof r.guideid === 'number')
    .map(r => ({
      guideid: r.guideid,
      titulo: r.title ?? 'Guía sin título',
      categoria: r.category ?? '',
      subject: r.subject ?? null,
      dificultad: r.difficulty ?? null,
      url: r.url ?? `https://www.ifixit.com/Guide/-/${r.guideid}`,
      imagen: r.image?.medium ?? r.image?.standard ?? r.image?.thumbnail ?? null,
    }))
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

  const fuenteUrl = (urlOriginal || `https://www.ifixit.com/Guide/-/${guia.guideid}`).replace('www.ifixit.com', 'es.ifixit.com')
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
