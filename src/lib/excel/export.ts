import * as XLSX from 'xlsx'

export type CeldaExcel = string | number | boolean | null | undefined

export interface HojaExcel {
  nombre: string
  headers: string[]
  rows: CeldaExcel[][]
}

function anchoColumna(header: string, rows: CeldaExcel[][], col: number): number {
  const maxLen = rows.reduce((max, row) => {
    const len = String(row[col] ?? '').length
    return len > max ? len : max
  }, header.length)
  return Math.min(Math.max(maxLen + 2, 10), 45)
}

/** Genera un archivo .xlsx con una o más hojas y dispara la descarga en el navegador. */
export function exportarExcel(hojas: HojaExcel[], filename: string) {
  const wb = XLSX.utils.book_new()

  hojas.forEach(hoja => {
    const data = [hoja.headers, ...hoja.rows]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = hoja.headers.map((h, i) => ({ wch: anchoColumna(h, hoja.rows, i) }))
    const nombreHoja = hoja.nombre.replace(/[\\/?*[\]]/g, ' ').slice(0, 31) || 'Hoja'
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja)
  })

  XLSX.writeFile(wb, filename)
}
