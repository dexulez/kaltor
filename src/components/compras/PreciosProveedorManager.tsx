'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Product, SupplierProductPrice } from '@/types'

interface Props {
  supplierId: string
  preciosIniciales: SupplierProductPrice[]
  productos: Product[]
}

export default function PreciosProveedorManager({ supplierId, preciosIniciales, productos }: Props) {
  const supabase = createClient()
  const [precios, setPrecios] = useState<SupplierProductPrice[]>(preciosIniciales)
  const [nombre, setNombre] = useState('')
  const [productId, setProductId] = useState<string | null>(null)
  const [skuProveedor, setSkuProveedor] = useState('')
  const [precio, setPrecio] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const filtrados = busqueda
    ? productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 6)
    : []

  function seleccionarProducto(p: Product) {
    setProductId(p.id)
    setNombre(p.nombre)
    setBusqueda('')
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    const precioNum = parseFloat(precio)
    if (!nombre.trim()) { toast.error('Escribe el nombre del repuesto'); return }
    if (!(precioNum >= 0)) { toast.error('Ingresa un precio válido'); return }

    setGuardando(true)
    const { data, error } = await supabase.from('supplier_product_prices').insert({
      supplier_id: supplierId,
      product_id: productId,
      nombre_repuesto: nombre.trim(),
      sku_proveedor: skuProveedor.trim() || null,
      precio: precioNum,
      notas: notas.trim() || null,
    }).select().single()
    setGuardando(false)

    if (error) {
      toast.error(
        error.code === '23505'
          ? 'Ya existe un precio cargado para ese producto con este proveedor'
          : 'Error al guardar: ' + error.message
      )
      return
    }
    setPrecios(prev => [...prev, data].sort((a, b) => a.nombre_repuesto.localeCompare(b.nombre_repuesto)))
    setNombre('')
    setProductId(null)
    setSkuProveedor('')
    setPrecio('')
    setNotas('')
    toast.success('Precio agregado')
  }

  async function actualizarPrecio(id: string, nuevoPrecio: number) {
    if (!(nuevoPrecio >= 0)) return
    setPrecios(prev => prev.map(p => p.id === id ? { ...p, precio: nuevoPrecio } : p))
    const { error } = await supabase.from('supplier_product_prices')
      .update({ precio: nuevoPrecio, actualizado_at: new Date().toISOString() }).eq('id', id)
    if (error) toast.error('Error al actualizar el precio: ' + error.message)
  }

  async function alternarDisponible(id: string, disponible: boolean) {
    setPrecios(prev => prev.map(p => p.id === id ? { ...p, disponible } : p))
    const { error } = await supabase.from('supplier_product_prices').update({ disponible }).eq('id', id)
    if (error) toast.error('Error al actualizar: ' + error.message)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este precio de la lista?')) return
    const { error } = await supabase.from('supplier_product_prices').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar: ' + error.message); return }
    setPrecios(prev => prev.filter(p => p.id !== id))
    toast.success('Precio eliminado')
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <form onSubmit={agregar} className="bg-white rounded-xl border p-4 space-y-3">
        <p className="font-semibold text-gray-800 text-sm">Agregar repuesto a la lista</p>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 space-y-1 relative">
            <Label className="text-xs">Repuesto</Label>
            <Input
              value={nombre}
              onChange={e => {
                if (productId) setProductId(null)
                setNombre(e.target.value)
                setBusqueda(e.target.value)
              }}
              onBlur={() => setTimeout(() => setBusqueda(''), 150)}
              placeholder="Ej: Altavoz Samsung A05 5G"
              className="text-sm"
              autoComplete="off"
            />
            {productId && <p className="text-[10px] text-green-600 mt-0.5">✓ Vinculado a producto del inventario</p>}
            {busqueda && !productId && filtrados.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filtrados.map(p => (
                  <button key={p.id} type="button"
                    onMouseDown={e => { e.preventDefault(); seleccionarProducto(p) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0">
                    {p.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Código proveedor</Label>
            <Input value={skuProveedor} onChange={e => setSkuProveedor(e.target.value)} placeholder="Opcional" className="text-sm" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs">Precio (CLP)</Label>
            <Input type="number" min={0} value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0" className="text-sm" />
          </div>
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-xs">Notas</Label>
            <Input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" className="text-sm" />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={guardando}>{guardando ? 'Guardando...' : '+ Agregar'}</Button>
      </form>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <p className="font-semibold text-gray-800 text-sm">{precios.length} repuesto{precios.length !== 1 ? 's' : ''} en la lista</p>
        </div>
        {precios.length === 0 ? (
          <p className="text-sm text-gray-400 p-4">Todavía no cargas precios de repuestos para este proveedor.</p>
        ) : (
          <div className="divide-y">
            {precios.map(p => (
              <div key={p.id} className="p-3 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-medium text-gray-800">{p.nombre_repuesto}</p>
                  <p className="text-xs text-gray-400">
                    {p.sku_proveedor && <span>Código: {p.sku_proveedor} · </span>}
                    Actualizado {new Date(p.actualizado_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {p.notas && <span> · {p.notas}</span>}
                  </p>
                </div>
                <Input
                  type="number" min={0}
                  defaultValue={p.precio}
                  onBlur={e => {
                    const val = parseFloat(e.target.value)
                    if (val !== p.precio) actualizarPrecio(p.id, val)
                  }}
                  className="w-28 text-sm"
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={p.disponible} onChange={e => alternarDisponible(p.id, e.target.checked)} className="accent-green-600" />
                  Disponible
                </label>
                <button type="button" onClick={() => eliminar(p.id)} className="text-red-400 hover:text-red-600 text-lg px-1">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
