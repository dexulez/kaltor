'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { exportarExcel, type CeldaExcel } from '@/lib/excel/export'
import { exportarPDF, type CeldaPdf } from '@/lib/pdf/export'

export interface SeccionExportable {
  /** Título de la sección (PDF) / nombre de hoja (Excel). */
  titulo: string
  headers: string[]
  rows: (CeldaExcel & CeldaPdf)[][]
  anchosPdf?: number[]
}

interface Props {
  /** Título mostrado en el PDF y usado como base del nombre de archivo. */
  titulo: string
  subtitulo?: string
  secciones: SeccionExportable[]
  orientacionPdf?: 'portrait' | 'landscape'
  className?: string
  visible?: boolean
}

const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')

function slug(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(DIACRITICOS, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export default function ExportButtons({ titulo, subtitulo, secciones, orientacionPdf, className, visible = true }: Props) {
  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null)
  const sinDatos = secciones.every(s => s.rows.length === 0)
  const base = slug(titulo) || 'informe'

  if (!visible) return null

  function handleExcel() {
    setExportando('excel')
    try {
      exportarExcel(
        secciones.map(s => ({ nombre: s.titulo, headers: s.headers, rows: s.rows })),
        `${base}_${new Date().toISOString().split('T')[0]}.xlsx`
      )
    } finally {
      setExportando(null)
    }
  }

  function handlePDF() {
    setExportando('pdf')
    try {
      exportarPDF(
        {
          titulo,
          subtitulo,
          orientacion: orientacionPdf,
          secciones: secciones.map(s => ({ titulo: s.titulo, headers: s.headers, rows: s.rows, anchos: s.anchosPdf })),
        },
        `${base}_${new Date().toISOString().split('T')[0]}.pdf`
      )
    } finally {
      setExportando(null)
    }
  }

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      <Button type="button" variant="outline" size="sm" disabled={sinDatos || exportando !== null} onClick={handleExcel}>
        {exportando === 'excel' ? 'Generando…' : '📊 Excel'}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={sinDatos || exportando !== null} onClick={handlePDF}>
        {exportando === 'pdf' ? 'Generando…' : '📄 PDF'}
      </Button>
    </div>
  )
}
