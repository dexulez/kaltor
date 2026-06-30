'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { generarListaPreciosPDF, type ProductoListaPrecios, type EmpresaInfo } from '@/lib/pdf/listaPrecios'
import { generarListaPreciosExcel } from '@/lib/excel/listaPrecios'

interface Props {
  productos: ProductoListaPrecios[]
  empresa: EmpresaInfo
  ivaPct?: number
}

export default function GenerarListaPreciosBtn({ productos, empresa, ivaPct = 19 }: Props) {
  const [generando, setGenerando] = useState<'pdf' | 'excel' | null>(null)
  const [incluirIva, setIncluirIva] = useState(true)
  const sinDatos = productos.length === 0
  const fecha = new Date().toISOString().split('T')[0]
  const linkAcceso = typeof window !== 'undefined' ? `${window.location.origin}/acceso-b2b` : '/acceso-b2b'

  const productosParaExportar = incluirIva
    ? productos
    : productos.map(p => ({ ...p, precio: Math.round(p.precio / (1 + ivaPct / 100)) }))

  async function handlePDF() {
    setGenerando('pdf')
    try {
      await generarListaPreciosPDF(productosParaExportar, empresa, linkAcceso, `lista_precios_mayorista_${fecha}.pdf`, incluirIva)
    } catch {
      toast.error('Error al generar el PDF')
    } finally {
      setGenerando(null)
    }
  }

  function handleExcel() {
    setGenerando('excel')
    try {
      generarListaPreciosExcel(productosParaExportar, empresa, linkAcceso, `lista_precios_mayorista_${fecha}.xlsx`, incluirIva)
    } catch {
      toast.error('Error al generar el Excel')
    } finally {
      setGenerando(null)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
        <input type="checkbox" checked={incluirIva} onChange={e => setIncluirIva(e.target.checked)} />
        Incluir IVA en los precios
      </label>
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
    </div>
  )
}
