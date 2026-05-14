'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatRut } from '@/lib/calculations'
import { MarcaSelector, ModeloSelector } from '@/components/reparaciones/MarcaModeloCombo'
import Link from 'next/link'
const CAPACIDADES = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB']
const COLORES = ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde', 'Dorado', 'Plateado', 'Morado', 'Rosa', 'Otro']
const ACCESORIOS_OPTS = ['Cargador', 'Cable', 'Funda', 'Caja original', 'Audífonos', 'Vidrio templado']
const CONDICION_OPTS = ['Sin daños visibles', 'Rayones leves', 'Rayones profundos', 'Golpes', 'Pantalla rota', 'Marco doblado', 'Humedad', 'Quemaduras']
const TIPOS_REP = [
  { value: 'pantalla', label: 'Pantalla' },
  { value: 'bateria', label: 'Batería' },
  { value: 'placa', label: 'Placa' },
  { value: 'software', label: 'Software' },
  { value: 'camara', label: 'Cámara' },
  { value: 'conector', label: 'Conector' },
  { value: 'otro', label: 'Otro' },
]

interface Props {
  clientes: { id: string; nombre: string; telefono: string; rut?: string | null }[]
  tecnicos: { id: string; nombre_completo: string }[]
  clienteIdInicial?: string
}

export default function NuevaOTForm({ clientes, tecnicos, clienteIdInicial }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [clientesList, setClientesList] = useState(clientes)
  const [clienteId, setClienteId] = useState(clienteIdInicial ?? '')
  // ── Accesorios ──────────────────────────────────────────────────────────────
  const [acc, setAcc] = useState({
    cargador: false, cable: false, cajaCaraga: false, funda: false,
    bandejaSim: false, microsd: false, sim: false,
    simCantidad: 1 as 1 | 2, sim1Carrier: '', sim2Carrier: '',
  })
  function toggleAcc(k: keyof typeof acc) { setAcc(a => ({ ...a, [k]: !a[k] })) }

  // ── Operadoras SIM (localStorage) ────────────────────────────────────────
  const [savedCarriers, setSavedCarriers] = useState<string[]>([])
  useEffect(() => {
    try { setSavedCarriers(JSON.parse(localStorage.getItem('tr_sim_carriers') ?? '[]')) } catch { /* ignore */ }
  }, [])
  function saveCarrier(carrier: string) {
    const c = carrier.trim()
    if (!c || savedCarriers.includes(c)) return
    const updated = [...savedCarriers, c].sort()
    setSavedCarriers(updated)
    try { localStorage.setItem('tr_sim_carriers', JSON.stringify(updated)) } catch { /* ignore */ }
  }

  // ── Servicios disponibles ────────────────────────────────────────────────
  interface ServicioItem { id: string; nombre: string; tipo_reparacion: string; precio_base: number; descripcion: string | null }
  const [servicios, setServicios] = useState<ServicioItem[]>([])
  useEffect(() => {
    supabase.from('repair_services').select('id, nombre, tipo_reparacion, precio_base, descripcion').eq('activo', true).order('nombre')
      .then(({ data }) => setServicios((data ?? []) as ServicioItem[]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── IMEI / SN ────────────────────────────────────────────────────────────
  const [imeiCount, setImeiCount] = useState<1 | 2>(1)
  const [imei2, setImei2] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')

  // ── Condición visual y física ────────────────────────────────────────────
  const [cond, setCond] = useState({
    sin_danos: false,
    equipo_apagado: false,
    carga: '' as '' | 'si' | 'no_carga',
    cargaVoltios: '',
    cargaAmperaje: '',
    rayones: [] as string[],
    golpes: [] as string[],
    pantalla_trizada: false,
    marco_doblado: false,
    humedad: [] as string[],
    quemaduras: [] as string[],
  })
  function toggleCondSimple(k: 'sin_danos' | 'pantalla_trizada' | 'marco_doblado') {
    setCond(c => ({ ...c, [k]: !c[k] }))
  }
  function toggleCondArea(k: 'rayones' | 'golpes' | 'humedad' | 'quemaduras', area: string) {
    setCond(c => {
      const arr = c[k]
      return { ...c, [k]: arr.includes(area) ? arr.filter(a => a !== area) : [...arr, area] }
    })
  }
  function isCondActiva(k: 'sin_danos' | 'pantalla_trizada' | 'marco_doblado'): boolean { return cond[k] }
  function condAreas(k: 'rayones' | 'golpes' | 'humedad' | 'quemaduras'): string[] { return cond[k] }

  // Builders para enviar al DB
  function buildAccesorios(): string[] {
    const r: string[] = []
    if (acc.cargador) r.push('Cargador')
    if (acc.cable) r.push('Cable')
    if (acc.cajaCaraga) r.push('Caja de carga')
    if (acc.funda) r.push('Funda')
    if (acc.bandejaSim) r.push('Bandeja de SIM')
    if (acc.microsd) r.push('MicroSD')
    if (acc.sim) {
      if (acc.simCantidad >= 1) r.push(`SIM 1${acc.sim1Carrier ? `: ${acc.sim1Carrier}` : ''}`)
      if (acc.simCantidad === 2) r.push(`SIM 2${acc.sim2Carrier ? `: ${acc.sim2Carrier}` : ''}`)
    }
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
  const [popupClienteOpen, setPopupClienteOpen] = useState(false)
  const [guardandoCliente, setGuardandoCliente] = useState(false)

  // Combobox de cliente
  const [busqCliente, setBusqCliente] = useState('')
  const [comboOpen, setComboOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setComboOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q = busqCliente.trim().toLowerCase()
  const clientesFiltrados = q
    ? clientesList.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono.includes(q) ||
        (c.rut ?? '').toLowerCase().includes(q)
      ).slice(0, 8)
    : clientesList.slice(0, 8)

  const hayCoincidenciaExacta = clientesList.some(c => c.nombre.toLowerCase() === q)

  function seleccionarCliente(c: { id: string; nombre: string; telefono: string }) {
    setClienteId(c.id)
    setBusqCliente(c.nombre)
    setComboOpen(false)
  }

  function abrirCrearConNombre() {
    setNuevoCliente(v => ({ ...v, nombre: busqCliente.trim() }))
    setComboOpen(false)
    setPopupClienteOpen(true)
  }

  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    telefono: '',
    rut: '',
    email: '',
    direccion: '',
    notas: '',
  })

  const [equipo, setEquipo] = useState({
    marca: '', modelo: '', imei: '', color: '', capacidad: '',
    observaciones: '', falla_reportada: '',
  })
  const [ot, setOt] = useState({
    tecnico_id: '', tipo_reparacion: '', presupuesto_estimado: '', fecha_estimada_entrega: '',
  })

  function toggleCheck(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  async function crearClienteDesdePopup() {
    if (!nuevoCliente.nombre.trim()) {
      toast.error('Ingresa el nombre del cliente')
      return
    }
    if (!nuevoCliente.telefono.trim()) {
      toast.error('Ingresa el teléfono del cliente')
      return
    }

    setGuardandoCliente(true)

    const payload = {
      nombre: nuevoCliente.nombre.trim(),
      telefono: nuevoCliente.telefono.trim(),
      rut: nuevoCliente.rut.trim() || null,
      email: nuevoCliente.email.trim() || null,
      direccion: nuevoCliente.direccion.trim() || null,
      notas: nuevoCliente.notas.trim() || null,
    }

    const { data, error } = await supabase.from('customers').insert(payload).select('*').single()
    if (error) {
      toast.error('Error al crear cliente: ' + error.message)
      setGuardandoCliente(false)
      return
    }

    const clienteCreado = {
      id: data.id as string,
      nombre: data.nombre as string,
      telefono: (data.telefono as string) ?? '',
      rut: (data.rut as string | null) ?? null,
    }

    setClientesList(prev => [...prev, clienteCreado].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setClienteId(clienteCreado.id)
    setNuevoCliente({ nombre: '', telefono: '', rut: '', email: '', direccion: '', notas: '' })
    setPopupClienteOpen(false)
    toast.success(`Cliente "${clienteCreado.nombre}" creado y seleccionado`)
    setGuardandoCliente(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { toast.error('Selecciona un cliente'); return }
    if (!equipo.falla_reportada) { toast.error('Describe la falla del equipo'); return }
    setLoading(true)

    // Intentar con imei2/numero_serie (requiere SQL migración 14)
    const basePayload = {
      customer_id: clienteId,
      marca: equipo.marca || 'Sin especificar',
      modelo: equipo.modelo || 'Sin especificar',
      imei: equipo.imei || null,
      color: equipo.color || null,
      capacidad: equipo.capacidad || null,
      accesorios: buildAccesorios(),
      condicion_visual: buildCondicion(),
      observaciones: equipo.observaciones || null,
      falla_reportada: equipo.falla_reportada,
    }
    let { data: equipoData, error: eqErr } = await supabase.from('equipment').insert({
      ...basePayload,
      imei2: imei2.trim() || null,
      numero_serie: numeroSerie.trim() || null,
    }).select().single()

    // Si falla por columnas no existentes, reintentar sin ellas
    if (eqErr && eqErr.message.includes('imei2')) {
      const fallback = await supabase.from('equipment').insert({
        ...basePayload,
        // Guardar en observaciones como fallback
        observaciones: [equipo.observaciones, imei2.trim() ? `IMEI2: ${imei2.trim()}` : '', numeroSerie.trim() ? `SN: ${numeroSerie.trim()}` : ''].filter(Boolean).join(' | ') || null,
      }).select().single()
      equipoData = fallback.data
      eqErr = fallback.error
    }

    if (eqErr || !equipoData) {
      toast.error('Error al registrar el equipo: ' + eqErr?.message)
      setLoading(false)
      return
    }

    const { data: otData, error: otErr } = await supabase.from('repair_orders').insert({
      customer_id: clienteId,
      equipment_id: equipoData.id,
      tecnico_id: ot.tecnico_id || null,
      tipo_reparacion: ot.tipo_reparacion || null,
      presupuesto_estimado: ot.presupuesto_estimado ? parseFloat(ot.presupuesto_estimado) : null,
      fecha_estimada_entrega: ot.fecha_estimada_entrega || null,
      estado: 'recibido',
    }).select().single()

    if (otErr) {
      toast.error('Error al crear la OT: ' + otErr.message)
      setLoading(false)
      return
    }

    await supabase.from('repair_status_history').insert({
      repair_order_id: otData.id,
      estado_nuevo: 'recibido',
      comentario: 'Equipo recibido en taller',
    })

    toast.success(`OT ${otData.numero_ot} creada correctamente`)
    router.push(`/reparaciones/${otData.id}`)
    router.refresh()
  }

  const clienteSeleccionado = clientesList.find(c => c.id === clienteId)
  const tecnicoSeleccionado = tecnicos.find(t => t.id === ot.tecnico_id)
  const tecnicoValue = tecnicoSeleccionado ? ot.tecnico_id : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cliente */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">1. Cliente</h2>
        <div className="max-w-md space-y-2">
          <div className="flex items-center justify-between">
            <Label>Cliente <span className="text-red-500">*</span></Label>
            <Link href="/clientes" target="_blank"
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
              👥 Ver todos los clientes →
            </Link>
          </div>

          {/* Combobox predictivo */}
          <div className="relative" ref={comboRef}>
            <input
              value={busqCliente}
              onChange={e => { setBusqCliente(e.target.value); setClienteId(''); setComboOpen(true) }}
              onFocus={() => setComboOpen(true)}
              placeholder="Escribe nombre, teléfono o RUT..."
              autoComplete="off"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {clienteId && clienteSeleccionado && (
              <div className="mt-1 flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-800">{clienteSeleccionado.nombre}</span>
                <span className="text-xs text-blue-500">{clienteSeleccionado.telefono}</span>
                <Link href={`/clientes/${clienteId}`} target="_blank" className="ml-auto text-xs text-blue-600 hover:underline shrink-0">Ver ficha →</Link>
                <button type="button" onClick={() => { setClienteId(''); setBusqCliente('') }}
                  className="text-blue-400 hover:text-red-500 text-xs ml-1">✕</button>
              </div>
            )}
            {comboOpen && !clienteId && (
              <div className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                {clientesFiltrados.length > 0 && (
                  <div className="max-h-48 overflow-y-auto divide-y">
                    {clientesFiltrados.map(c => (
                      <button key={c.id} type="button" onClick={() => seleccionarCliente(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors">
                        <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                        <p className="text-xs text-gray-400">{c.telefono}{c.rut ? ` · ${c.rut}` : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
                {busqCliente.trim() && !hayCoincidenciaExacta && (
                  <button type="button" onClick={abrirCrearConNombre}
                    className="w-full text-left px-4 py-3 text-sm text-blue-600 font-medium hover:bg-blue-50 border-t flex items-center gap-2">
                    <span className="text-lg">✚</span>
                    Crear nuevo cliente &quot;{busqCliente.trim()}&quot;
                  </button>
                )}
                {!busqCliente.trim() && clientesFiltrados.length === 0 && (
                  <p className="text-center py-4 text-gray-400 text-xs">No hay clientes registrados</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-1">
            <Dialog open={popupClienteOpen} onOpenChange={setPopupClienteOpen}>
              <button type="button" onClick={() => setPopupClienteOpen(true)}
                className="text-xs text-gray-500 hover:text-blue-600 underline">
                + Crear cliente manualmente
              </button>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo cliente</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Nombre completo <span className="text-red-500">*</span></Label>
                    <Input
                      value={nuevoCliente.nombre}
                      onChange={e => setNuevoCliente(v => ({ ...v, nombre: e.target.value }))}
                      placeholder="Juan Pérez González"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Teléfono <span className="text-red-500">*</span></Label>
                    <Input
                      value={nuevoCliente.telefono}
                      onChange={e => setNuevoCliente(v => ({ ...v, telefono: e.target.value }))}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>RUT</Label>
                    <Input
                      value={nuevoCliente.rut}
                      onChange={e => setNuevoCliente(v => ({ ...v, rut: formatRut(e.target.value) }))}
                      placeholder="26595544-4"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={nuevoCliente.email}
                      onChange={e => setNuevoCliente(v => ({ ...v, email: e.target.value }))}
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Dirección</Label>
                    <Input
                      value={nuevoCliente.direccion}
                      onChange={e => setNuevoCliente(v => ({ ...v, direccion: e.target.value }))}
                      placeholder="Av. Principal 123, Santiago"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label>Notas</Label>
                    <Textarea
                      rows={3}
                      value={nuevoCliente.notas}
                      onChange={e => setNuevoCliente(v => ({ ...v, notas: e.target.value }))}
                      placeholder="Observaciones del cliente..."
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setPopupClienteOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={crearClienteDesdePopup} disabled={guardandoCliente}>
                    {guardandoCliente ? 'Guardando...' : 'Guardar cliente'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Equipo */}
      <div className="bg-white rounded-xl border p-5 space-y-5">
        <h2 className="font-semibold text-gray-800">2. Datos del equipo</h2>

        {/* Marca / Modelo / Color / Capacidad */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Marca</Label>
            <MarcaSelector value={equipo.marca} onChange={v => setEquipo(eq => ({ ...eq, marca: v, modelo: '' }))} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Modelo</Label>
            <ModeloSelector marca={equipo.marca} value={equipo.modelo} onChange={v => setEquipo(eq => ({ ...eq, modelo: v }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <Select value={equipo.color} onValueChange={v => setEquipo(eq => ({ ...eq, color: v ?? '' }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{COLORES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Capacidad</Label>
            <Select value={equipo.capacidad} onValueChange={v => setEquipo(eq => ({ ...eq, capacidad: v ?? '' }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{CAPACIDADES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* IMEI y N° Serie */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Label>IMEI</Label>
            <div className="flex rounded-lg overflow-hidden border text-xs">
              {([1, 2] as const).map(n => (
                <button key={n} type="button" onClick={() => setImeiCount(n)}
                  className={`px-3 py-1 font-medium transition-colors ${imeiCount === n ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {n} IMEI
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">IMEI {imeiCount === 2 ? '1' : ''}</Label>
              <Input placeholder="15 dígitos" maxLength={15} value={equipo.imei}
                onChange={e => setEquipo(eq => ({ ...eq, imei: e.target.value.replace(/\D/g, '') }))} />
            </div>
            {imeiCount === 2 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">IMEI 2</Label>
                <Input placeholder="15 dígitos" maxLength={15} value={imei2}
                  onChange={e => setImei2(e.target.value.replace(/\D/g, ''))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">N° Serie (SN)</Label>
              <Input placeholder="Número de serie" value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Accesorios */}
        <div className="space-y-3">
          <Label>Accesorios entregados</Label>
          <div className="flex flex-wrap gap-2">
            {([
              { k: 'cargador',   label: 'Cargador' },
              { k: 'cable',      label: 'Cable' },
              { k: 'cajaCaraga', label: 'Caja de carga' },
              { k: 'funda',      label: 'Funda' },
              { k: 'bandejaSim', label: 'Bandeja de SIM' },
              { k: 'sim',        label: 'SIM card' },
              { k: 'microsd',    label: 'MicroSD' },
            ] as { k: keyof typeof acc; label: string }[]).map(({ k, label }) => (
              <button key={k} type="button" onClick={() => toggleAcc(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${acc[k] ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                {label}
              </button>
            ))}
          </div>
          {/* Sub-opciones SIM */}
          {acc.sim && (
            <div className="ml-2 pl-3 border-l-2 border-blue-200 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-600 font-medium">¿Cuántas SIM?</span>
                {([1, 2] as const).map(n => (
                  <button key={n} type="button"
                    onClick={() => setAcc(a => ({ ...a, simCantidad: n }))}
                    className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors ${acc.simCantidad === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                    {n}
                  </button>
                ))}
              </div>
              <datalist id="carriers-list">
                {savedCarriers.map(c => <option key={c} value={c} />)}
                {['Entel', 'Claro', 'Movistar', 'WOM', 'Virgin Mobile', 'Bitel', 'Mundo'].filter(c => !savedCarriers.includes(c)).map(c => <option key={c} value={c} />)}
              </datalist>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">SIM 1 — Operadora</Label>
                  <input list="carriers-list" value={acc.sim1Carrier}
                    onChange={e => setAcc(a => ({ ...a, sim1Carrier: e.target.value }))}
                    onBlur={e => saveCarrier(e.target.value)}
                    placeholder="Ej: Entel, Claro..."
                    className="w-full h-8 border rounded-lg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 mt-1" />
                </div>
                {acc.simCantidad === 2 && (
                  <div>
                    <Label className="text-xs">SIM 2 — Operadora</Label>
                    <input list="carriers-list" value={acc.sim2Carrier}
                      onChange={e => setAcc(a => ({ ...a, sim2Carrier: e.target.value }))}
                      onBlur={e => saveCarrier(e.target.value)}
                      placeholder="Ej: Movistar, WOM..."
                      className="w-full h-8 border rounded-lg px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 mt-1" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Condición visual y física */}
        <div className="space-y-3">
          <Label>Condición visual y física</Label>
          <div className="space-y-2">

            {/* Equipo apagado */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setCond(c => ({ ...c, equipo_apagado: !c.equipo_apagado }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${cond.equipo_apagado ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}`}>
                📵 Equipo apagado
              </button>
            </div>

            {/* Carga */}
            <div className="space-y-1.5">
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" onClick={() => setCond(c => ({ ...c, carga: c.carga !== '' ? '' : 'si' }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${cond.carga !== '' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                  🔋 Carga
                </button>
              </div>
              {cond.carga !== '' && (
                <div className="ml-2 pl-3 border-l-2 border-blue-200 space-y-2">
                  <div className="flex gap-1.5">
                    {(['si', 'no_carga'] as const).map(v => (
                      <button key={v} type="button" onClick={() => setCond(c => ({ ...c, carga: v }))}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${cond.carga === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                        {v === 'si' ? 'Sí carga' : 'No carga'}
                      </button>
                    ))}
                  </div>
                  {cond.carga === 'si' && (
                    <div className="flex gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Voltios (V)</label>
                        <input value={cond.cargaVoltios} onChange={e => setCond(c => ({ ...c, cargaVoltios: e.target.value }))}
                          placeholder="ej: 5" className="w-20 h-7 border rounded px-2 text-xs block mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Amperaje (A)</label>
                        <input value={cond.cargaAmperaje} onChange={e => setCond(c => ({ ...c, cargaAmperaje: e.target.value }))}
                          placeholder="ej: 2.4" className="w-20 h-7 border rounded px-2 text-xs block mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sin daños visibles */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => toggleCondSimple('sin_danos')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isCondActiva('sin_danos') ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}>
                ✓ Sin daños visibles
              </button>
            </div>

            {/* Rayones con sub-áreas */}
            {(['rayones', 'golpes'] as const).map(tipo => (
              <div key={tipo} className="space-y-1.5">
                <button type="button"
                  onClick={() => {
                    if (condAreas(tipo).length > 0) setCond(c => ({ ...c, [tipo]: [] }))
                    else setCond(c => ({ ...c, [tipo]: ['pantalla'] }))
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${condAreas(tipo).length > 0 ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}>
                  {tipo === 'rayones' ? 'Rayones' : 'Golpes'}
                  {condAreas(tipo).length > 0 && ` (${condAreas(tipo).length})`}
                </button>
                {condAreas(tipo).length > 0 && (
                  <div className="ml-2 flex flex-wrap gap-1.5 pl-3 border-l-2 border-orange-200">
                    {['Pantalla', 'Middle Frame', 'Tapa trasera'].map(area => (
                      <button key={area} type="button"
                        onClick={() => toggleCondArea(tipo, area)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${condAreas(tipo).includes(area) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-300 hover:border-orange-400'}`}>
                        {area}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Simples */}
            <div className="flex flex-wrap gap-2">
              {(['pantalla_trizada', 'marco_doblado'] as const).map(k => (
                <button key={k} type="button" onClick={() => toggleCondSimple(k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isCondActiva(k) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}>
                  {k === 'pantalla_trizada' ? 'Pantalla trizada' : 'Marco doblado'}
                </button>
              ))}
            </div>

            {/* Humedad y Quemaduras con sub-áreas */}
            {(['humedad', 'quemaduras'] as const).map(tipo => (
              <div key={tipo} className="space-y-1.5">
                <button type="button"
                  onClick={() => {
                    if (condAreas(tipo).length > 0) setCond(c => ({ ...c, [tipo]: [] }))
                    else setCond(c => ({ ...c, [tipo]: ['Conector de carga'] }))
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${condAreas(tipo).length > 0 ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}>
                  {tipo === 'humedad' ? '💧 Humedad' : '🔥 Quemaduras'}
                  {condAreas(tipo).length > 0 && ` (${condAreas(tipo).length})`}
                </button>
                {condAreas(tipo).length > 0 && (
                  <div className="ml-2 flex flex-wrap gap-1.5 pl-3 border-l-2 border-red-200">
                    {['Conector de carga', 'Bandeja de SIM', 'Auriculares'].map(area => (
                      <button key={area} type="button"
                        onClick={() => toggleCondArea(tipo, area)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${condAreas(tipo).includes(area) ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-300 hover:border-red-400'}`}>
                        {area}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Observaciones y Falla */}
        <div className="space-y-1.5">
          <Label>Observaciones adicionales</Label>
          <Textarea placeholder="Detalles adicionales del estado del equipo..." rows={2}
            value={equipo.observaciones}
            onChange={e => setEquipo(eq => ({ ...eq, observaciones: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Falla reportada por el cliente <span className="text-red-500">*</span></Label>
          <Textarea placeholder="Describe el problema según lo que indica el cliente..." rows={3}
            required value={equipo.falla_reportada}
            onChange={e => setEquipo(eq => ({ ...eq, falla_reportada: e.target.value }))} />
        </div>

        {/* Servicios sugeridos */}
        {servicios.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-gray-700">
                Servicios disponibles
                {equipo.falla_reportada.trim().length >= 3 && ' — sugeridos por la falla'}
              </Label>
              <Link href="/servicios/nuevo" target="_blank"
                className="text-xs text-blue-600 hover:underline">+ Crear servicio</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(equipo.falla_reportada.trim().length >= 3
                ? servicios.filter(s => {
                    const words = equipo.falla_reportada.toLowerCase().split(/\s+/)
                    return words.some(w => w.length > 2 && (
                      s.nombre.toLowerCase().includes(w) ||
                      (s.descripcion ?? '').toLowerCase().includes(w) ||
                      s.tipo_reparacion.includes(w)
                    ))
                  }).slice(0, 6)
                : servicios.slice(0, 6)
              ).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOt(o => ({
                    ...o,
                    tipo_reparacion: s.tipo_reparacion,
                    presupuesto_estimado: String(s.precio_base),
                  }))}
                  className={`text-left p-3 rounded-xl border transition-all ${ot.presupuesto_estimado === String(s.precio_base) && ot.tipo_reparacion === s.tipo_reparacion ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}
                >
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{s.nombre}</p>
                  <p className="text-xs text-blue-700 font-bold mt-0.5">
                    ${s.precio_base.toLocaleString('es-CL')}
                  </p>
                  {s.descripcion && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.descripcion}</p>}
                </button>
              ))}
            </div>
            {equipo.falla_reportada.trim().length >= 3 &&
              servicios.filter(s => {
                const words = equipo.falla_reportada.toLowerCase().split(/\s+/)
                return words.some(w => w.length > 2 && s.nombre.toLowerCase().includes(w))
              }).length === 0 && (
              <p className="text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Sin servicios que coincidan — <Link href="/servicios/nuevo" target="_blank" className="text-blue-600 hover:underline">crea uno</Link>
              </p>
            )}
          </div>
        )}
      </div>

      {/* OT */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">3. Orden de trabajo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Técnico asignado</Label>
            <Select value={tecnicoValue} onValueChange={v => setOt(o => ({ ...o, tecnico_id: v ?? '' }))}>
              <SelectTrigger>
                <span className="truncate text-sm text-left">
                  {tecnicoSeleccionado
                    ? tecnicoSeleccionado.nombre_completo
                    : ot.tecnico_id ? 'Técnico no disponible' : 'Sin asignar'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {tecnicos.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.nombre_completo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de reparación</Label>
            <Select value={ot.tipo_reparacion} onValueChange={v => setOt(o => ({ ...o, tipo_reparacion: v ?? '' }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {TIPOS_REP.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Presupuesto estimado (CLP)</Label>
            <Input type="number" placeholder="0" min={0}
              value={ot.presupuesto_estimado}
              onChange={e => setOt(o => ({ ...o, presupuesto_estimado: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha tentativa de entrega</Label>
            <Input type="date" value={ot.fecha_estimada_entrega}
              onChange={e => setOt(o => ({ ...o, fecha_estimada_entrega: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? 'Creando OT...' : 'Crear orden de trabajo'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
