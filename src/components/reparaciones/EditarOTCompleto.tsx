'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { formatCLP, formatRut } from '@/lib/calculations'
import { soundSave, soundError } from '@/lib/sounds'
import TipoEquipoSelector from '@/components/reparaciones/TipoEquipoSelector'
import { MarcaSelector, ModeloSelector } from '@/components/reparaciones/MarcaModeloCombo'
import AccesoriosCondicionFields from '@/components/reparaciones/AccesoriosCondicionFields'
import { getConfigTipoEquipo, resolveTemplate } from '@/lib/tipoEquipo'
import { buildAccesorios, buildCondicion, parseAccesorios, parseCondicion, type AccState, type CondState } from '@/lib/recepcionEquipo'
import { useTiposEquipo } from '@/hooks/useTiposEquipo'

const TIPOS_REP = [
  { value: 'pantalla', label: '📱 Pantalla' }, { value: 'bateria', label: '🔋 Batería' },
  { value: 'placa', label: '🔬 Placa madre' }, { value: 'software', label: '💻 Software' },
  { value: 'camara', label: '📷 Cámara' }, { value: 'conector', label: '🔌 Conector' },
  { value: 'otro', label: '🔧 Otro' },
]

interface RepuestoLocal {
  _key: string; product_id: string | null; nombre: string; cantidad: number
  precio_costo: number; precio_venta: number
}

interface OTCompleta {
  id: string; numero_ot: string; estado: string
  customer_id: string
  equipment_id: string
  tecnico_id?: string | null
  tipo_reparacion?: string | null
  presupuesto_estimado?: number | null
  precio_servicio?: number | null
  fecha_estimada_entrega?: string | null
  diagnostico_tecnico?: string | null
  customers: { id: string; nombre: string; telefono: string; rut?: string | null; email?: string | null } | null
  equipment: {
    id: string; tipo_equipo?: string | null; marca: string; modelo: string
    imei?: string | null; imei2?: string | null; numero_serie?: string | null
    color?: string | null; capacidad?: string | null
    falla_reportada?: string; observaciones?: string | null
    accesorios?: string[] | null; condicion_visual?: string[] | null
  } | null
  user_profiles?: { id: string; nombre_completo: string } | null
}

export default function EditarOTCompleto({
  ot, tecnicos, repuestosIniciales, puedeCambiarTecnico = true,
}: {
  ot: OTCompleta
  tecnicos: { id: string; nombre_completo: string }[]
  repuestosIniciales: RepuestoLocal[]
  puedeCambiarTecnico?: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const eq = ot.equipment

  // ── Estados ──────────────────────────────────────────────────────────────
  const { tipos: tiposEquipo } = useTiposEquipo()
  const configTipoEquipo = (tipo: string) => getConfigTipoEquipo(resolveTemplate(tiposEquipo, tipo))
  const [loading, setLoading] = useState(false)
  const [equipo, setEquipo] = useState({
    tipo_equipo: eq?.tipo_equipo ?? '',
    marca: eq?.marca ?? '',
    modelo: eq?.modelo ?? '',
    imei: eq?.imei ?? '',
    color: eq?.color ?? '',
    capacidad: eq?.capacidad ?? '',
    observaciones: eq?.observaciones ?? '',
    falla_reportada: eq?.falla_reportada ?? '',
  })
  const [imei2, setImei2] = useState(eq?.imei2 ?? '')
  const [numeroSerie, setNumeroSerie] = useState(eq?.numero_serie ?? '')
  const [acc, setAcc] = useState<AccState>(() => parseAccesorios(eq?.accesorios ?? null, configTipoEquipo(eq?.tipo_equipo ?? '')))
  const [cond, setCond] = useState<CondState>(() => parseCondicion(eq?.condicion_visual ?? null, configTipoEquipo(eq?.tipo_equipo ?? '')))
  const [tecnicoId, setTecnicoId] = useState(ot.tecnico_id ?? '')
  const [tipoReparacion, setTipoReparacion] = useState(ot.tipo_reparacion ?? '')
  const [presupuesto, setPresupuesto] = useState(String(ot.presupuesto_estimado ?? ''))
  const [precioServicio, setPrecioServicio] = useState(String(ot.precio_servicio ?? ''))
  const [fechaEntrega, setFechaEntrega] = useState(ot.fecha_estimada_entrega?.split('T')[0] ?? '')
  const [diagnostico, setDiagnostico] = useState(ot.diagnostico_tecnico ?? '')
  const [repuestos, setRepuestos] = useState<RepuestoLocal[]>(repuestosIniciales)
  const [prodSearch, setProdSearch] = useState('')
  const [prodResults, setProdResults] = useState<{ id: string; nombre: string; precio_costo: number; precio_venta: number }[]>([])
  const [prodOpen, setProdOpen] = useState(false)
  const prodRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trimmed = prodSearch.trim()
    if (trimmed.length < 2) { setProdResults([]); setProdOpen(false); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('products').select('id, nombre, precio_costo, precio_venta').ilike('nombre', `%${trimmed}%`).limit(8)
      setProdResults((data ?? []) as { id: string; nombre: string; precio_costo: number; precio_venta: number }[])
      setProdOpen(true)
    }, 300)
    return () => clearTimeout(t)
  }, [prodSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function h(e: MouseEvent) { if (prodRef.current && !prodRef.current.contains(e.target as Node)) setProdOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function agregarProducto(p: { id: string; nombre: string; precio_costo: number; precio_venta: number }) {
    setRepuestos(prev => [...prev, { _key: crypto.randomUUID(), product_id: p.id, nombre: p.nombre, cantidad: 1, precio_costo: p.precio_costo, precio_venta: p.precio_venta || p.precio_costo }])
    setProdSearch(''); setProdResults([]); setProdOpen(false)
  }

  async function handleGuardar() {
    if (!equipo.marca.trim() || !equipo.modelo.trim()) { toast.error('Marca y modelo son obligatorios'); return }
    if (!equipo.falla_reportada.trim()) { toast.error('La falla reportada es obligatoria'); return }
    setLoading(true)

    // 1. Actualizar equipo
    const configTipo = configTipoEquipo(equipo.tipo_equipo)
    const { error: eqErr } = await supabase.from('equipment').update({
      tipo_equipo: equipo.tipo_equipo || null,
      marca: equipo.marca.trim(),
      modelo: equipo.modelo.trim(),
      imei: equipo.imei.trim() || null,
      imei2: imei2.trim() || null,
      numero_serie: numeroSerie.trim() || null,
      color: equipo.color.trim() || null,
      capacidad: equipo.capacidad.trim() || null,
      falla_reportada: equipo.falla_reportada.trim(),
      observaciones: equipo.observaciones.trim() || null,
      accesorios: buildAccesorios(acc, configTipo),
      condicion_visual: buildCondicion(cond, configTipo),
    }).eq('id', ot.equipment_id)
    if (eqErr) { soundError(); toast.error('Error al actualizar equipo: ' + eqErr.message); setLoading(false); return }

    // 2. Actualizar OT
    const { error: otErr } = await supabase.from('repair_orders').update({
      tecnico_id: tecnicoId || null,
      tipo_reparacion: tipoReparacion || null,
      presupuesto_estimado: presupuesto ? parseFloat(presupuesto) : null,
      precio_servicio: precioServicio ? parseFloat(precioServicio) : null,
      fecha_estimada_entrega: fechaEntrega || null,
      diagnostico_tecnico: diagnostico.trim() || null,
    }).eq('id', ot.id)
    if (otErr) { toast.error('Error al actualizar OT: ' + otErr.message); setLoading(false); return }

    // 3. Repuestos: borrar los actuales e insertar los nuevos
    await supabase.from('repair_items').delete().eq('repair_order_id', ot.id)
    if (repuestos.length > 0) {
      const payload = repuestos.map(r => ({ repair_order_id: ot.id, product_id: r.product_id, nombre: r.nombre, cantidad: r.cantidad, precio_costo: r.precio_costo, precio_venta: r.precio_venta, costo_envio: 0 }))
      const { error: riErr } = await supabase.from('repair_items').insert(payload)
      if (riErr?.message?.includes('precio_venta')) {
        await supabase.from('repair_items').insert(payload.map(({ precio_venta: _, ...rest }) => rest))
      }
    }

    soundSave()
    toast.success(`OT ${ot.numero_ot} actualizada correctamente`)
    router.push(`/reparaciones/${ot.id}`)
    router.refresh()
  }

  const configTipoActual = configTipoEquipo(equipo.tipo_equipo)

  return (
    <div className="space-y-5">
      {/* Cliente (solo lectura) */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Cliente</h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
            {ot.customers?.nombre?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{ot.customers?.nombre ?? '—'}</p>
            <p className="text-sm text-gray-500">{ot.customers?.telefono}{ot.customers?.rut ? ` · RUT: ${formatRut(ot.customers.rut)}` : ''}</p>
          </div>
        </div>
      </div>

      {/* Equipo */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">1. Equipo</h2>
        <TipoEquipoSelector
          value={equipo.tipo_equipo}
          onChange={v => setEquipo(e => ({ ...e, tipo_equipo: v }))}
          tipos={tiposEquipo}
        />
        <div className="grid grid-cols-2 gap-3">
          <MarcaSelector value={equipo.marca} onChange={(v: string) => setEquipo(e => ({ ...e, marca: v }))} />
          <ModeloSelector marca={equipo.marca} value={equipo.modelo} onChange={(v: string) => setEquipo(e => ({ ...e, modelo: v }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {configTipoActual.identificacion.imei && (
            <>
              <div className="space-y-1"><Label>IMEI 1</Label><Input value={equipo.imei} onChange={e => setEquipo(p => ({ ...p, imei: e.target.value }))} /></div>
              <div className="space-y-1"><Label>IMEI 2</Label><Input value={imei2} onChange={e => setImei2(e.target.value)} /></div>
            </>
          )}
          {configTipoActual.identificacion.numeroSerie && (
            <div className="space-y-1"><Label>N° Serie</Label><Input value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} /></div>
          )}
          <div className="space-y-1"><Label>Color</Label><Input value={equipo.color} onChange={e => setEquipo(p => ({ ...p, color: e.target.value }))} /></div>
          <div className="space-y-1"><Label>Capacidad / Almacenamiento</Label><Input value={equipo.capacidad} onChange={e => setEquipo(p => ({ ...p, capacidad: e.target.value }))} /></div>
        </div>
        <div className="space-y-1">
          <Label>Falla reportada por el cliente <span className="text-red-500">*</span></Label>
          <Textarea value={equipo.falla_reportada} onChange={e => setEquipo(p => ({ ...p, falla_reportada: e.target.value }))} rows={2} />
        </div>
        <div className="space-y-1">
          <Label>Observaciones del equipo</Label>
          <Textarea value={equipo.observaciones} onChange={e => setEquipo(p => ({ ...p, observaciones: e.target.value }))} rows={2} />
        </div>
      </div>

      {/* Accesorios y condición */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">2. Accesorios y condición del equipo</h2>
        <AccesoriosCondicionFields
          tipoEquipo={resolveTemplate(tiposEquipo, equipo.tipo_equipo)}
          acc={acc} onAccChange={setAcc}
          cond={cond} onCondChange={setCond}
        />
      </div>

      {/* Orden de trabajo */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">3. Orden de trabajo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Técnico</Label>
            {puedeCambiarTecnico ? (
              <Select value={tecnicoId || 'none'} onValueChange={v => setTecnicoId(!v || v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <span className="truncate text-sm">{!tecnicoId ? 'Sin asignar' : (tecnicos.find(t => t.id === tecnicoId)?.nombre_completo ?? 'Sin asignar')}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {tecnicos.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre_completo}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-gray-600 border rounded-lg px-3 py-2 bg-gray-50">
                {!tecnicoId ? 'Sin asignar' : (tecnicos.find(t => t.id === tecnicoId)?.nombre_completo ?? 'Sin asignar')}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Tipo de reparación</Label>
            <Select value={tipoReparacion || 'none'} onValueChange={v => setTipoReparacion(!v || v === 'none' ? '' : v)}>
              <SelectTrigger>
                <span className="truncate text-sm">{!tipoReparacion ? 'Sin especificar' : (TIPOS_REP.find(t => t.value === tipoReparacion)?.label ?? tipoReparacion)}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {TIPOS_REP.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Presupuesto estimado (CLP)</Label><Input type="number" min={0} value={presupuesto} onChange={e => setPresupuesto(e.target.value)} /></div>
          <div className="space-y-1"><Label>Precio servicio (CLP)</Label><Input type="number" min={0} value={precioServicio} onChange={e => setPrecioServicio(e.target.value)} /></div>
          <div className="space-y-1"><Label>Fecha tentativa de entrega</Label><Input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} /></div>
        </div>
        <div className="space-y-1">
          <Label>Diagnóstico técnico</Label>
          <Textarea value={diagnostico} onChange={e => setDiagnostico(e.target.value)} rows={3} placeholder="Describe el diagnóstico y la reparación realizada..." />
        </div>
      </div>

      {/* Repuestos */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">4. Repuestos <span className="text-gray-400 font-normal text-sm">(opcional)</span></h2>
        <div ref={prodRef} className="relative">
          <Input placeholder="🔍 Buscar repuesto del inventario..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} onFocus={() => prodResults.length > 0 && setProdOpen(true)} />
          {prodOpen && prodResults.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {prodResults.map(p => (
                <button key={p.id} type="button" onClick={() => agregarProducto(p)}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm border-b last:border-0 flex justify-between items-center gap-2">
                  <span className="font-medium truncate">{p.nombre}</span>
                  <span className="text-blue-600 text-xs shrink-0">{formatCLP(p.precio_venta || p.precio_costo)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {repuestos.length > 0 && (
          <div className="space-y-2">
            {repuestos.map(r => (
              <div key={r._key} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.nombre}</p>
                  <p className="text-xs text-gray-400">{formatCLP(r.precio_costo)} costo · {formatCLP(r.precio_venta)} venta</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setRepuestos(p => p.map(x => x._key === r._key ? { ...x, cantidad: Math.max(1, x.cantidad - 1) } : x))} className="w-7 h-7 rounded border bg-white flex items-center justify-center text-sm font-bold">−</button>
                  <span className="w-6 text-center text-sm font-semibold">{r.cantidad}</span>
                  <button type="button" onClick={() => setRepuestos(p => p.map(x => x._key === r._key ? { ...x, cantidad: x.cantidad + 1 } : x))} className="w-7 h-7 rounded border bg-white flex items-center justify-center text-sm font-bold">+</button>
                </div>
                <button type="button" onClick={() => setRepuestos(p => p.filter(x => x._key !== r._key))} className="text-red-400 hover:text-red-600">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <Button onClick={handleGuardar} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? 'Guardando...' : '💾 Guardar cambios'}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/reparaciones/${ot.id}`)}>Cancelar</Button>
      </div>
    </div>
  )
}
