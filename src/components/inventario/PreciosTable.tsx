'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/calculations'
import Link from 'next/link'

interface Producto {
  id: string
  nombre: string
  sku: string | null
  precio_costo: number
  costo_envio: number
  precio_venta: number
  precio_incluye_iva: boolean
  stock_actual: number
  product_categories: { nombre: string } | null
}

function calcular(p: { precio_costo: number; costo_envio: number; precio_venta: number; precio_incluye_iva: boolean; stock_actual: number }) {
  const costoReal = (p.precio_costo ?? 0) + (p.costo_envio ?? 0)
  const precioNeto = p.precio_incluye_iva ? Math.round((p.precio_venta ?? 0) / 1.19) : (p.precio_venta ?? 0)
  const utilidadUnit = precioNeto - costoReal
  const margen = costoReal > 0 ? Math.round((utilidadUnit / costoReal) * 100) : 0
  const utilidadTotal = utilidadUnit * (p.stock_actual ?? 0)
  return { costoReal, precioNeto, utilidadUnit, margen, utilidadTotal }
}

function CeldaEditable({ value, onSave, prefix = '', suffix = '', className = '' }: {
  value: number
  onSave: (v: number) => Promise<void>
  prefix?: string
  suffix?: string
  className?: string
}) {
  const [editando, setEditando] = useState(false)
  const [val, setVal] = useState(String(value))
  const [saving, setSaving] = useState(false)

  async function confirmar() {
    const n = parseFloat(val)
    if (isNaN(n) || n < 0) { setVal(String(value)); setEditando(false); return }
    setSaving(true)
    await onSave(n)
    setSaving(false)
    setEditando(false)
  }

  if (editando) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={confirmar}
        onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') { setVal(String(value)); setEditando(false) } }}
        disabled={saving}
        className="w-24 border border-blue-400 rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      />
    )
  }
  return (
    <button
      onClick={() => { setVal(String(value)); setEditando(true) }}
      className={`text-sm font-medium hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 rounded cursor-pointer transition-colors ${className}`}
      title="Click para editar"
    >
      {prefix}{typeof value === 'number' && value >= 1000 ? formatCLP(value).replace('$', '') : value}{suffix}
    </button>
  )
}

export default function PreciosTable({ productos }: { productos: Producto[] }) {
  const supabase = createClient()
  const [prods, setProds] = useState(productos)
  const [busq, setBusq] = useState('')
  const [ordenCol, setOrdenCol] = useState<'nombre' | 'margen' | 'utilidad_unit' | 'utilidad_total'>('nombre')
  const [ordenAsc, setOrdenAsc] = useState(true)

  const actualizar = useCallback((id: string, cambios: Partial<Producto>) => {
    setProds(prev => prev.map(p => p.id === id ? { ...p, ...cambios } : p))
  }, [])

  async function guardarPrecioVenta(id: string, nuevoPrecio: number) {
    const redondeado = Math.round(nuevoPrecio)
    const { error } = await supabase.from('products').update({ precio_venta: redondeado }).eq('id', id)
    if (error) { toast.error('Error al guardar'); return }
    actualizar(id, { precio_venta: redondeado })
    toast.success('Precio actualizado')
  }

  async function guardarMargen(id: string, nuevoMargen: number, prod: Producto) {
    const costoReal = (prod.precio_costo ?? 0) + (prod.costo_envio ?? 0)
    if (costoReal <= 0) { toast.error('El producto no tiene costo registrado'); return }
    const precioNeto = Math.round(costoReal * (1 + nuevoMargen / 100))
    const nuevoPrecio = prod.precio_incluye_iva ? Math.round(precioNeto * 1.19) : precioNeto
    await guardarPrecioVenta(id, nuevoPrecio)
  }

  const filtrados = prods
    .filter(p => !busq.trim() || p.nombre.toLowerCase().includes(busq.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(busq.toLowerCase()))
    .sort((a, b) => {
      const ca = calcular(a), cb = calcular(b)
      let cmp = 0
      if (ordenCol === 'nombre') cmp = a.nombre.localeCompare(b.nombre)
      if (ordenCol === 'margen') cmp = ca.margen - cb.margen
      if (ordenCol === 'utilidad_unit') cmp = ca.utilidadUnit - cb.utilidadUnit
      if (ordenCol === 'utilidad_total') cmp = ca.utilidadTotal - cb.utilidadTotal
      return ordenAsc ? cmp : -cmp
    })

  const totalUtilidad = filtrados.reduce((s, p) => s + calcular(p).utilidadTotal, 0)
  const totalValorCosto = filtrados.reduce((s, p) => s + calcular(p).costoReal * p.stock_actual, 0)
  const totalValorVenta = filtrados.reduce((s, p) => s + p.precio_venta * p.stock_actual, 0)

  function toggleOrden(col: typeof ordenCol) {
    if (ordenCol === col) setOrdenAsc(a => !a)
    else { setOrdenCol(col); setOrdenAsc(false) }
  }

  function ThSort({ col, children }: { col: typeof ordenCol; children: React.ReactNode }) {
    return (
      <th className="text-right px-3 py-2.5 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-700 whitespace-nowrap"
        onClick={() => toggleOrden(col)}>
        {children} {ordenCol === col ? (ordenAsc ? '↑' : '↓') : ''}
      </th>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen global */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Productos', value: String(filtrados.length), color: 'text-gray-800' },
          { label: 'Inversión total', value: formatCLP(totalValorCosto), color: 'text-blue-700' },
          { label: 'Valor a precio venta', value: formatCLP(totalValorVenta), color: 'text-green-700' },
          { label: 'Utilidad total potencial', value: formatCLP(totalUtilidad), color: totalUtilidad >= 0 ? 'text-emerald-700' : 'text-red-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{k.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <input
        value={busq}
        onChange={e => setBusq(e.target.value)}
        placeholder="Filtrar por nombre o SKU..."
        className="border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* Tabla */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 cursor-pointer select-none hover:text-blue-700"
                  onClick={() => toggleOrden('nombre')}>
                  Producto {ordenCol === 'nombre' ? (ordenAsc ? '↑' : '↓') : ''}
                </th>
                <th className="text-right px-3 py-2.5 font-medium text-gray-600 whitespace-nowrap">Costo real</th>
                <th className="text-right px-3 py-2.5 font-medium text-blue-600 whitespace-nowrap">Precio venta ✎</th>
                <ThSort col="margen">Margen % ✎</ThSort>
                <ThSort col="utilidad_unit">Util. unit.</ThSort>
                <th className="text-right px-3 py-2.5 font-medium text-gray-600">Stock</th>
                <ThSort col="utilidad_total">Util. total</ThSort>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map(p => {
                const { costoReal, utilidadUnit, margen, utilidadTotal } = calcular(p)
                const margenColor = margen >= 50 ? 'text-green-700' : margen >= 20 ? 'text-amber-600' : 'text-red-500'
                const utilColor = utilidadUnit >= 0 ? 'text-green-700' : 'text-red-500'
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900 max-w-[200px] truncate">{p.nombre}</p>
                      {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">{formatCLP(costoReal)}</td>
                    <td className="px-3 py-2 text-right">
                      <CeldaEditable
                        value={p.precio_venta}
                        onSave={v => guardarPrecioVenta(p.id, v)}
                        prefix="$"
                        className="text-gray-900"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <CeldaEditable
                        value={margen}
                        onSave={v => guardarMargen(p.id, v, p)}
                        suffix="%"
                        className={margenColor}
                      />
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${utilColor}`}>{formatCLP(utilidadUnit)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{p.stock_actual}</td>
                    <td className={`px-3 py-2 text-right font-bold ${utilColor}`}>{formatCLP(utilidadTotal)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/inventario/${p.id}/editar`} className="text-xs text-gray-400 hover:text-blue-600">Editar</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        💡 Haz clic en <strong>Precio venta</strong> o <strong>Margen %</strong> para editar directamente. Los cambios se guardan al presionar Enter o hacer clic fuera.
      </p>
    </div>
  )
}
