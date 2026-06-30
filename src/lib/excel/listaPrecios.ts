import * as XLSX from 'xlsx'
import { calcularPrecioMayoristaConDescuento, formatCLP } from '@/lib/calculations'
import type { ProductoListaPrecios, EmpresaInfo } from '@/lib/pdf/listaPrecios'

function ofertaTexto(p: ProductoListaPrecios): string {
  if (!p.descuentoValor || p.descuentoValor <= 0) return ''
  const desde = p.descuentoDesdeCantidad ?? 1
  const precioFinal = calcularPrecioMayoristaConDescuento(p.precio, desde, {
    tipo: p.descuentoTipo, valor: p.descuentoValor, desdeCantidad: p.descuentoDesdeCantidad,
  })
  return `Desde ${desde} unid.: ${formatCLP(precioFinal)} c/u`
}

export function generarListaPreciosExcel(
  productos: ProductoListaPrecios[],
  empresa: EmpresaInfo,
  linkAcceso: string,
  filename: string,
  incluyeIva: boolean = true
) {
  const wb = XLSX.utils.book_new()

  const portada = [
    [empresa.nombreLocal],
    [empresa.rut ?? ''],
    [empresa.direccion ?? ''],
    [empresa.telefono ?? ''],
    [],
    ['Lista de precios mayorista (B2B)'],
    [`Vigente al ${new Date().toLocaleDateString('es-CL')} — precios ${incluyeIva ? 'con IVA incluido' : 'netos (sin IVA)'} en CLP, sujetos a confirmación al cotizar`],
    [],
    ['Accede al sistema:', linkAcceso],
  ].filter(row => row.length === 0 || row.some(c => c !== ''))
  const wsPortada = XLSX.utils.aoa_to_sheet(portada)
  wsPortada['!cols'] = [{ wch: 35 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsPortada, 'Portada')

  const categorias = [...new Set(productos.map(p => p.categoria ?? 'Sin categoría'))].sort()
  categorias.forEach(cat => {
    const items = productos.filter(p => (p.categoria ?? 'Sin categoría') === cat).sort((a, b) => a.nombre.localeCompare(b.nombre))
    if (items.length === 0) return
    const headers = ['Producto', 'SKU', `Precio mayorista (CLP${incluyeIva ? ', IVA incluido' : ', neto sin IVA'})`, 'Oferta por cantidad']
    const rows = items.map(p => [p.nombre, p.sku ?? '', p.precio, ofertaTexto(p)])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [{ wch: 40 }, { wch: 16 }, { wch: 18 }, { wch: 28 }]
    const nombreHoja = cat.replace(/[\\/?*[\]]/g, ' ').slice(0, 31) || 'Categoría'
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja)
  })

  XLSX.writeFile(wb, filename)
}
