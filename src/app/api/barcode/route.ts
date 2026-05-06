import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export interface BarcodeProducto {
  nombre: string
  descripcion?: string
  marca?: string
  modelo?: string
  categoria_sugerida?: string
  imagen_url?: string
  fuente: string
}

// ── Fuente 1: UPC Item DB (sin API key, 100 req/día gratis) ──────────────────
async function buscarUpcItemDb(codigo: string): Promise<BarcodeProducto | null> {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${codigo}`, {
      headers: { 'User-Agent': 'TechRepair-Pro/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const item = data?.items?.[0]
    if (!item?.title) return null
    return {
      nombre: item.title,
      descripcion: item.description || undefined,
      marca: item.brand || undefined,
      modelo: item.model || undefined,
      categoria_sugerida: item.category || undefined,
      imagen_url: item.images?.[0] || undefined,
      fuente: 'UPC Item DB',
    }
  } catch { return null }
}

// ── Fuente 2: Open Food Facts ─────────────────────────────────────────────────
async function buscarOpenFoodFacts(codigo: string): Promise<BarcodeProducto | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1) return null
    const p = data.product
    const nombre = p.product_name || p.product_name_es || p.generic_name
    if (!nombre) return null
    return {
      nombre,
      descripcion: p.generic_name || undefined,
      marca: p.brands || undefined,
      categoria_sugerida: p.categories?.split(',')[0]?.trim() || undefined,
      imagen_url: p.image_url || undefined,
      fuente: 'Open Food Facts',
    }
  } catch { return null }
}

// ── Fuente 3: Open Product Data (OKFN) ───────────────────────────────────────
async function buscarOpenProductData(codigo: string): Promise<BarcodeProducto | null> {
  try {
    const res = await fetch(`https://product.okfn.org/api/v0/product/${codigo}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const p = data?.product
    if (!p) return null
    const nombre = p.name || p.alias
    if (!nombre) return null
    return {
      nombre,
      descripcion: p.description || undefined,
      marca: p.manufacturer || undefined,
      fuente: 'Open Product Data',
    }
  } catch { return null }
}

// ── Fuente 4: Claude AI (fallback cuando las BDs públicas no encuentran nada) ─
const SYSTEM_PROMPT = `Eres un experto en identificación de productos a partir de códigos de barras EAN-13.

Estructura del código EAN-13:
- Primeros 2-3 dígitos: código de país del fabricante (ej: 78-79=Chile/Argentina, 84=España, 00-13=USA/Canadá, 69=China)
- Siguientes 4-5 dígitos: identificador del fabricante
- Dígitos intermedios: código específico del producto
- Último dígito: dígito de verificación (checksum)

Basándote en tu conocimiento de fabricantes, distribuidores y productos tecnológicos (accesorios, repuestos, electrónica de consumo), intenta identificar el producto.

Responde ÚNICAMENTE con un objeto JSON válido sin texto adicional ni bloques de código:
{
  "nombre": "Nombre descriptivo del producto",
  "descripcion": "Descripción breve del producto",
  "marca": "Marca o fabricante si se puede inferir",
  "modelo": "Modelo si aplica o null",
  "categoria_sugerida": "Una categoría apropiada (ej: Cable USB, Pantalla, Accesorio, Repuesto)"
}

Si no puedes identificar el producto con suficiente certeza, usa el prefijo del país para inferir el origen y proporciona un nombre genérico descriptivo.`

async function buscarConIA(codigo: string): Promise<BarcodeProducto | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // El prompt del sistema es idéntico en cada petición → cacheable
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Identifica el producto con código de barras: ${codigo}`,
        },
      ],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return null

    // Extraer JSON — Claude puede envolverlo en ```json ... ```
    const raw = textBlock.text.trim()
    const jsonStr = raw.startsWith('{')
      ? raw
      : raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    const parsed = JSON.parse(jsonStr) as Record<string, string | null>

    const nombre = parsed.nombre?.trim()
    if (!nombre) return null

    return {
      nombre,
      descripcion: parsed.descripcion?.trim() || undefined,
      marca: parsed.marca?.trim() || undefined,
      modelo: parsed.modelo?.trim() || undefined,
      categoria_sugerida: parsed.categoria_sugerida?.trim() || undefined,
      fuente: 'Claude AI',
    }
  } catch { return null }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get('codigo')?.trim()

  if (!codigo || codigo.length < 6) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  // 1. Consultar las tres fuentes públicas en paralelo
  const [r1, r2, r3] = await Promise.all([
    buscarUpcItemDb(codigo),
    buscarOpenFoodFacts(codigo),
    buscarOpenProductData(codigo),
  ])

  const resultadoPublico = r1 ?? r2 ?? r3
  if (resultadoPublico) return NextResponse.json(resultadoPublico)

  // 2. Fallback: Claude AI
  const resultadoIA = await buscarConIA(codigo)
  if (resultadoIA) return NextResponse.json(resultadoIA)

  return NextResponse.json(
    { error: 'Producto no encontrado. Ingresa los datos manualmente.' },
    { status: 404 }
  )
}
