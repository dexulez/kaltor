'use client'

import { jsPDF } from 'jspdf'
import { Button } from '@/components/ui/button'

type MetodoResumen = {
  metodo: string
  cantidad: number
  total: number
}

interface Props {
  fechaDesde: string
  fechaHasta: string
  totalVentas: number
  cantidadVentas: number
  ticketPromedio: number
  totalCompras: number
  resumenMetodos: MetodoResumen[]
  reparacionesPorEstado: Record<string, number>
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

function downloadFile(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function InformesExportActions({
  fechaDesde,
  fechaHasta,
  totalVentas,
  cantidadVentas,
  ticketPromedio,
  totalCompras,
  resumenMetodos,
  reparacionesPorEstado,
}: Props) {
  function exportCSV() {
    const lines: string[] = []
    lines.push(`Rango,${fechaDesde} a ${fechaHasta}`)
    lines.push('')
    lines.push('Resumen,Valor')
    lines.push(`Ventas totales,${totalVentas}`)
    lines.push(`Cantidad ventas,${cantidadVentas}`)
    lines.push(`Ticket promedio,${ticketPromedio}`)
    lines.push(`Compras totales,${totalCompras}`)
    lines.push('')
    lines.push('Ventas por metodo,Cantidad,Total')
    resumenMetodos.forEach((m) => {
      lines.push(`${m.metodo},${m.cantidad},${m.total}`)
    })
    lines.push('')
    lines.push('Reparaciones por estado,Cantidad')
    Object.entries(reparacionesPorEstado).forEach(([estado, cantidad]) => {
      lines.push(`${estado},${cantidad}`)
    })

    downloadFile(`informe_${fechaDesde}_${fechaHasta}.csv`, lines.join('\n'), 'text/csv;charset=utf-8;')
  }

  function exportPDF() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const marginLeft = 40
    let y = 50

    doc.setFontSize(16)
    doc.text('Informe de gestión', marginLeft, y)

    y += 22
    doc.setFontSize(10)
    doc.text(`Rango: ${fechaDesde} a ${fechaHasta}`, marginLeft, y)

    y += 24
    doc.setFontSize(12)
    doc.text('Resumen general', marginLeft, y)
    y += 16
    doc.setFontSize(10)
    doc.text(`Ventas totales: ${formatCLP(totalVentas)}`, marginLeft, y)
    y += 14
    doc.text(`Cantidad de ventas: ${cantidadVentas}`, marginLeft, y)
    y += 14
    doc.text(`Ticket promedio: ${formatCLP(ticketPromedio)}`, marginLeft, y)
    y += 14
    doc.text(`Compras totales: ${formatCLP(totalCompras)}`, marginLeft, y)

    y += 24
    doc.setFontSize(12)
    doc.text('Ventas por método', marginLeft, y)
    y += 16
    doc.setFontSize(10)
    resumenMetodos.forEach((m) => {
      doc.text(`${m.metodo}: ${m.cantidad} transacciones — ${formatCLP(m.total)}`, marginLeft, y)
      y += 14
    })

    y += 12
    doc.setFontSize(12)
    doc.text('Reparaciones por estado', marginLeft, y)
    y += 16
    doc.setFontSize(10)
    Object.entries(reparacionesPorEstado).forEach(([estado, cantidad]) => {
      doc.text(`${estado.replaceAll('_', ' ')}: ${cantidad}`, marginLeft, y)
      y += 14
    })

    doc.save(`informe_${fechaDesde}_${fechaHasta}.pdf`)
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" onClick={exportCSV}>Exportar CSV</Button>
      <Button type="button" variant="outline" onClick={exportPDF}>Exportar PDF</Button>
    </div>
  )
}
