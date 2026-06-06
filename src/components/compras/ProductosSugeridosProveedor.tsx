'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCLP } from '@/lib/calculations'

type SuggestedItem = {
  id: string
  nombre: string
  precio_cotizado: number | null
  precio_unitario: number
  nota_proveedor: string | null
  product_id: string | null
}

type Category = { id: string; nombre: string }

interface Props {
  ordenId: string
  items: SuggestedItem[]
  supplierId?: string | null
}

export default function ProductosSugeridosProveedor({ ordenId, items, supplierId }: Props) {
  const supabase = createClient()
  const [aceptandoId, setAceptandoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<Category[]>([])
  const [form, setForm] = useState({ categoriaId: '', precioVenta: '', stockMinimo: '1', sku: '' })

  useEffect(() => {
    supabase.from('product_categories').select('id, nombre').order('nombre')
      .then(({ data }) => setCategorias(data ?? []))
  }, [])

  function abrirModal(item: SuggestedItem) {
    setAceptandoId(item.id)
    setForm({ categoriaId: '', precioVenta: '', stockMinimo: '1', sku: '' })
  }

  async function handleAceptar() {
    const item = items.find(i => i.id === aceptandoId)
    if (!item || !form.categoriaId || !form.precioVenta) {
      toast.error('Completa categoría y precio de venta')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/compras/orden/${ordenId}/aceptar-sugerencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: aceptandoId,
          nombre: item.nombre,
          categoria_id: form.categoriaId,
          precio_venta: parseInt(form.precioVenta),
          precio_costo: item.precio_cotizado ?? item.precio_unitario ?? 0,
          stock_minimo: parseInt(form.stockMinimo) || 1,
          sku: form.sku.trim() || undefined,
          proveedor_id: supplierId || undefined,
        }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? 'Error al crear producto')
        return
      }
      toast.success(`"${item.nombre}" agregado al inventario`)
      setAceptandoId(null)
      window.location.reload()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function handleRechazar(itemId: string) {
    if (!confirm('¿Eliminar esta sugerencia del proveedor?')) return
    setLoading(true)
    const { error } = await supabase.from('purchase_order_items').delete().eq('id', itemId)
    if (error) toast.error(error.message)
    else { toast.success('Sugerencia eliminada'); window.location.reload() }
    setLoading(false)
  }

  if (items.length === 0) return null

  return (
    <>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-violet-50 border-b border-violet-100 px-4 py-3">
          <p className="font-semibold text-violet-800 text-sm">💡 Productos sugeridos por el proveedor</p>
          <p className="text-xs text-violet-600 mt-0.5">
            El proveedor ofrece estos productos adicionales. Acéptalos para agregarlos al inventario o ignóralos.
          </p>
        </div>
        <div className="divide-y">
          {items.map(item => {
            const precio = item.precio_cotizado ?? item.precio_unitario
            const yaAceptado = item.product_id != null
            return (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{item.nombre}</p>
                  {item.nota_proveedor && (
                    <p className="text-xs text-violet-600 mt-0.5">📝 {item.nota_proveedor}</p>
                  )}
                  {precio > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">Precio: {formatCLP(precio)}</p>
                  )}
                </div>
                {yaAceptado ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium shrink-0">
                    ✓ En inventario
                  </span>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => abrirModal(item)}
                      disabled={loading}
                      className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      ✓ Aceptar
                    </button>
                    <button
                      onClick={() => handleRechazar(item.id)}
                      disabled={loading}
                      className="text-xs border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal datos del producto */}
      {aceptandoId && (() => {
        const item = items.find(i => i.id === aceptandoId)
        if (!item) return null
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
              <div>
                <p className="font-bold text-gray-900">Registrar en inventario</p>
                <p className="text-sm text-gray-500 mt-0.5 truncate">"{item.nombre}"</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Categoría *</label>
                  <select
                    value={form.categoriaId}
                    onChange={e => setForm(f => ({ ...f, categoriaId: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <option value="">Seleccionar categoría...</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700">Precio de venta (CLP) *</label>
                  <input
                    type="number" min={0}
                    placeholder="Ej: 25000"
                    value={form.precioVenta}
                    onChange={e => setForm(f => ({ ...f, precioVenta: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  {(item.precio_cotizado ?? item.precio_unitario) > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Precio costo: {formatCLP(item.precio_cotizado ?? item.precio_unitario)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-700">Stock mínimo</label>
                    <input
                      type="number" min={0}
                      value={form.stockMinimo}
                      onChange={e => setForm(f => ({ ...f, stockMinimo: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">SKU (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: PAN-IP14"
                      value={form.sku}
                      onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleAceptar}
                  disabled={loading || !form.categoriaId || !form.precioVenta}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {loading ? 'Guardando...' : '✓ Crear en inventario'}
                </button>
                <button
                  onClick={() => setAceptandoId(null)}
                  disabled={loading}
                  className="px-4 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
