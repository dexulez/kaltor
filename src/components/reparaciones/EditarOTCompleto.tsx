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

const TIPOS_REP = [
  { value: 'pantalla', label: '📱 Pantalla' }, { value: 'bateria', label: '🔋 Batería' },
  { value: 'placa', label: '🔬 Placa madre' }, { value: 'software', label: '💻 Software' },
  { value: 'camara', label: '📷 Cámara' }, { value: 'conector', label: '🔌 Conector' },
  { value: 'otro', label: '🔧 Otro' },
]
const AREAS = ['Pantalla', 'Middle Frame', 'Tapa trasera', 'Botones', 'Puerto carga', 'Altavoz', 'Cámara', 'Bisagra']
const AREAS_HUM = ['Conector de carga', 'Bandeja de SIM', 'Auriculares', 'Altavoz', 'Placa', 'Cámara']
const MICROSD_SIZES = ['8GB', '16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB']

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

// Parsers para inicializar estados desde arrays guardados
function parseAccesorios(accs: string[] | null) {
  const arr = accs ?? []
  const sim1 = arr.find(a => a.startsWith('SIM 1'))
  const sim2 = arr.find(a => a.startsWith('SIM 2'))
  const microsd = arr.find(a => a.startsWith('MicroSD') && !a.startsWith('Sin'))
  const mandoEntry = arr.find(a => a.startsWith('Mando'))
  return {
    acc: {
      cargador: arr.includes('Cargador'), cable: arr.includes('Cable'),
      cajaCaraga: arr.includes('Caja de carga'), funda: arr.includes('Funda'),
      bandejaSim: arr.includes('Bandeja de SIM'),
      microsd: !!microsd,
      sim: !!(sim1 || sim2),
      simCantidad: (sim1 && sim2 ? 2 : 1) as 1 | 2,
      sim1Carrier: sim1?.split(': ')[1] ?? '',
      sim2Carrier: sim2?.split(': ')[1] ?? '',
      juego: arr.includes('Juego'),
      mando: !!mandoEntry,
      mandoCantidad: mandoEntry ? (parseInt(mandoEntry.split('×')[1] ?? '1') || 1) : 1,
    },
    microsdTamano: microsd?.split(' ')[1] ?? '',
  }
}

function parseCond(conds: string[] | null) {
  const arr = conds ?? []
  const cargaEntry = arr.find(a => a.startsWith('Carga:'))
  const rayEntry = arr.find(a => a.startsWith('Rayones:'))
  const golEntry = arr.find(a => a.startsWith('Golpes:'))
  const humEntry = arr.find(a => a.startsWith('Humedad:'))
  const queEntry = arr.find(a => a.startsWith('Quemaduras:'))
  const splitAreas = (e?: string) => e ? e.split(': ')[1]?.split(', ').map(s => s.trim()).filter(Boolean) ?? [] : []
  return {
    equipo_apagado: arr.includes('Equipo apagado'),
    sin_danos: arr.includes('Sin daños visibles'),
    carga: arr.includes('No carga') ? 'no_carga' : cargaEntry ? 'si' : '' as '' | 'si' | 'no_carga',
    cargaVoltios: cargaEntry ? (cargaEntry.match(/(\d+[.,]\d+|\d+)V/) ?? [])[1] ?? '' : '',
    cargaAmperaje: cargaEntry ? (cargaEntry.match(/(\d+[.,]\d+|\d+)A/) ?? [])[1] ?? '' : '',
    rayones: splitAreas(rayEntry),
    golpes: splitAreas(golEntry),
    pantalla_trizada: arr.includes('Pantalla trizada'),
    marco_doblado: arr.includes('Marco doblado'),
    humedad: splitAreas(humEntry),
    quemaduras: splitAreas(queEntry),
  }
}

export default function EditarOTCompleto({
  ot, tecnicos, repuestosIniciales,
}: {
  ot: OTCompleta
  tecnicos: { id: string; nombre_completo: string }[]
  repuestosIniciales: RepuestoLocal[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const eq = ot.equipment
  const { acc: accInicial, microsdTamano: microsdInicial } = parseAccesorios(eq?.accesorios ?? null)
  const condInicial = parseCond(eq?.condicion_visual ?? null)

  // ── Estados ──────────────────────────────────────────────────────────────
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
  const [acc, setAcc] = useState({ ...accInicial })
  const [microsdTamano, setMicrosdTamano] = useState(microsdInicial)
  const [cond, setCond] = useState(condInicial)
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

  function buildAccesorios(): string[] {
    const r: string[] = []
    if (acc.cargador) r.push('Cargador')
    if (acc.cable) r.push('Cable')
    if (acc.cajaCaraga) r.push('Caja de carga')
    if (acc.funda) r.push('Funda')
    r.push(acc.bandejaSim ? 'Bandeja de SIM' : 'Sin Bandeja de SIM')
    if (acc.microsd) r.push(microsdTamano ? `MicroSD ${microsdTamano}` : 'MicroSD')
    else r.push('Sin MicroSD')
    if (acc.sim) {
      if (acc.simCantidad >= 1) r.push(`SIM 1${acc.sim1Carrier ? `: ${acc.sim1Carrier}` : ''}`)
      if (acc.simCantidad === 2) r.push(`SIM 2${acc.sim2Carrier ? `: ${acc.sim2Carrier}` : ''}`)
    } else r.push('Sin SIM card')
    if (acc.juego) r.push('Juego')
    if (acc.mando) r.push(acc.mandoCantidad > 1 ? `Mando ×${acc.mandoCantidad}` : 'Mando')
    return r
  }

  function buildCondicion(): string[] {
    const r: string[] = []
    if (cond.equipo_apagado) r.push('Equipo apagado')
    if (cond.carga === 'si') {
      const v = cond.cargaVoltios.trim(); const a = cond.cargaAmperaje.trim()
      r.push(`Carga: ${v ? v + 'V' : ''}${v && a ? ' / ' : ''}${a ? a + 'A' : ''}`.trim().replace(/Carga: $/, 'Carga: Sí'))
    }
    if (cond.carga === 'no_carga') r.push('No carga')
    if (cond.sin_danos) r.push('Sin daños visibles')
    if (cond.rayones.length) r.push(`Rayones: ${cond.rayones.join(', ')}`)
    if (cond.golpes.length) r.push(`Golpes: ${cond.golpes.join(', ')}`)
    if (cond.pantalla_trizada) r.push('Pantalla trizada')
    if (cond.marco_doblado) r.push('Marco doblado')
    if (cond.humedad.length) r.push(`Humedad: ${cond.humedad.join(', ')}`)
    if (cond.quemaduras.length) r.push(`Quemaduras: ${cond.quemaduras.join(', ')}`)
    return r
  }

  function agregarProducto(p: { id: string; nombre: string; precio_costo: number; precio_venta: number }) {
    setRepuestos(prev => [...prev, { _key: crypto.randomUUID(), product_id: p.id, nombre: p.nombre, cantidad: 1, precio_costo: p.precio_costo, precio_venta: p.precio_venta || p.precio_costo }])
    setProdSearch(''); setProdResults([]); setProdOpen(false)
  }

  async function handleGuardar() {
    if (!equipo.marca.trim() || !equipo.modelo.trim()) { toast.error('Marca y modelo son obligatorios'); return }
    if (!equipo.falla_reportada.trim()) { toast.error('La falla reportada es obligatoria'); return }
    setLoading(true)

    // 1. Actualizar equipo
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
      accesorios: buildAccesorios(),
      condicion_visual: buildCondicion(),
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

  const chip = (active: boolean, onClick: () => void, label: string, activeClass = 'bg-blue-600 text-white border-blue-600') =>
    <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? activeClass : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>{label}</button>

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
        />
        <div className="grid grid-cols-2 gap-3">
          <MarcaSelector value={equipo.marca} onChange={(v: string) => setEquipo(e => ({ ...e, marca: v }))} />
          <ModeloSelector marca={equipo.marca} value={equipo.modelo} onChange={(v: string) => setEquipo(e => ({ ...e, modelo: v }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>IMEI 1</Label><Input value={equipo.imei} onChange={e => setEquipo(p => ({ ...p, imei: e.target.value }))} /></div>
          <div className="space-y-1"><Label>IMEI 2</Label><Input value={imei2} onChange={e => setImei2(e.target.value)} /></div>
          <div className="space-y-1"><Label>N° Serie</Label><Input value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} /></div>
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

      {/* Accesorios */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">2. Accesorios</h2>
        <div className="flex flex-wrap gap-2">
          {chip(acc.cargador, () => setAcc(a => ({ ...a, cargador: !a.cargador })), 'Cargador')}
          {chip(acc.cable, () => setAcc(a => ({ ...a, cable: !a.cable })), 'Cable')}
          {chip(acc.cajaCaraga, () => setAcc(a => ({ ...a, cajaCaraga: !a.cajaCaraga })), 'Caja de carga')}
          {chip(acc.funda, () => setAcc(a => ({ ...a, funda: !a.funda })), 'Funda')}
          {chip(acc.juego, () => setAcc(a => ({ ...a, juego: !a.juego })), '🎮 Juego')}
        </div>

        {/* Bandeja, SIM, MicroSD — siempre anotados */}
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 font-medium">Siempre registrados (con o sin):</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAcc(a => ({ ...a, bandejaSim: !a.bandejaSim }))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${acc.bandejaSim ? 'bg-blue-600 text-white border-blue-600' : 'bg-red-50 text-red-600 border-red-300'}`}>
              {acc.bandejaSim ? '✓ Bandeja de SIM' : 'Sin Bandeja de SIM'}
            </button>
            <button type="button" onClick={() => setAcc(a => ({ ...a, sim: !a.sim }))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${acc.sim ? 'bg-blue-600 text-white border-blue-600' : 'bg-red-50 text-red-600 border-red-300'}`}>
              {acc.sim ? '✓ SIM card' : 'Sin SIM card'}
            </button>
            <button type="button" onClick={() => { setAcc(a => ({ ...a, microsd: !a.microsd })); if (acc.microsd) setMicrosdTamano('') }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${acc.microsd ? 'bg-blue-600 text-white border-blue-600' : 'bg-red-50 text-red-600 border-red-300'}`}>
              {acc.microsd ? '✓ MicroSD' : 'Sin MicroSD'}
            </button>
          </div>
        </div>

        {/* Mando con cantidad */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAcc(a => ({ ...a, mando: !a.mando, mandoCantidad: 1 }))}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${acc.mando ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
            🎮 Mando
          </button>
          {acc.mando && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-2 py-1">
              <button type="button" onClick={() => setAcc(a => ({ ...a, mandoCantidad: Math.max(1, a.mandoCantidad - 1) }))}
                className="w-5 h-5 rounded-full bg-white border border-blue-300 flex items-center justify-center text-xs font-bold text-blue-700">−</button>
              <span className="text-xs font-semibold text-blue-700 w-4 text-center">{acc.mandoCantidad}</span>
              <button type="button" onClick={() => setAcc(a => ({ ...a, mandoCantidad: a.mandoCantidad + 1 }))}
                className="w-5 h-5 rounded-full bg-white border border-blue-300 flex items-center justify-center text-xs font-bold text-blue-700">+</button>
            </div>
          )}
        </div>
        {acc.microsd && (
          <div className="ml-2 pl-3 border-l-2 border-blue-200">
            <p className="text-xs text-gray-600 font-medium mb-1.5">Tamaño</p>
            <div className="flex flex-wrap gap-1.5">
              {MICROSD_SIZES.map(s => chip(microsdTamano === s, () => setMicrosdTamano(t => t === s ? '' : s), s, 'bg-blue-600 text-white border-blue-600'))}
            </div>
          </div>
        )}
        {acc.sim && (
          <div className="ml-2 pl-3 border-l-2 border-blue-200 space-y-2">
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-600 font-medium">¿Cuántas SIM?</span>
              {([1, 2] as const).map(n => chip(acc.simCantidad === n, () => setAcc(a => ({ ...a, simCantidad: n })), String(n)))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Operadora SIM 1</Label><Input value={acc.sim1Carrier} onChange={e => setAcc(a => ({ ...a, sim1Carrier: e.target.value }))} placeholder="Ej: Claro" /></div>
              {acc.simCantidad === 2 && <div><Label className="text-xs">Operadora SIM 2</Label><Input value={acc.sim2Carrier} onChange={e => setAcc(a => ({ ...a, sim2Carrier: e.target.value }))} placeholder="Ej: Entel" /></div>}
            </div>
          </div>
        )}
      </div>

      {/* Condición */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">3. Condición del equipo</h2>
        <div className="flex flex-wrap gap-2">
          {chip(cond.equipo_apagado, () => setCond(c => ({ ...c, equipo_apagado: !c.equipo_apagado })), '📵 Apagado', 'bg-gray-700 text-white border-gray-700')}
          {chip(cond.sin_danos, () => setCond(c => ({ ...c, sin_danos: !c.sin_danos })), '✅ Sin daños')}
          {chip(cond.pantalla_trizada, () => setCond(c => ({ ...c, pantalla_trizada: !c.pantalla_trizada })), 'Pantalla trizada', 'bg-orange-500 text-white border-orange-500')}
          {chip(cond.marco_doblado, () => setCond(c => ({ ...c, marco_doblado: !c.marco_doblado })), 'Marco doblado', 'bg-orange-500 text-white border-orange-500')}
          {chip(cond.carga !== '', () => setCond(c => ({ ...c, carga: c.carga !== '' ? '' : 'si' })), '🔋 Carga')}
          {cond.carga !== '' && chip(cond.carga === 'no_carga', () => setCond(c => ({ ...c, carga: c.carga === 'no_carga' ? 'si' : 'no_carga' })), 'No carga', 'bg-red-500 text-white border-red-500')}
        </div>
        {cond.carga === 'si' && (
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Voltios</Label><Input placeholder="Ej: 5" value={cond.cargaVoltios} onChange={e => setCond(c => ({ ...c, cargaVoltios: e.target.value }))} /></div>
            <div><Label className="text-xs">Amperaje</Label><Input placeholder="Ej: 0.9A" value={cond.cargaAmperaje} onChange={e => setCond(c => ({ ...c, cargaAmperaje: e.target.value }))} /></div>
          </div>
        )}
        {(['rayones', 'golpes'] as const).map(k => (
          <div key={k} className="space-y-1.5">
            <Label className="text-xs capitalize">{k === 'rayones' ? 'Rayones' : 'Golpes'}</Label>
            <div className="flex flex-wrap gap-1.5">
              {AREAS.map(a => chip(cond[k].includes(a), () => setCond(c => ({ ...c, [k]: c[k].includes(a) ? c[k].filter(x => x !== a) : [...c[k], a] })), a))}
            </div>
          </div>
        ))}
        {(['humedad', 'quemaduras'] as const).map(k => (
          <div key={k} className="space-y-1.5">
            <Label className="text-xs capitalize">{k === 'humedad' ? 'Humedad' : 'Quemaduras'}</Label>
            <div className="flex flex-wrap gap-1.5">
              {AREAS_HUM.map(a => chip(cond[k].includes(a), () => setCond(c => ({ ...c, [k]: c[k].includes(a) ? c[k].filter(x => x !== a) : [...c[k], a] })), a, k === 'humedad' ? 'bg-blue-600 text-white border-blue-600' : 'bg-red-500 text-white border-red-500'))}
            </div>
          </div>
        ))}
      </div>

      {/* Orden de trabajo */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">4. Orden de trabajo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Técnico</Label>
            <Select value={tecnicoId || 'none'} onValueChange={v => setTecnicoId(!v || v === 'none' ? '' : v)}>
              <SelectTrigger>
                <span className="truncate text-sm">{!tecnicoId ? 'Sin asignar' : (tecnicos.find(t => t.id === tecnicoId)?.nombre_completo ?? 'Sin asignar')}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {tecnicos.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre_completo}</SelectItem>)}
              </SelectContent>
            </Select>
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
        <h2 className="font-semibold text-gray-800">5. Repuestos <span className="text-gray-400 font-normal text-sm">(opcional)</span></h2>
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
