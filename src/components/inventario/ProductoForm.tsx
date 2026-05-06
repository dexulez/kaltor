'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCLP } from '@/lib/calculations'
import { Product, ProductCategory, Supplier } from '@/types'

interface Props {
  producto?: Product
  categorias: ProductCategory[]
  proveedores: Pick<Supplier, 'id' | 'nombre'>[]
}

export default function ProductoForm({ producto, categorias, proveedores }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [catList, setCatList] = useState<ProductCategory[]>(categorias)
  const [showNuevaCat, setShowNuevaCat] = useState(false)
  const [nuevaCatNombre, setNuevaCatNombre] = useState('')
  const [loadingCat, setLoadingCat] = useState(false)

  const [form, setForm] = useState({
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    categoria_id: producto?.categoria_id ?? '',
    proveedor_id: producto?.proveedor_id ?? '',
    stock_actual: String(producto?.stock_actual ?? 0),
    stock_minimo: String(producto?.stock_minimo ?? 0),
    precio_costo: String(producto?.precio_costo ?? 0),
    costo_envio: String(producto?.costo_envio ?? 0),
    precio_venta: String(producto?.precio_venta ?? 0),
    precio_incluye_iva: producto?.precio_incluye_iva ?? true,
    ubicacion_bodega: producto?.ubicacion_bodega ?? '',
    numero_serie: producto?.numero_serie ?? '',
    imei: producto?.imei ?? '',
  })

  const costoReal = (Number(form.precio_costo) || 0) + (Number(form.costo_envio) || 0)
  const precioVentaNeto = form.precio_incluye_iva
    ? Math.round((Number(form.precio_venta) || 0) / 1.19)
    : (Number(form.precio_venta) || 0)
  const margen = costoReal > 0
    ? Math.round(((precioVentaNeto - costoReal) / costoReal) * 100)
    : 0

  const categoriaSeleccionada = catList.find(c => c.id === form.categoria_id)
  const proveedorSeleccionado = proveedores.find(p => p.id === form.proveedor_id)
  const categoriaValue = categoriaSeleccionada ? form.categoria_id : ''
  const proveedorValue = proveedorSeleccionado ? form.proveedor_id : ''

  function set(key: string, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function crearCategoria() {
    if (!nuevaCatNombre.trim()) return
    setLoadingCat(true)
    const { data, error } = await supabase
      .from('product_categories')
      .insert({ nombre: nuevaCatNombre.trim(), tipo: 'accesorio', vendible: true })
      .select()
      .single()
    if (error) { toast.error('Error al crear categoría: ' + error.message); setLoadingCat(false); return }
    const nueva = data as ProductCategory
    setCatList(prev => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    set('categoria_id', nueva.id)
    setNuevaCatNombre('')
    setShowNuevaCat(false)
    toast.success(`Categoría "${nueva.nombre}" creada`)
    setLoadingCat(false)
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!form.categoria_id) { toast.error('Selecciona una categoría'); return }
    setLoading(true)

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      categoria_id: form.categoria_id,
      proveedor_id: form.proveedor_id || null,
      stock_actual: parseInt(form.stock_actual) || 0,
      stock_minimo: parseInt(form.stock_minimo) || 0,
      precio_costo: parseFloat(form.precio_costo) || 0,
      costo_envio: parseFloat(form.costo_envio) || 0,
      precio_venta: parseFloat(form.precio_venta) || 0,
      precio_incluye_iva: form.precio_incluye_iva,
      ubicacion_bodega: form.ubicacion_bodega.trim() || null,
      numero_serie: form.numero_serie.trim() || null,
      imei: form.imei.trim() || null,
    }

    if (producto) {
      const { error } = await supabase.from('products').update(payload).eq('id', producto.id)
      if (error) { toast.error('Error al actualizar: ' + error.message); setLoading(false); return }
      toast.success('Producto actualizado')
    } else {
      const { error } = await supabase.from('products').insert(payload)
      if (error) { toast.error('Error al crear: ' + error.message); setLoading(false); return }
      toast.success('Producto creado correctamente')
    }

    router.push('/inventario')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info básica */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Información del producto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nombre <span className="text-red-500">*</span></Label>
            <Input value={form.nombre} onChange={e => set('nombre', e.target.value)}
              placeholder="Pantalla iPhone 14 Pro OLED" required />
          </div>
          <div className="space-y-1.5">
            <Label>Categoría <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <Select value={categoriaValue} onValueChange={v => set('categoria_id', v ?? '')}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={form.categoria_id && !categoriaSeleccionada ? 'Categoría no disponible' : 'Seleccionar...'} />
                </SelectTrigger>
                <SelectContent>
                  {catList.length === 0
                    ? <div className="px-3 py-4 text-xs text-gray-400 text-center">Sin categorías — crea una con el botón +</div>
                    : catList.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)
                  }
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNuevaCat(v => !v)}
                className="shrink-0 px-3">
                + Nueva
              </Button>
            </div>
            {showNuevaCat && (
              <div className="flex gap-2 mt-1">
                <Input
                  value={nuevaCatNombre}
                  onChange={e => setNuevaCatNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), crearCategoria())}
                  placeholder="Nombre de la categoría"
                  className="flex-1 h-8 text-sm"
                  autoFocus
                />
                <Button type="button" size="sm" onClick={crearCategoria} disabled={loadingCat || !nuevaCatNombre.trim()}
                  className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white text-xs shrink-0">
                  {loadingCat ? '...' : 'Crear'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNuevaCat(false)}
                  className="h-8 px-3 text-xs shrink-0">
                  ✕
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Proveedor</Label>
            <Select value={proveedorValue} onValueChange={v => set('proveedor_id', v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder={form.proveedor_id && !proveedorSeleccionado ? 'Proveedor no disponible' : 'Sin proveedor'} />
              </SelectTrigger>
              <SelectContent>
                {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Descripción</Label>
            <Textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              placeholder="Descripción del producto..." rows={2} />
          </div>
        </div>
      </div>

      {/* Stock */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Stock y ubicación</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Stock actual</Label>
            <Input type="number" min={0} value={form.stock_actual}
              onChange={e => set('stock_actual', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Stock mínimo</Label>
            <Input type="number" min={0} value={form.stock_minimo}
              onChange={e => set('stock_minimo', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Ubicación en bodega</Label>
            <Input value={form.ubicacion_bodega} onChange={e => set('ubicacion_bodega', e.target.value)}
              placeholder="Estante A-3" />
          </div>
          <div className="space-y-1.5">
            <Label>N° Serie / IMEI</Label>
            <Input value={form.numero_serie || form.imei}
              onChange={e => set('numero_serie', e.target.value)}
              placeholder="Solo equipos usados" />
          </div>
        </div>
      </div>

      {/* Precios */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Precios</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Precio de costo (CLP)</Label>
            <Input type="number" min={0} value={form.precio_costo}
              onChange={e => set('precio_costo', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Costo de envío (CLP)</Label>
            <Input type="number" min={0} value={form.costo_envio}
              onChange={e => set('costo_envio', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Precio de venta (CLP)</Label>
            <Input type="number" min={0} value={form.precio_venta}
              onChange={e => set('precio_venta', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Precio incluye IVA</Label>
            <Select value={String(form.precio_incluye_iva)} onValueChange={v => set('precio_incluye_iva', v ? v === 'true' : form.precio_incluye_iva)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sí (precio con IVA)</SelectItem>
                <SelectItem value="false">No (precio neto)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resumen de márgenes */}
        <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Costo real</p>
            <p className="font-bold text-gray-800 text-lg">{formatCLP(costoReal)}</p>
            <p className="text-gray-400 text-xs">costo + envío</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Precio venta</p>
            <p className="font-bold text-gray-800 text-lg">{formatCLP(Number(form.precio_venta) || 0)}</p>
            {form.precio_incluye_iva && (
              <p className="text-gray-400 text-xs">neto: {formatCLP(precioVentaNeto)}</p>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Margen</p>
            <p className={`font-bold text-lg ${margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {margen}%
            </p>
            <p className="text-gray-400 text-xs">sobre precio neto</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? 'Guardando...' : producto ? 'Actualizar producto' : 'Crear producto'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
