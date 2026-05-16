'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCLP } from '@/lib/calculations'

const TIPOS = [
  { value: 'pantalla',   label: '📱 Pantalla' },
  { value: 'bateria',    label: '🔋 Batería' },
  { value: 'placa',      label: '🔬 Placa madre' },
  { value: 'software',   label: '💻 Software' },
  { value: 'camara',     label: '📷 Cámara' },
  { value: 'conector',   label: '🔌 Conector' },
  { value: 'otro',       label: '🔧 Otro' },
]

interface Repuesto {
  id: string           // item temporal o UUID DB
  product_id: string | null
  nombre: string
  cantidad: number
  precio_costo: number
  esNuevo?: boolean    // item aún no guardado
}

interface Producto { id: string; nombre: string; sku: string | null; precio_costo: number }

interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  tipo_reparacion: string
  precio_base: number
  tiempo_estimado_min: number | null
  activo: boolean
  repair_service_items?: Repuesto[]
}

interface Props { servicio?: Servicio; returnTo?: string }

export default function ServicioForm({ servicio, returnTo }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState(servicio?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(servicio?.descripcion ?? '')
  const [tipo, setTipo] = useState(servicio?.tipo_reparacion ?? 'otro')
  const [precioBase, setPrecioBase] = useState(String(servicio?.precio_base ?? 0))
  const [tiempoMin, setTiempoMin] = useState(String(servicio?.tiempo_estimado_min ?? 60))
  // Mano de obra
  const sExtra = servicio as unknown as Record<string, unknown>
  const [manoObraTipo, setManoObraTipo] = useState<'porcentaje' | 'monto' | 'utilidad'>((sExtra?.mano_obra_tipo as 'porcentaje' | 'monto' | 'utilidad') ?? 'porcentaje')
  const [manoObraValor, setManoObraValor] = useState(String(sExtra?.mano_obra_valor ?? 0))
  const [activo, setActivo] = useState(servicio?.activo ?? true)
  const [repuestos, setRepuestos] = useState<Repuesto[]>(
    (servicio?.repair_service_items ?? []).map(r => ({ ...r, esNuevo: false }))
  )

  // Búsqueda de productos
  const [busqProd, setBusqProd] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [showBusq, setShowBusq] = useState(false)

  useEffect(() => {
    supabase.from('products').select('id, nombre, sku, precio_costo').eq('activo', true).order('nombre').limit(300)
      .then(({ data }) => setProductos((data ?? []) as Producto[]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const costoRepuestos = repuestos.reduce((s, r) => s + r.precio_costo * r.cantidad, 0)
  const precio = parseInt(precioBase) || 0
  const utilidadBruta = precio - costoRepuestos   // base para % de utilidad
  const manoObraNum = manoObraTipo === 'monto'
    ? (parseFloat(manoObraValor) || 0)
    : manoObraTipo === 'utilidad'
      ? Math.round(Math.max(0, utilidadBruta) * (parseFloat(manoObraValor) || 0) / 100)
      : Math.round(precio * (parseFloat(manoObraValor) || 0) / 100)
  const utilidadNeta = precio - costoRepuestos - manoObraNum
  const precioSugerido = costoRepuestos + manoObraNum
  const margen = costoRepuestos > 0 ? Math.round(((precio - costoRepuestos) / costoRepuestos) * 100) : 0

  const filtProd = busqProd.trim()
    ? productos.filter(p => p.nombre.toLowerCase().includes(busqProd.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(busqProd.toLowerCase())).slice(0, 8)
    : []

  function agregarProducto(p: Producto) {
    const existe = repuestos.find(r => r.product_id === p.id)
    if (existe) { setRepuestos(prev => prev.map(r => r.product_id === p.id ? { ...r, cantidad: r.cantidad + 1 } : r)); }
    else setRepuestos(prev => [...prev, { id: crypto.randomUUID(), product_id: p.id, nombre: p.nombre, cantidad: 1, precio_costo: p.precio_costo ?? 0, esNuevo: true }])
    setBusqProd('')
    setShowBusq(false)
  }

  function agregarLibre() {
    setRepuestos(prev => [...prev, { id: crypto.randomUUID(), product_id: null, nombre: '', cantidad: 1, precio_costo: 0, esNuevo: true }])
  }

  function actualizarRepuesto(id: string, campo: keyof Repuesto, valor: unknown) {
    setRepuestos(prev => prev.map(r => r.id === id ? { ...r, [campo]: valor } : r))
  }

  function quitarRepuesto(id: string) { setRepuestos(prev => prev.filter(r => r.id !== id)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { toast.error('Escribe el nombre del servicio'); return }
    setLoading(true)

    // Validar nombre duplicado (excluir el servicio actual si es edición)
    const { data: existente } = await supabase
      .from('repair_services')
      .select('id')
      .ilike('nombre', nombre.trim())
      .maybeSingle()
    if (existente && existente.id !== servicio?.id) {
      toast.error(`Ya existe un servicio llamado "${nombre.trim()}"`)
      setLoading(false)
      return
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      tipo_reparacion: tipo,
      precio_base: parseInt(precioBase) || 0,
      tiempo_estimado_min: parseInt(tiempoMin) || null,
      activo,
      mano_obra_tipo: manoObraTipo,
      mano_obra_valor: parseFloat(manoObraValor) || 0,
      updated_at: new Date().toISOString(),
    }

    let serviceId = servicio?.id
    if (servicio) {
      const { error } = await supabase.from('repair_services').update(payload).eq('id', servicio.id)
      if (error) { toast.error('Error: ' + error.message); setLoading(false); return }
      // Eliminar items anteriores y reinsertar
      await supabase.from('repair_service_items').delete().eq('service_id', servicio.id)
    } else {
      const { data, error } = await supabase.from('repair_services').insert(payload).select('id').single()
      if (error) { toast.error('Error: ' + error.message); setLoading(false); return }
      serviceId = data.id
    }

    if (repuestos.length > 0 && serviceId) {
      await supabase.from('repair_service_items').insert(
        repuestos.map(r => ({
          service_id: serviceId,
          product_id: r.product_id || null,
          nombre: r.nombre.trim(),
          cantidad: r.cantidad,
          precio_costo: r.precio_costo,
        }))
      )
    }

    toast.success(servicio ? 'Servicio actualizado' : 'Servicio creado')
    router.push(returnTo ?? '/servicios')
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">

      {/* Datos básicos */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Datos del servicio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nombre del servicio <span className="text-red-500">*</span></Label>
            <Input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="ej: Cambio de pantalla iPhone 13" required />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Descripción</Label>
            <Textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Describe qué incluye el servicio..." rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de reparación</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {TIPOS.map(t => (
                <button key={t.value} type="button" onClick={() => setTipo(t.value)}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${tipo === t.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tiempo estimado (minutos)</Label>
              <Input type="number" min={1} value={tiempoMin} onChange={e => setTiempoMin(e.target.value)} placeholder="60" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="activo" checked={activo} onChange={e => setActivo(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="activo" className="text-sm text-gray-700 cursor-pointer">Servicio activo</label>
            </div>
          </div>
        </div>
      </div>

      {/* Repuestos */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Repuestos y materiales incluidos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Al aplicar este servicio a una OT se agregarán automáticamente</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={agregarLibre} className="text-xs">+ Ítem libre</Button>
            <Button type="button" size="sm" onClick={() => setShowBusq(s => !s)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
              {showBusq ? '✕ Cerrar' : '🔍 Buscar en inventario'}
            </Button>
          </div>
        </div>

        {showBusq && (
          <div className="relative">
            <Input autoFocus value={busqProd} onChange={e => setBusqProd(e.target.value)} placeholder="Nombre o SKU del producto..." />
            {filtProd.length > 0 && (
              <div className="absolute z-10 left-0 right-0 bg-white border rounded-xl shadow-xl mt-1 overflow-hidden">
                {filtProd.map(p => (
                  <button key={p.id} type="button" onClick={() => agregarProducto(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 text-left border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                      <p className="text-xs text-gray-400">{p.sku}</p>
                    </div>
                    <span className="text-sm text-blue-700 font-semibold ml-3 shrink-0">{formatCLP(p.precio_costo)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {repuestos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 border-2 border-dashed rounded-xl">Sin repuestos agregados</p>
        ) : (
          <div className="space-y-2">
            {repuestos.map(r => (
              <div key={r.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                <input
                  value={r.nombre}
                  onChange={e => actualizarRepuesto(r.id, 'nombre', e.target.value)}
                  placeholder="Nombre del repuesto"
                  className="flex-1 min-w-0 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => actualizarRepuesto(r.id, 'cantidad', Math.max(1, r.cantidad - 1))}
                    className="w-6 h-6 rounded border bg-white text-sm font-bold flex items-center justify-center hover:bg-gray-100">−</button>
                  <span className="w-6 text-center text-sm font-semibold">{r.cantidad}</span>
                  <button type="button" onClick={() => actualizarRepuesto(r.id, 'cantidad', r.cantidad + 1)}
                    className="w-6 h-6 rounded border bg-white text-sm font-bold flex items-center justify-center hover:bg-gray-100">+</button>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <span className="text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={r.precio_costo}
                    onChange={e => actualizarRepuesto(r.id, 'precio_costo', parseInt(e.target.value) || 0)}
                    className="w-20 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-20 text-right shrink-0">{formatCLP(r.precio_costo * r.cantidad)}</span>
                <button type="button" onClick={() => quitarRepuesto(r.id)} className="text-red-400 hover:text-red-600 shrink-0">✕</button>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1 border-t text-sm font-semibold text-gray-700">
              <span>Total repuestos</span>
              <span>{formatCLP(costoRepuestos)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Precio */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Precio y mano de obra</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Precio base del servicio (CLP) <span className="text-red-500">*</span></Label>
            <Input type="number" min={0} value={precioBase} onChange={e => setPrecioBase(e.target.value)}
              placeholder="0" required />
            <p className="text-xs text-gray-400">Lo que paga el cliente</p>
          </div>
          <div className="space-y-1.5">
            <Label>Precio costo del servicio (CLP)</Label>
            <Input type="number" min={0}
              value={String((servicio as unknown as Record<string,unknown>)?.precio_costo ?? 0)}
              readOnly
              className="bg-gray-50 text-gray-500"
              placeholder="0" />
            <p className="text-xs text-gray-400">Se calcula en el módulo de Servicios</p>
          </div>
        </div>

        {/* Mano de obra */}
        <div className="border rounded-xl p-4 space-y-3 bg-blue-50 border-blue-200">
          <p className="text-sm font-semibold text-blue-800">🔧 Mano de obra del técnico</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de cálculo</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { key: 'porcentaje', label: '% del precio' },
                  { key: 'utilidad',   label: '% utilidad'   },
                  { key: 'monto',      label: '$ monto fijo' },
                ] as const).map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setManoObraTipo(key)}
                    className={`py-2 rounded-lg border text-xs font-medium transition-colors ${manoObraTipo === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {manoObraTipo === 'utilidad' && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1">
                  Base = precio − repuestos ({formatCLP(Math.max(0, utilidadBruta))})
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                {manoObraTipo === 'monto' ? 'Monto fijo (CLP)' : `Porcentaje (%) sobre ${manoObraTipo === 'utilidad' ? 'la utilidad bruta' : 'el precio base'}`}
              </Label>
              <div className="flex items-center gap-1">
                <Input type="number" min={0} max={manoObraTipo !== 'monto' ? 100 : undefined}
                  value={manoObraValor} onChange={e => setManoObraValor(e.target.value)} placeholder="0" />
                <span className="text-xs text-gray-500 shrink-0">{manoObraTipo === 'monto' ? 'CLP' : '%'}</span>
              </div>
            </div>
          </div>
          {manoObraNum > 0 && (
            <p className="text-xs text-blue-700 font-medium">
              Mano de obra calculada: <strong>{formatCLP(manoObraNum)}</strong>
              {manoObraTipo === 'porcentaje' && precio > 0 && ` (${manoObraValor}% de ${formatCLP(precio)})`}
              {manoObraTipo === 'utilidad'   && utilidadBruta > 0 && ` (${manoObraValor}% de ${formatCLP(utilidadBruta)} utilidad bruta)`}
            </p>
          )}
        </div>

        {/* Resumen financiero */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Costo repuestos</span><span>−{formatCLP(costoRepuestos)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Mano de obra</span><span>−{formatCLP(manoObraNum)}</span>
          </div>
          <div className={`flex justify-between font-semibold border-t pt-2 ${utilidadNeta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            <span>Utilidad neta del servicio</span><span>{formatCLP(utilidadNeta)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-2">
            <span>Precio a cobrar</span><span className="text-blue-700">{formatCLP(precio)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Margen s/repuestos</span>
            <span className={`font-semibold ${margen >= 50 ? 'text-green-700' : margen >= 20 ? 'text-amber-600' : 'text-red-500'}`}>{margen}%</span>
          </div>
          {precio > 0 && utilidadNeta < 0 && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
              ⚠️ La utilidad es negativa — el precio no cubre repuestos + mano de obra
            </p>
          )}
          {precio > 0 && precio < precioSugerido && utilidadNeta >= 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
              ⚠️ El precio está por debajo del costo + mano de obra ({formatCLP(precioSugerido)})
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pb-20 md:pb-4">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? 'Guardando...' : servicio ? 'Actualizar servicio' : 'Crear servicio'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
