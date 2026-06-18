import { jsPDF } from 'jspdf'

export type CeldaPdf = string | number | boolean | null | undefined

export interface SeccionPdf {
  titulo?: string
  headers: string[]
  rows: CeldaPdf[][]
  /** Pesos relativos del ancho de cada columna (se normalizan). Por defecto, todas iguales. */
  anchos?: number[]
}

export interface ReportePdfOptions {
  titulo: string
  subtitulo?: string
  secciones: SeccionPdf[]
  orientacion?: 'portrait' | 'landscape'
}

const MARGEN = 36
const ALTO_FILA = 14
const FOOTER_ESPACIO = 30

function celdaTexto(valor: CeldaPdf): string {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  return String(valor)
}

/** Genera un PDF con una o más secciones tabulares, con paginación automática, y dispara la descarga. */
export function exportarPDF(opts: ReportePdfOptions, filename: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: opts.orientacion ?? 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const anchoUtil = pageWidth - MARGEN * 2
  let y = MARGEN + 10

  function saltarPagina() {
    doc.addPage()
    y = MARGEN + 10
  }

  function asegurarEspacio(necesario: number) {
    if (y + necesario > pageHeight - FOOTER_ESPACIO) saltarPagina()
  }

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.titulo, MARGEN, y)
  doc.setFont('helvetica', 'normal')
  y += 20

  if (opts.subtitulo) {
    doc.setFontSize(9)
    doc.setTextColor(110)
    doc.text(opts.subtitulo, MARGEN, y)
    doc.setTextColor(0)
    y += 18
  }

  opts.secciones.forEach(seccion => {
    const nCols = seccion.headers.length
    if (nCols === 0) return

    const pesos = seccion.anchos && seccion.anchos.length === nCols ? seccion.anchos : seccion.headers.map(() => 1)
    const pesoTotal = pesos.reduce((a, b) => a + b, 0)
    const anchosCols = pesos.map(p => (p / pesoTotal) * anchoUtil)
    const posXCols: number[] = []
    let acc = MARGEN
    anchosCols.forEach(w => { posXCols.push(acc); acc += w })

    asegurarEspacio(40)

    if (seccion.titulo) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(seccion.titulo, MARGEN, y)
      doc.setFont('helvetica', 'normal')
      y += 14
    }

    function dibujarEncabezado() {
      doc.setFillColor(241, 245, 249)
      doc.rect(MARGEN, y - 9, anchoUtil, ALTO_FILA, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      seccion.headers.forEach((h, i) => {
        doc.text(h, posXCols[i] + 3, y, { maxWidth: anchosCols[i] - 6 })
      })
      doc.setFont('helvetica', 'normal')
      y += ALTO_FILA
    }

    dibujarEncabezado()

    if (seccion.rows.length === 0) {
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text('Sin datos', MARGEN + 3, y)
      doc.setTextColor(0)
      y += ALTO_FILA
    } else {
      doc.setFontSize(8)
      seccion.rows.forEach(row => {
        asegurarEspacio(ALTO_FILA)
        if (y === MARGEN + 10) dibujarEncabezado()
        row.forEach((cell, i) => {
          doc.text(celdaTexto(cell), posXCols[i] + 3, y, { maxWidth: anchosCols[i] - 6 })
        })
        y += ALTO_FILA
      })
    }

    y += 16
  })

  doc.save(filename)
}
