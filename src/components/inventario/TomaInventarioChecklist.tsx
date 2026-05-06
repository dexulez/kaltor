'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

interface ProductoToma {
  id: string
  nombre: string
  sku: string | null
  stock_actual: number
  stock_minimo: number
  categoria_nombre: string
}

interface Props {
  productos: ProductoToma[]
}

function escapeCsv(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value)
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csvContent = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function TomaInventarioChecklist({ productos }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [stockReal, setStockReal] = useState<Record<string, string>>({})

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return productos
    return productos.filter((producto) =>
      producto.nombre.toLowerCase().includes(term)
      || (producto.sku ?? '').toLowerCase().includes(term)
      || producto.categoria_nombre.toLowerCase().includes(term)
    )
  }, [productos, busqueda])

  const resumen = useMemo(() => {
    let conConteo = 0
    let exactos = 0
    let sobrante = 0
    let faltante = 0

    for (const producto of filtrados) {
      const valor = stockReal[producto.id]
      if (valor == null || valor === '') continue

      const real = Number(valor)
      if (Number.isNaN(real)) continue

      conConteo++
      const diferencia = real - producto.stock_actual
      if (diferencia === 0) exactos++
      else if (diferencia > 0) sobrante++
      else faltante++
    }

    return { conConteo, exactos, sobrante, faltante }
  }, [filtrados, stockReal])

  function descargarChecklistBase() {
    const rows: (string | number)[][] = [
      ['Producto', 'SKU', 'Categoría', 'Stock sistema', 'Stock real', 'Diferencia', 'Observación'],
      ...filtrados.map((producto) => [
        producto.nombre,
        producto.sku ?? '',
        producto.categoria_nombre,
        producto.stock_actual,
        '',
        '',
        '',
      ]),
    ]

    const fecha = new Date().toISOString().slice(0, 10)
    downloadCsv(`checklist-inventario-${fecha}.csv`, rows)
  }

  function descargarComparacion() {
    const rows: (string | number)[][] = [
      ['Producto', 'SKU', 'Categoría', 'Stock sistema', 'Stock real', 'Diferencia', 'Estado'],
      ...filtrados.map((producto) => {
        const realRaw = stockReal[producto.id]
        const real = realRaw === '' || realRaw == null ? null : Number(realRaw)
        const diferencia = real == null || Number.isNaN(real) ? '' : real - producto.stock_actual
        const estado = diferencia === ''
          ? 'Sin conteo'
          : diferencia === 0
            ? 'Cuadra'
            : diferencia > 0
              ? 'Sobrante'
              : 'Faltante'

        return [
          producto.nombre,
          producto.sku ?? '',
          producto.categoria_nombre,
          producto.stock_actual,
          real ?? '',
          diferencia,
          estado,
        ]
      }),
    ]

    const fecha = new Date().toISOString().slice(0, 10)
    downloadCsv(`comparacion-inventario-${fecha}.csv`, rows)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3">
        <input
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por producto, SKU o categoría..."
          className="border rounded-lg px-3 py-2 text-sm w-72 max-w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-2 flex-wrap">
          <Button type="button" variant="outline" onClick={descargarChecklistBase}>
            ⬇️ Checklist base
          </Button>
          <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={descargarComparacion}>
            ⬇️ Comparación actual
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-gray-500">Productos</p>
          <p className="text-xl font-bold text-gray-900">{filtrados.length}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-gray-500">Contados</p>
          <p className="text-xl font-bold text-blue-700">{resumen.conConteo}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-gray-500">Cuadran</p>
          <p className="text-xl font-bold text-green-700">{resumen.exactos}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-gray-500">Sobrante</p>
          <p className="text-xl font-bold text-cyan-700">{resumen.sobrante}</p>
        </div>
        <div className="bg-white border rounded-xl p-3">
          <p className="text-xs text-gray-500">Faltante</p>
          <p className="text-xl font-bold text-rose-700">{resumen.faltante}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Stock sistema</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Stock real</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Diferencia</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No hay productos para mostrar</td>
              </tr>
            ) : filtrados.map((producto) => {
              const realRaw = stockReal[producto.id] ?? ''
              const real = realRaw === '' ? null : Number(realRaw)
              const diferencia = real == null || Number.isNaN(real) ? null : real - producto.stock_actual

              const estado = diferencia == null
                ? 'Sin conteo'
                : diferencia === 0
                  ? 'Cuadra'
                  : diferencia > 0
                    ? 'Sobrante'
                    : 'Faltante'

              const estadoClass = diferencia == null
                ? 'text-gray-500'
                : diferencia === 0
                  ? 'text-green-700'
                  : diferencia > 0
                    ? 'text-cyan-700'
                    : 'text-rose-700'

              return (
                <tr key={producto.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{producto.nombre}</p>
                    <p className="text-xs text-gray-400">{producto.sku ?? 'Sin SKU'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{producto.categoria_nombre}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{producto.stock_actual}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      value={realRaw}
                      onChange={(event) => setStockReal((prev) => ({ ...prev, [producto.id]: event.target.value }))}
                      className="w-24 border rounded-md px-2 py-1 text-right"
                    />
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${estadoClass}`}>
                    {diferencia == null ? '—' : diferencia > 0 ? `+${diferencia}` : `${diferencia}`}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium ${estadoClass}`}>{estado}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
