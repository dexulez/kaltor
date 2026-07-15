'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCLP, UNIDAD_MEDIDA_LABEL } from '@/lib/calculations'
import { Product, ProductCategory, ProductCategoryType, Supplier, UnidadMedida } from '@/types'
import QRScanner from '@/components/shared/QRScanner'
import { comprimirArchivos } from '@/lib/imageCompress'

interface Props {
  producto?: Product
  categorias: ProductCategory[]
  proveedores: Pick<Supplier, 'id' | 'nombre'>[]
  returnTo?: string
  nombreInicial?: string
  puedeVerCostos?: boolean
  tieneB2B?: boolean
  tieneTaller?: boolean
}

export default function ProductoForm({ producto, categorias, proveedores, returnTo, nombreInicial, puedeVerCostos = true, tieneB2B = true, tieneTaller = true }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [catList, setCatList] = useState<ProductCategory[]>(categorias)
  const [showNuevaCat, setShowNuevaCat] = useState(false)
  const [nuevaCatNombre, setNuevaCatNombre] = useState('')
  const [loadingCat, setLoadingCat] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [loadingBarcode, setLoadingBarcode] = useState(false)
  const [barcodeInfo, setBarcodeInfo] = useState<{ texto: string; esIA: boolean } | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(producto?.foto_url ?? null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const camRef = useRef<HTMLInputElement>(null)
  const fotoFileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    nombre: producto?.nombre ?? nombreInicial ?? '',
    descripcion: producto?.descripcion ?? '',
    categoria_id: producto?.categoria_id ?? (nombreInicial ? (categorias.find(c => c.nombre.toLowerCase().includes('repuesto'))?.id ?? '') : ''),
    proveedor_id: producto?.proveedor_id ?? '',
    codigo_barras: producto?.codigo_barras ?? '',
    sku: producto?.sku ?? '',
    unidad_medida: (producto?.unidad_medida ?? 'unidad') as UnidadMedida,
    contenido_por_caja: String(producto?.contenido_por_caja ?? ''),
    contenido_unidad_medida: (producto?.contenido_unidad_medida ?? 'unidad') as UnidadMedida,
    stock_actual: String(producto?.stock_actual ?? 0),
    stock_minimo: String(producto?.stock_minimo ?? 0),
    precio_costo: String(producto?.precio_costo ?? 0),
    costo_envio: String(producto?.costo_envio ?? 0),
    precio_venta: String(producto?.precio_venta ?? 0),
    precio_incluye_iva: producto?.precio_incluye_iva ?? true,
    precio_mayorista: String(producto?.precio_mayorista ?? ''),
    visible_compradores: producto?.visible_compradores ?? false,
    mayorista_descuento_activo: !!producto?.mayorista_descuento_valor,
    mayorista_descuento_tipo: producto?.mayorista_descuento_tipo ?? 'porcentaje',
    mayorista_descuento_valor: String(producto?.mayorista_descuento_valor ?? ''),
    mayorista_descuento_desde_cantidad: String(producto?.mayorista_descuento_desde_cantidad ?? ''),
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

  function set(key: string, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleBarcodeScan(value: string) {
    setShowScanner(false)
    const clean = value.trim()
    set('codigo_barras', clean)
    toast.success(`Código capturado: ${clean}`)
    // Buscar automáticamente al escanear
    buscarEnInternet(clean)
  }

  async function buscarEnInternet(codigo?: string) {
    const cod = (codigo ?? form.codigo_barras).trim()
    if (!cod) { toast.error('Ingresa o escanea un código primero'); return }
    setLoadingBarcode(true)
    setBarcodeInfo(null)
    try {
      const res = await fetch(`/api/barcode?codigo=${encodeURIComponent(cod)}`)
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Producto no encontrado en bases de datos públicas')
        setLoadingBarcode(false)
        return
      }
      const data = await res.json()
      const esIA = data.fuente === 'Claude AI'
      // Llenar campos vacíos con lo encontrado
      const campos: string[] = []
      if (data.nombre && !form.nombre.trim()) {
        set('nombre', data.nombre)
        campos.push('Nombre')
      }
      if (data.descripcion && !form.descripcion.trim()) {
        set('descripcion', data.descripcion)
        campos.push('Descripción')
      }
      // proveedor_id nunca se modifica desde el lookup de código de barras
      const detalles = [data.marca, data.modelo].filter(Boolean).join(' ')
      setBarcodeInfo({
        texto: `Encontrado en ${data.fuente}${detalles ? ` · ${detalles}` : ''}`,
        esIA,
      })
      if (campos.length > 0) {
        toast.success(`${esIA ? '🤖 IA: ' : ''}Campos completados: ${campos.join(', ')}`)
      } else {
        toast.info(`${esIA ? '🤖 ' : ''}Producto encontrado en ${data.fuente} — los campos ya tenían datos`)
      }
    } catch {
      toast.error('Error al consultar. Verifica tu conexión.')
    }
    setLoadingBarcode(false)
  }

  async function subirFoto(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setSubiendoFoto(true)
    try {
      const [comprimida] = await comprimirArchivos([file], 500)
      const ext = comprimida.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
      const { error: upErr } = await supabase.storage.from('productos-fotos').upload(path, comprimida, { upsert: true })
      if (upErr) { toast.error('Error al subir la foto: ' + upErr.message); return }
      const { data: pub } = supabase.storage.from('productos-fotos').getPublicUrl(path)
      setFotoUrl(pub.publicUrl)
      toast.success('Foto subida')
    } catch {
      toast.error('Error al subir la foto')
    } finally {
      setSubiendoFoto(false)
    }
  }

  async function crearCategoria() {
    if (!nuevaCatNombre.trim()) return
    setLoadingCat(true)
    const { data, error } = await supabase
      .from('product_categories')
      .insert({ nombre: nuevaCatNombre.trim(), tipo: 'accesorio' as ProductCategoryType, vendible: true })
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
      codigo_barras: form.codigo_barras.trim() || null,
      sku: form.sku.trim() || null,
      unidad_medida: form.unidad_medida,
      contenido_por_caja: form.unidad_medida === 'caja' && form.contenido_por_caja.trim() ? parseFloat(form.contenido_por_caja) : null,
      contenido_unidad_medida: form.unidad_medida === 'caja' ? form.contenido_unidad_medida : null,
      stock_actual: parseFloat(form.stock_actual) || 0,
      stock_minimo: parseFloat(form.stock_minimo) || 0,
      precio_costo: parseFloat(form.precio_costo) || 0,
      costo_envio: parseFloat(form.costo_envio) || 0,
      precio_venta: parseFloat(form.precio_venta) || 0,
      precio_incluye_iva: form.precio_incluye_iva,
      precio_mayorista: form.precio_mayorista.trim() ? parseFloat(form.precio_mayorista) : null,
      visible_compradores: form.visible_compradores,
      mayorista_descuento_tipo: form.mayorista_descuento_activo ? form.mayorista_descuento_tipo : null,
      mayorista_descuento_valor: form.mayorista_descuento_activo && form.mayorista_descuento_valor.trim() ? parseFloat(form.mayorista_descuento_valor) : null,
      mayorista_descuento_desde_cantidad: form.mayorista_descuento_activo && form.mayorista_descuento_desde_cantidad.trim() ? parseInt(form.mayorista_descuento_desde_cantidad) : null,
      ubicacion_bodega: form.ubicacion_bodega.trim() || null,
      numero_serie: tieneTaller ? (form.numero_serie.trim() || null) : null,
      imei: tieneTaller ? (form.imei.trim() || null) : null,
      foto_url: fotoUrl,
    }

    // Obtener usuario actual para el log
    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = user
      ? await supabase.from('user_profiles').select('nombre_completo').eq('id', user.id).single()
      : { data: null }
    const nombreUsuario = (perfil as { nombre_completo?: string } | null)?.nombre_completo ?? null

    if (producto) {
      const stockAnterior = producto.stock_actual ?? 0
      const stockNuevo = payload.stock_actual
      const { error } = await supabase.from('products').update(payload).eq('id', producto.id)
      if (error) { toast.error('Error al actualizar: ' + error.message); setLoading(false); return }
      // Registrar movimiento solo si cambió el stock
      if (stockNuevo !== stockAnterior) {
        await supabase.from('stock_movements').insert({
          product_id: producto.id,
          tipo: stockNuevo > stockAnterior ? 'ajuste_positivo' : 'ajuste_negativo',
          cantidad: Math.abs(stockNuevo - stockAnterior),
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          razon: 'Ajuste manual desde inventario',
          referencia_tipo: 'ajuste_manual',
          usuario_id: user?.id ?? null,
          nombre_usuario: nombreUsuario,
        }).then(r => r) // silenciar si usuario_id columna no existe aún
      }
      toast.success('Producto actualizado')
      router.push(returnTo ?? '/inventario')
      router.refresh()
      return
    } else {
      const { data: prod, error } = await supabase.from('products').insert(payload).select('id').single()
      if (error) { toast.error('Error al crear: ' + error.message); setLoading(false); return }
      // Registrar stock inicial si > 0
      if (payload.stock_actual > 0 && prod) {
        await supabase.from('stock_movements').insert({
          product_id: prod.id,
          tipo: 'carga_inicial',
          cantidad: payload.stock_actual,
          stock_anterior: 0,
          stock_nuevo: payload.stock_actual,
          razon: 'Carga inicial — producto creado manualmente',
          referencia_tipo: 'carga_manual',
          usuario_id: user?.id ?? null,
          nombre_usuario: nombreUsuario,
        }).then(r => r)
      }

      // Si venimos de una OT, agregar el repuesto automáticamente
      const otId = returnTo?.match(/\/reparaciones\/([^/?]+)/)?.[1]
      if (otId && prod) {
        await supabase.from('repair_items').insert({
          repair_order_id: otId,
          product_id: prod.id,
          nombre: payload.nombre,
          cantidad: 1,
          precio_costo: payload.precio_costo,
          precio_venta: payload.precio_venta,
          costo_envio: payload.costo_envio,
        })
        // Recalcular precio_servicio de la OT
        const [{ data: itsData }, { data: srvRows }] = await Promise.all([
          supabase.from('repair_items').select('precio_venta, precio_costo, cantidad').eq('repair_order_id', otId),
          supabase.from('repair_order_services').select('service_id').eq('repair_order_id', otId),
        ])
        const totalItems = (itsData ?? []).reduce((s: number, r: { precio_venta?: number; precio_costo: number; cantidad: number }) =>
          s + ((r.precio_venta ?? r.precio_costo) * r.cantidad), 0)
        const srvIds = (srvRows ?? []).map((r: { service_id: string }) => r.service_id)
        let totalServicios = 0
        if (srvIds.length > 0) {
          const { data: srvData } = await supabase.from('repair_services').select('precio_base').in('id', srvIds)
          totalServicios = (srvData ?? []).reduce((s: number, srv: { precio_base: number }) => s + (srv.precio_base ?? 0), 0)
        }
        await supabase.from('repair_orders').update({ precio_servicio: totalItems + totalServicios }).eq('id', otId)
        toast.success('Repuesto creado y agregado a la OT')
      } else {
        toast.success('Producto creado correctamente')
      }
    }

    router.push(returnTo ?? '/inventario')
    router.refresh()
  }

  const categoriaSeleccionada = catList.find(c => c.id === form.categoria_id)
  const proveedorSeleccionado = proveedores.find(p => p.id === form.proveedor_id)

  return (
    <>
      {showScanner && (
        <QRScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
          hint="Apunta al código de barras del producto"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Información básica */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Información del producto</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nombre <span className="text-red-500">*</span></Label>
              <Input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                placeholder="Pantalla iPhone 14 Pro OLED" required />
            </div>

            {/* ── Foto del producto ────────────────────────────────────────── */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Foto del producto</Label>
              <div className="flex items-center gap-3">
                {fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoUrl} alt={form.nombre || 'Foto del producto'} className="w-20 h-20 rounded-lg border object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-lg border bg-gray-50 flex items-center justify-center text-2xl text-gray-300 shrink-0">📦</div>
                )}
                <div className="flex flex-wrap gap-2">
                  <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { subirFoto(e.target.files); e.target.value = '' }} />
                  <input ref={fotoFileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { subirFoto(e.target.files); e.target.value = '' }} />
                  <Button type="button" variant="outline" size="sm" disabled={subiendoFoto}
                    onClick={() => camRef.current?.click()}>
                    {subiendoFoto ? 'Subiendo...' : '📷 Tomar foto'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={subiendoFoto}
                    onClick={() => fotoFileRef.current?.click()}>
                    🖼️ Galería
                  </Button>
                  {fotoUrl && (
                    <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50"
                      disabled={subiendoFoto} onClick={() => setFotoUrl(null)}>
                      ✕ Quitar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* ── EAN-13 / Código de barras ────────────────────────────────── */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Código de barras
                <span className="text-xs text-gray-400 font-normal">(EAN-13, Code 128, UPC — opcional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={form.codigo_barras}
                  onChange={e => { set('codigo_barras', e.target.value); setBarcodeInfo(null) }}
                  placeholder="Ej: 7891234567890"
                  className="flex-1 font-mono"
                  maxLength={30}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowScanner(true)}
                  className="shrink-0 border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  📷
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => buscarEnInternet()}
                  disabled={!form.codigo_barras.trim() || loadingBarcode}
                  className="shrink-0 border-green-300 text-green-700 hover:bg-green-50 gap-1"
                >
                  {loadingBarcode ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      Buscando…
                    </span>
                  ) : '🔍 Buscar'}
                </Button>
              </div>
              {barcodeInfo && (
                <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 border ${
                  barcodeInfo.esIA
                    ? 'bg-purple-50 border-purple-200 text-purple-800'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  {barcodeInfo.esIA && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      🤖 IA
                    </span>
                  )}
                  <span>✓ {barcodeInfo.texto}</span>
                  {barcodeInfo.esIA && (
                    <span className="text-purple-500 ml-auto shrink-0">Verifica los datos</span>
                  )}
                </div>
              )}
              {!barcodeInfo && form.codigo_barras && (
                <p className="text-xs text-gray-400">
                  Código listo · presiona <strong>🔍 Buscar</strong> para completar datos desde internet
                </p>
              )}
            </div>

            {/* Categoría */}
            <div className="space-y-1.5">
              <Label>Categoría <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <Select value={form.categoria_id} onValueChange={v => set('categoria_id', v ?? '')}>
                  <SelectTrigger className="flex-1">
                    <span className="truncate text-sm text-left">
                      {form.categoria_id ? (categoriaSeleccionada?.nombre ?? 'Categoría') : 'Seleccionar...'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {catList.length === 0
                      ? <div className="px-3 py-4 text-xs text-gray-400 text-center">Sin categorías — crea una con el botón +</div>
                      : catList.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setShowNuevaCat(v => !v)} className="shrink-0 px-3">
                  + Nueva
                </Button>
              </div>
              {showNuevaCat && (
                <div className="flex gap-2 mt-1">
                  <Input value={nuevaCatNombre} onChange={e => setNuevaCatNombre(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), crearCategoria())}
                    placeholder="Nombre de la categoría" className="flex-1 h-8 text-sm" autoFocus />
                  <Button type="button" size="sm" onClick={crearCategoria}
                    disabled={loadingCat || !nuevaCatNombre.trim()}
                    className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white text-xs shrink-0">
                    {loadingCat ? '...' : 'Crear'}
                  </Button>
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => setShowNuevaCat(false)} className="h-8 px-3 text-xs shrink-0">
                    ✕
                  </Button>
                </div>
              )}
            </div>

            {/* Proveedor */}
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <Select value={form.proveedor_id} onValueChange={v => set('proveedor_id', v ?? '')}>
                <SelectTrigger>
                  <span className="truncate text-sm text-left">
                    {form.proveedor_id ? (proveedorSeleccionado?.nombre ?? 'Proveedor') : 'Sin proveedor'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* SKU interno */}
            <div className="space-y-1.5">
              <Label>
                SKU interno
                <span className="text-xs text-gray-400 font-normal ml-1">(opcional)</span>
              </Label>
              <Input value={form.sku} onChange={e => set('sku', e.target.value)}
                placeholder="Ej: PANT-IP14-OLED" className="font-mono" />
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
              <Label>Unidad de medida</Label>
              <Select value={form.unidad_medida} onValueChange={v => set('unidad_medida', v as UnidadMedida)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIDAD_MEDIDA_LABEL).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.unidad_medida === 'caja' && (
              <>
                <div className="space-y-1.5">
                  <Label>Cantidad por caja</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.contenido_por_caja}
                    onChange={e => set('contenido_por_caja', e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                    placeholder="Ej: 12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Medida del contenido</Label>
                  <Select value={form.contenido_unidad_medida} onValueChange={v => set('contenido_unidad_medida', v as UnidadMedida)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIDAD_MEDIDA_LABEL).filter(([key]) => key !== 'caja').map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Stock actual</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.stock_actual}
                onChange={e => set('stock_actual', e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stock mínimo</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.stock_minimo}
                onChange={e => set('stock_minimo', e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ubicación en bodega</Label>
              <Input value={form.ubicacion_bodega} onChange={e => set('ubicacion_bodega', e.target.value)}
                placeholder="Estante A-3" />
            </div>
            {tieneTaller && (
              <div className="space-y-1.5">
                <Label>N° Serie / IMEI</Label>
                <Input value={form.numero_serie || form.imei}
                  onChange={e => set('numero_serie', e.target.value)}
                  placeholder="Solo equipos usados" />
              </div>
            )}
          </div>
        </div>

        {/* Precios */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Precios</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {puedeVerCostos && (
              <>
                <div className="space-y-1.5">
                  <Label>Precio de costo (CLP)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={form.precio_costo}
                    onChange={e => {
                      // Solo dígitos y un punto decimal
                      const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
                      set('precio_costo', v)
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Costo de envío (CLP)</Label>
                  <Input type="number" min={0} value={form.costo_envio}
                    onChange={e => set('costo_envio', e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Precio de venta (CLP)</Label>
              <Input type="number" min={0} value={form.precio_venta}
                onChange={e => set('precio_venta', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Precio incluye IVA</Label>
              <Select value={String(form.precio_incluye_iva)}
                onValueChange={v => set('precio_incluye_iva', v === 'true')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sí (precio con IVA)</SelectItem>
                  <SelectItem value="false">No (precio neto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`bg-gray-50 rounded-lg p-4 grid gap-4 text-sm ${puedeVerCostos ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {puedeVerCostos && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Costo real</p>
                <p className="font-bold text-gray-800 text-lg">{formatCLP(costoReal)}</p>
                <p className="text-gray-400 text-xs">costo + envío</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Precio venta</p>
              <p className="font-bold text-gray-800 text-lg">{formatCLP(Number(form.precio_venta) || 0)}</p>
              {form.precio_incluye_iva && (
                <p className="text-gray-400 text-xs">neto: {formatCLP(precioVentaNeto)}</p>
              )}
            </div>
            {puedeVerCostos && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Margen</p>
                <p className={`font-bold text-lg ${margen >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {margen}%
                </p>
                <p className="text-gray-400 text-xs">sobre precio neto</p>
              </div>
            )}
          </div>
        </div>

        {tieneB2B && (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800">Venta a compradores externos (B2B)</h2>
            <p className="text-xs text-gray-400 mt-0.5">Otros talleres con cuenta de comprador externo ven este producto con este precio en su catálogo.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Precio mayorista (CLP)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.precio_mayorista}
                onChange={e => {
                  const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
                  set('precio_mayorista', v)
                }}
                placeholder="0.00"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input type="checkbox" checked={form.visible_compradores} onChange={e => set('visible_compradores', e.target.checked)} />
              Mostrar en el catálogo B2B
            </label>
          </div>

          {/* Oferta por volumen sobre el precio mayorista */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.mayorista_descuento_activo}
                onChange={e => set('mayorista_descuento_activo', e.target.checked)}
                className="w-4 h-4 rounded accent-amber-600"
              />
              <span className="text-sm font-medium text-amber-800">🏷️ Oferta por cantidad (precio mayorista)</span>
            </label>
            {form.mayorista_descuento_activo && (
              <div className="grid grid-cols-3 gap-2 pl-1">
                <div className="space-y-1">
                  <Label className="text-xs text-amber-700">Tipo</Label>
                  <div className="flex border border-amber-300 rounded-lg overflow-hidden text-xs">
                    <button type="button" onClick={() => set('mayorista_descuento_tipo', 'porcentaje')}
                      className={`flex-1 px-2 py-1.5 font-semibold ${form.mayorista_descuento_tipo !== 'monto' ? 'bg-amber-500 text-white' : 'bg-white text-amber-700'}`}>%</button>
                    <button type="button" onClick={() => set('mayorista_descuento_tipo', 'monto')}
                      className={`flex-1 px-2 py-1.5 font-semibold ${form.mayorista_descuento_tipo === 'monto' ? 'bg-amber-500 text-white' : 'bg-white text-amber-700'}`}>$</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-700">{form.mayorista_descuento_tipo === 'monto' ? 'Descuento (CLP)' : 'Descuento (%)'}</Label>
                  <Input type="number" min={0} value={form.mayorista_descuento_valor}
                    onChange={e => set('mayorista_descuento_valor', e.target.value)}
                    placeholder={form.mayorista_descuento_tipo === 'monto' ? 'Ej: 1000' : 'Ej: 10'} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-amber-700">Desde cuántas unidades</Label>
                  <Input type="number" min={1} value={form.mayorista_descuento_desde_cantidad}
                    onChange={e => set('mayorista_descuento_desde_cantidad', e.target.value)}
                    placeholder="Ej: 10" />
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        <div className="flex gap-3 pb-20 md:pb-0">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
            {loading ? 'Guardando...' : producto ? 'Actualizar producto' : 'Crear producto'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </>
  )
}
