'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { generarListaPreciosPDF, type ProductoListaPrecios, type EmpresaInfo } from '@/lib/pdf/listaPrecios'
import { generarListaPreciosExcel } from '@/lib/excel/listaPrecios'

interface Props {
  productos: ProductoListaPrecios[]
  empresa: EmpresaInfo
}

export default function GenerarListaPreciosBtn({ productos, empresa }: Props) {
  const [generando, setGenerando] = useState<'pdf' | 'excel' | null>(null)
  const sinDatos = productos.length === 0
  const fecha = new Date().toISOString().split('T')[0]
  const linkAcceso = typeof window !== 'undefined' ? `${window.location.origin}/acceso-b2b` : '/acceso-b2b'

  async function handlePDF() {
    setGenerando('pdf')
    try {
      await generarListaPreciosPDF(productos, empresa, linkAcceso, `lista_precios_mayorista_${fecha}.pdf`)
    } catch {
      toast.error('Error al generar el PDF')
    } finally {
      setGenerando(null)
    }
  }

  function handleExcel() {
    setGenerando('excel')
    try {
      generarListaPreciosExcel(productos, empresa, linkAcceso, `lista_precios_mayorista_${fecha}.xlsx`)
    } catch {
      toast.error('Error al generar el Excel')
    } finally {
      setGenerando(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        type="button" disabled={sinDatos || generando !== null} onClick={handleExcel}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium px-3 py-2 transition-colors disabled:opacity-50"
      >
        {generando === 'excel' ? 'Generando…' : '📊 Lista de precios (Excel)'}
      </button>
      <button
        type="button" disabled={sinDatos || generando !== null} onClick={handlePDF}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium px-3 py-2 transition-colors disabled:opacity-50"
      >
        {generando === 'pdf' ? 'Generando…' : '📄 Lista de precios (PDF)'}
      </button>
    </div>
  )
}
