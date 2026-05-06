import { NextRequest, NextResponse } from 'next/server'

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

// ── Fuente 2: Open Food Facts (productos de consumo con barcode) ──────────────
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

export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get('codigo')?.trim()

  if (!codigo || codigo.length < 6) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  // Consultar las tres fuentes en paralelo, usar la primera que responda
  const [r1, r2, r3] = await Promise.all([
    buscarUpcItemDb(codigo),
    buscarOpenFoodFacts(codigo),
    buscarOpenProductData(codigo),
  ])

  const resultado = r1 ?? r2 ?? r3

  if (!resultado) {
    return NextResponse.json(
      { error: 'Producto no encontrado en las bases de datos públicas' },
      { status: 404 }
    )
  }

  return NextResponse.json(resultado)
}
