'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProductCategory, ProductCategoryType } from '@/types'

const TIPO_OPTIONS = [
  { value: 'repuesto',    label: 'Repuesto' },
  { value: 'accesorio',   label: 'Accesorio' },
  { value: 'equipo_usado',label: 'Equipo usado' },
  { value: 'insumo',      label: 'Insumo' },
]

const TIPO_COLORS: Record<string, string> = {
  repuesto:    'bg-blue-100 text-blue-700',
  accesorio:   'bg-green-100 text-green-700',
  equipo_usado:'bg-purple-100 text-purple-700',
  insumo:      'bg-gray-100 text-gray-600',
}

interface Props {
  categorias: (ProductCategory & { productos_count: number })[]
}

type Editing = { id: string; nombre: string; tipo: ProductCategoryType; vendible: boolean } | null

export default function CategoriasManager({ categorias: inicial }: Props) {
  const supabase = createClient()
  const [lista, setLista] = useState(inicial)
  const [editing, setEditing] = useState<Editing>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [nueva, setNueva] = useState<{ nombre: string; tipo: ProductCategoryType; vendible: boolean }>({ nombre: '', tipo: 'accesorio', vendible: true })

  // ── Crear ─────────────────────────────────────────────────
  async function crear() {
    if (!nueva.nombre.trim()) { toast.error('Escribe un nombre'); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('product_categories')
      .insert({ nombre: nueva.nombre.trim(), tipo: nueva.tipo, vendible: nueva.vendible })
      .select()
      .single()
    if (error) { toast.error('Error: ' + error.message); setLoading(false); return }
    setLista(prev => [...prev, { ...(data as ProductCategory), productos_count: 0 }]
      .sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setNueva({ nombre: '', tipo: 'accesorio', vendible: true })
    setShowForm(false)
    toast.success(`Categoría "${data.nombre}" creada`)
    setLoading(false)
  }

  // ── Guardar edición ───────────────────────────────────────
  async function guardar() {
    if (!editing) return
    if (!editing.nombre.trim()) { toast.error('El nombre no puede estar vacío'); return }
    setLoading(true)
    const { error } = await supabase
      .from('product_categories')
      .update({ nombre: editing.nombre.trim(), tipo: editing.tipo, vendible: editing.vendible })
      .eq('id', editing.id)
    if (error) { toast.error('Error: ' + error.message); setLoading(false); return }
    setLista(prev => prev
      .map(c => c.id === editing.id ? { ...c, nombre: editing.nombre.trim(), tipo: editing.tipo, vendible: editing.vendible } : c)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
    )
    toast.success('Categoría actualizada')
    setEditing(null)
    setLoading(false)
  }

  // ── Eliminar ──────────────────────────────────────────────
  async function eliminar(cat: Props['categorias'][0]) {
    if (cat.productos_count > 0) {
      toast.error(`No se puede eliminar: tiene ${cat.productos_count} producto(s) asociados`)
      return
    }
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) return
    setLoading(true)
    const { error } = await supabase.from('product_categories').delete().eq('id', cat.id)
    if (error) { toast.error('Error: ' + error.message); setLoading(false); return }
    setLista(prev => prev.filter(c => c.id !== cat.id))
    toast.success('Categoría eliminada')
    setLoading(false)
  }

  return (
    <div className="space-y-5">

      {/* Formulario nueva categoría */}
      {showForm ? (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Nueva categoría</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre <span className="text-red-500">*</span></Label>
              <Input
                value={nueva.nombre}
                onChange={e => setNueva(v => ({ ...v, nombre: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && crear()}
                placeholder="Ej: Cables USB"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                value={nueva.tipo}
                onChange={e => setNueva(v => ({ ...v, tipo: e.target.value as ProductCategoryType }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>¿Vendible al público?</Label>
              <div className="flex items-center gap-3 h-10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="vendible_new" checked={nueva.vendible}
                    onChange={() => setNueva(v => ({ ...v, vendible: true }))} />
                  <span className="text-sm">Sí</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="vendible_new" checked={!nueva.vendible}
                    onChange={() => setNueva(v => ({ ...v, vendible: false }))} />
                  <span className="text-sm">No (uso interno)</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={crear} disabled={loading || !nueva.nombre.trim()}
              className="bg-green-600 hover:bg-green-700">
              {loading ? 'Guardando...' : 'Crear categoría'}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          + Nueva categoría
        </Button>
      )}

      {/* Tabla de categorías */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {lista.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl block mb-3">🗂️</span>
            <p className="font-medium">No hay categorías registradas</p>
            <p className="text-sm mt-1">Crea la primera con el botón de arriba</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Vendible</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Productos</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lista.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editing?.id === cat.id ? (
                      <Input
                        value={editing.nombre}
                        onChange={e => setEditing(ed => ed ? { ...ed, nombre: e.target.value } : ed)}
                        onKeyDown={e => e.key === 'Enter' && guardar()}
                        className="h-8 text-sm w-52"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-gray-900">{cat.nombre}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing?.id === cat.id ? (
                      <select
                        value={editing.tipo}
                        onChange={e => setEditing(ed => ed ? { ...ed, tipo: e.target.value as ProductCategoryType } : ed)}
                        className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[cat.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TIPO_OPTIONS.find(o => o.value === cat.tipo)?.label ?? cat.tipo}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editing?.id === cat.id ? (
                      <input
                        type="checkbox"
                        checked={editing.vendible}
                        onChange={e => setEditing(ed => ed ? { ...ed, vendible: e.target.checked } : ed)}
                        className="w-4 h-4 accent-blue-600"
                      />
                    ) : (
                      <span className={`text-xs font-medium ${cat.vendible ? 'text-green-600' : 'text-gray-400'}`}>
                        {cat.vendible ? '✓ Sí' : '— No'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold ${cat.productos_count > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                      {cat.productos_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-end">
                      {editing?.id === cat.id ? (
                        <>
                          <Button size="sm" onClick={guardar} disabled={loading}
                            className="bg-green-600 hover:bg-green-700 h-7 text-xs px-3">
                            {loading ? '...' : 'Guardar'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing(null)}
                            className="h-7 text-xs px-3">
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline"
                            onClick={() => setEditing({ id: cat.id, nombre: cat.nombre, tipo: cat.tipo, vendible: cat.vendible })}
                            className="h-7 text-xs px-3">
                            Editar
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => eliminar(cat)}
                            disabled={cat.productos_count > 0}
                            className="h-7 text-xs px-3 text-red-500 hover:text-red-700 hover:border-red-300 disabled:opacity-40"
                            title={cat.productos_count > 0 ? 'Tiene productos asociados' : 'Eliminar'}>
                            Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
