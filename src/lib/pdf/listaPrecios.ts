import { jsPDF } from 'jspdf'
import { calcularPrecioMayoristaConDescuento, formatCLP } from '@/lib/calculations'

export interface ProductoListaPrecios {
  nombre: string
  sku: string | null
  categoria: string | null
  precio: number
  descuentoTipo?: 'porcentaje' | 'monto' | null
  descuentoValor?: number | null
  descuentoDesdeCantidad?: number | null
}

export interface EmpresaInfo {
  nombreLocal: string
  rut?: string | null
  direccion?: string | null
  telefono?: string | null
  logoUrl?: string | null
}

const MARGEN = 36
const ALTO_FILA = 16
const FOOTER_ESPACIO = 34

function ofertaTexto(p: ProductoListaPrecios): string {
  if (!p.descuentoValor || p.descuentoValor <= 0) return '—'
  const desde = p.descuentoDesdeCantidad ?? 1
  const precioFinal = calcularPrecioMayoristaConDescuento(p.precio, desde, {
    tipo: p.descuentoTipo, valor: p.descuentoValor, desdeCantidad: p.descuentoDesdeCantidad,
  })
  return `${desde}+ unid.: ${formatCLP(precioFinal)} c/u`
}

async function cargarLogoBase64(url: string): Promise<{ dataUrl: string; formato: 'PNG' | 'JPEG' } | null> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const formato = blob.type.includes('png') ? 'PNG' as const : 'JPEG' as const
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    return { dataUrl, formato }
  } catch {
    return null
  }
}

export async function generarListaPreciosPDF(
  productos: ProductoListaPrecios[],
  empresa: EmpresaInfo,
  linkAcceso: string,
  filename: string,
  incluyeIva: boolean = true
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const anchoUtil = pageWidth - MARGEN * 2

  const logo = empresa.logoUrl ? await cargarLogoBase64(empresa.logoUrl) : null

  function dibujarFooter() {
    const nPagina = doc.getCurrentPageInfo().pageNumber
    doc.setFontSize(7.5)
    doc.setTextColor(130)
    doc.text(`Accede al sistema: ${linkAcceso}`, MARGEN, pageHeight - 16)
    doc.text(`Página ${nPagina}`, pageWidth - MARGEN, pageHeight - 16, { align: 'right' })
    doc.setTextColor(0)
  }

  function dibujarEncabezadoPagina() {
    let y = MARGEN
    if (logo) {
      try { doc.addImage(logo.dataUrl, logo.formato, MARGEN, y - 8, 50, 50) } catch { /* logo inválido, se omite */ }
    }
    const xTexto = logo ? MARGEN + 62 : MARGEN
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(empresa.nombreLocal, xTexto, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100)
    const lineas = [empresa.rut, empresa.direccion, empresa.telefono].filter(Boolean) as string[]
    lineas.forEach((linea, i) => doc.text(linea, xTexto, y + 22 + i * 11))
    doc.setTextColor(0)
    y += Math.max(50, 22 + lineas.length * 11) + 8

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Lista de precios — Mayorista (B2B)', MARGEN, y)
    doc.setFont('helvetica', 'normal')
    y += 14
    doc.setFontSize(8.5)
    doc.setTextColor(90)
    doc.text(`Vigente al ${new Date().toLocaleDateString('es-CL')} · Precios ${incluyeIva ? 'con IVA incluido' : 'netos (sin IVA)'} en CLP, sujetos a confirmación al cotizar`, MARGEN, y)
    doc.setTextColor(0)
    y += 10

    doc.setDrawColor(200)
    doc.line(MARGEN, y + 6, pageWidth - MARGEN, y + 6)
    return y + 22
  }

  const headers = ['Producto', 'SKU', 'Precio', 'Oferta por cantidad']
  const pesos = [4, 1.6, 1.4, 2.4]
  const pesoTotal = pesos.reduce((a, b) => a + b, 0)
  const anchosCols = pesos.map(p => (p / pesoTotal) * anchoUtil)
  const posXCols: number[] = []
  let acc = MARGEN
  anchosCols.forEach(w => { posXCols.push(acc); acc += w })

  let y = dibujarEncabezadoPagina()

  function dibujarEncabezadoTabla() {
    doc.setFillColor(241, 245, 249)
    doc.rect(MARGEN, y - 11, anchoUtil, ALTO_FILA, 'F')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    headers.forEach((h, i) => doc.text(h, posXCols[i] + 4, y, { maxWidth: anchosCols[i] - 8 }))
    doc.setFont('helvetica', 'normal')
    y += ALTO_FILA
  }

  function asegurarEspacio(necesario: number) {
    if (y + necesario > pageHeight - FOOTER_ESPACIO) {
      dibujarFooter()
      doc.addPage()
      y = dibujarEncabezadoPagina()
    }
  }

  const categorias = [...new Set(productos.map(p => p.categoria ?? 'Sin categoría'))].sort()

  categorias.forEach(cat => {
    const items = productos.filter(p => (p.categoria ?? 'Sin categoría') === cat).sort((a, b) => a.nombre.localeCompare(b.nombre))
    if (items.length === 0) return

    asegurarEspacio(40)
    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 64, 175)
    doc.text(cat, MARGEN, y)
    doc.setTextColor(0)
    doc.setFont('helvetica', 'normal')
    y += 13

    dibujarEncabezadoTabla()

    doc.setFontSize(8.5)
    items.forEach(p => {
      asegurarEspacio(ALTO_FILA)
      doc.text(p.nombre, posXCols[0] + 4, y, { maxWidth: anchosCols[0] - 8 })
      doc.text(p.sku || '—', posXCols[1] + 4, y, { maxWidth: anchosCols[1] - 8 })
      doc.text(formatCLP(p.precio), posXCols[2] + 4, y, { maxWidth: anchosCols[2] - 8 })
      doc.text(ofertaTexto(p), posXCols[3] + 4, y, { maxWidth: anchosCols[3] - 8 })
      y += ALTO_FILA
    })
    y += 14
  })

  dibujarFooter()
  doc.save(filename)
}
