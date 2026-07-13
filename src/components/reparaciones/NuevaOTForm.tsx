'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAutoSaveDraft, loadDraft, clearDraft } from '@/hooks/useFormDraft'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { soundOTCreada, soundError } from '@/lib/sounds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatRut, formatCLP, validarRut } from '@/lib/calculations'
import { MarcaSelector, ModeloSelector } from '@/components/reparaciones/MarcaModeloCombo'
import TipoEquipoSelector from '@/components/reparaciones/TipoEquipoSelector'
import AccesoriosCondicionFields from '@/components/reparaciones/AccesoriosCondicionFields'
import { getConfigTipoEquipo, resolveTemplate } from '@/lib/tipoEquipo'
import { useTiposEquipo } from '@/hooks/useTiposEquipo'
import { ACC_INICIAL, COND_INICIAL, buildAccesorios, buildCondicion, type AccState, type CondState } from '@/lib/recepcionEquipo'

import Link from 'next/link'
const CAPACIDADES = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB']
const COLORES = ['Negro', 'Blanco', 'Azul', 'Rojo', 'Verde', 'Dorado', 'Plateado', 'Morado', 'Rosa', 'Otro']

const TIPOS_REP_BASE = [
  { value: 'pantalla', label: 'Pantalla' },
  { value: 'bateria', label: 'Batería' },
  { value: 'placa', label: 'Placa' },
  { value: 'software', label: 'Software' },
  { value: 'camara', label: 'Cámara' },
  { value: 'conector', label: 'Conector' },
  { value: 'otro', label: 'Otro' },
]
const TIPOS_REP_KEY = 'tr_tipos_reparacion'

interface Props {
  clientes: { id: string; nombre: string; telefono: string; rut?: string | null }[]
  tecnicos: { id: string; nombre_completo: string }[]
  clienteIdInicial?: string
}

const DRAFT_KEY = 'nueva_ot'

export default function NuevaOTForm({ clientes, tecnicos, clienteIdInicial }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [clientesList, setClientesList] = useState(clientes)
  const [tiposRepCustom, setTiposRepCustom] = useState<{ value: string; label: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem(TIPOS_REP_KEY) ?? '[]') } catch { return [] }
  })
  const [nuevoTipoInput, setNuevoTipoInput] = useState('')
  const [mostrarNuevoTipo, setMostrarNuevoTipo] = useState(false)
  const todosLosTipos = [...TIPOS_REP_BASE, ...tiposRepCustom]

  function guardarNuevoTipo() {
    const label = nuevoTipoInput.trim()
    if (!label) return
    const value = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (todosLosTipos.some(t => t.value === value || t.label.toLowerCase() === label.toLowerCase())) {
      setOt(o => ({ ...o, tipo_reparacion: value || label }))
      setMostrarNuevoTipo(false)
      setNuevoTipoInput('')
      return
    }
    const nuevo = { value, label }
    const updated = [...tiposRepCustom, nuevo]
    setTiposRepCustom(updated)
    try { localStorage.setItem(TIPOS_REP_KEY, JSON.stringify(updated)) } catch { /* ignore */ }
    setOt(o => ({ ...o, tipo_reparacion: value }))
    setMostrarNuevoTipo(false)
    setNuevoTipoInput('')
  }

  function eliminarTipoCustom(value: string) {
    const updated = tiposRepCustom.filter(t => t.value !== value)
    setTiposRepCustom(updated)
    try { localStorage.setItem(TIPOS_REP_KEY, JSON.stringify(updated)) } catch { /* ignore */ }
    if (ot.tipo_reparacion === value) setOt(o => ({ ...o, tipo_reparacion: '' }))
  }
  const [clienteId, setClienteId] = useState(clienteIdInicial ?? '')
  const [draftRestored, setDraftRestored] = useState(false)
  // ── Accesorios y condición (dependen del tipo de equipo) ─────────────────
  const [acc, setAcc] = useState<AccState>(ACC_INICIAL)
  const [cond, setCond] = useState<CondState>(COND_INICIAL)

  // ── IMEI / SN ────────────────────────────────────────────────────────────
  const [imeiCount, setImeiCount] = useState<1 | 2>(1)
  const [imei2, setImei2] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')

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
  const [esRutChileno, setEsRutChileno] = useState(false)
  function handleRutChange(value: string) {
    setNuevoCliente(v => ({ ...v, rut: esRutChileno ? formatRut(value) : value }))
  }

  const [equipo, setEquipo] = useState({
    tipo_equipo: '', marca: '', modelo: '', imei: '', color: '', capacidad: '',
    observaciones: '', falla_reportada: '',
  })
  const { tipos: tiposEquipo, setTipos: setTiposEquipo } = useTiposEquipo()
  const configTipoEquipo = (tipo: string) => getConfigTipoEquipo(resolveTemplate(tiposEquipo, tipo))
  const [ot, setOt] = useState({
    tecnico_id: '', tipo_reparacion: '', presupuesto_estimado: '', fecha_estimada_entrega: '',
  })

  // ── Restaurar borrador al montar ─────────────────────────────────────────
  useEffect(() => {
    const draft = loadDraft<{
      clienteId: string; busqCliente: string
      equipo: typeof equipo; ot: typeof ot
      imei2: string; numeroSerie: string; imeiCount: 1 | 2
    }>(DRAFT_KEY)
    if (!draft) return
    if (draft.clienteId) { setClienteId(draft.clienteId); setBusqCliente(draft.busqCliente ?? '') }
    if (draft.equipo?.falla_reportada || draft.equipo?.marca) setEquipo(draft.equipo)
    if (draft.ot?.tipo_reparacion || draft.ot?.presupuesto_estimado) setOt(draft.ot)
    if (draft.imei2) setImei2(draft.imei2)
    if (draft.numeroSerie) setNumeroSerie(draft.numeroSerie)
    if (draft.imeiCount) setImeiCount(draft.imeiCount)
    const hadData = !!(draft.clienteId || draft.equipo?.marca || draft.equipo?.falla_reportada)
    if (hadData) setDraftRestored(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  async function crearClienteDesdePopup() {
    if (!nuevoCliente.nombre.trim()) {
      toast.error('Ingresa el nombre del cliente')
      return
    }
    if (!nuevoCliente.telefono.trim()) {
      toast.error('Ingresa el teléfono del cliente')
      return
    }
    if (!nuevoCliente.rut.trim()) {
      toast.error('El RUT/CÉDULA/DNI es obligatorio')
      return
    }
    if (esRutChileno && !validarRut(nuevoCliente.rut)) {
      toast.error('El RUT chileno ingresado no es válido — revisa el dígito verificador')
      return
    }

    setGuardandoCliente(true)

    const payload = {
      nombre: nuevoCliente.nombre.trim(),
      telefono: nuevoCliente.telefono.trim(),
      rut: nuevoCliente.rut.trim(),
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
    const configTipo = configTipoEquipo(equipo.tipo_equipo)
    const basePayload = {
      customer_id: clienteId,
      tipo_equipo: equipo.tipo_equipo || null,
      marca: equipo.marca || 'Sin especificar',
      modelo: equipo.modelo || 'Sin especificar',
      imei: equipo.imei || null,
      color: equipo.color || null,
      capacidad: equipo.capacidad || null,
      accesorios: buildAccesorios(acc, configTipo),
      condicion_visual: buildCondicion(cond, configTipo),
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
      soundError(); toast.error('Error al registrar el equipo: ' + eqErr?.message)
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
      soundError(); toast.error('Error al crear la OT: ' + otErr.message)
      setLoading(false)
      return
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser()
    await supabase.from('repair_status_history').insert({
      repair_order_id: otData.id,
      estado_nuevo: 'recibido',
      comentario: 'Equipo recibido en taller',
      usuario_id: currentUser?.id ?? null,
    })

    clearDraft(DRAFT_KEY)
    soundOTCreada()
    toast.success(`OT ${otData.numero_ot} creada correctamente`)
    router.push(`/reparaciones/${otData.id}`)
    router.refresh()
  }

  function resetForm() {
    clearDraft(DRAFT_KEY)
    setClienteId(clienteIdInicial ?? '')
    setBusqCliente('')
    setEquipo({ tipo_equipo: '', marca: '', modelo: '', imei: '', color: '', capacidad: '', observaciones: '', falla_reportada: '' })
    setOt({ tecnico_id: '', tipo_reparacion: '', presupuesto_estimado: '', fecha_estimada_entrega: '' })
    setAcc(ACC_INICIAL)
    setCond(COND_INICIAL)
    setImeiCount(1)
    setImei2('')
    setNumeroSerie('')
    setDraftRestored(false)
  }

  const clienteSeleccionado = clientesList.find(c => c.id === clienteId)
  const tecnicoSeleccionado = tecnicos.find(t => t.id === ot.tecnico_id)
  const tecnicoValue = tecnicoSeleccionado ? ot.tecnico_id : ''

  // Auto-guardar borrador
  useAutoSaveDraft(DRAFT_KEY, { clienteId, busqCliente, equipo, ot, imei2, numeroSerie, imeiCount })

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      onKeyDown={e => {
        // En iOS el botón "Done" del teclado envía el form desde cualquier input.
        // Solo permitimos Enter desde el botón de submit explícito.
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
          e.preventDefault()
        }
      }}
    >
      {/* Banner borrador restaurado */}
      {draftRestored && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800 font-medium">
            📋 Se restauró un borrador guardado. Continúa donde lo dejaste.
          </p>
          <button type="button" onClick={resetForm}
            className="text-xs text-amber-600 hover:text-amber-800 underline shrink-0">
            Descartar borrador y limpiar
          </button>
        </div>
      )}
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
                    <div className="flex items-center justify-between gap-2">
                      <Label>RUT/CÉDULA/DNI <span className="text-red-500">*</span></Label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer shrink-0">
                        <input type="checkbox" checked={esRutChileno} onChange={e => setEsRutChileno(e.target.checked)} />
                        Validar como RUT chileno
                      </label>
                    </div>
                    <Input
                      value={nuevoCliente.rut}
                      onChange={e => handleRutChange(e.target.value)}
                      placeholder={esRutChileno ? '12345678-9' : 'RUT, pasaporte o cédula extranjera'}
                      inputMode={esRutChileno ? 'numeric' : 'text'}
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

        {/* Tipo de equipo */}
        <div className="space-y-1.5">
          <Label className="font-semibold">Tipo de equipo <span className="text-red-500">*</span></Label>
          <TipoEquipoSelector
            value={equipo.tipo_equipo}
            onChange={v => setEquipo(eq => ({ ...eq, tipo_equipo: v }))}
            tipos={tiposEquipo}
            onTipoCreado={t => setTiposEquipo(prev => [...prev, t])}
          />
        </div>

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

        {/* IMEI y N° Serie — visibles según el tipo de equipo */}
        {(configTipoEquipo(equipo.tipo_equipo).identificacion.imei || configTipoEquipo(equipo.tipo_equipo).identificacion.numeroSerie) && (
          <div className="space-y-3">
            {configTipoEquipo(equipo.tipo_equipo).identificacion.imei && (
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
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {configTipoEquipo(equipo.tipo_equipo).identificacion.imei && (
                <>
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
                </>
              )}
              {configTipoEquipo(equipo.tipo_equipo).identificacion.numeroSerie && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">N° Serie (SN)</Label>
                  <Input placeholder="Número de serie" value={numeroSerie} onChange={e => setNumeroSerie(e.target.value)} />
                </div>
              )}
            </div>
          </div>
        )}

        <AccesoriosCondicionFields
          tipoEquipo={resolveTemplate(tiposEquipo, equipo.tipo_equipo)}
          acc={acc} onAccChange={setAcc}
          cond={cond} onCondChange={setCond}
        />

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

        {/* (Servicios y repuestos se agregan desde el detalle de la OT) */}

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
            <Select value={ot.tipo_reparacion} onValueChange={v => {
              if (v === '__nuevo__') { setMostrarNuevoTipo(true) }
              else setOt(o => ({ ...o, tipo_reparacion: v ?? '' }))
            }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {todosLosTipos.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center justify-between gap-3 w-full">
                      <span>{t.label}</span>
                      {tiposRepCustom.some(c => c.value === t.value) && (
                        <button
                          type="button"
                          onMouseDown={e => { e.stopPropagation(); eliminarTipoCustom(t.value) }}
                          className="text-red-400 hover:text-red-600 text-xs ml-2"
                        >✕</button>
                      )}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="__nuevo__">
                  <span className="text-blue-600 font-medium">＋ Crear nuevo tipo...</span>
                </SelectItem>
              </SelectContent>
            </Select>
            {mostrarNuevoTipo && (
              <div className="flex gap-2 mt-1">
                <input
                  autoFocus
                  value={nuevoTipoInput}
                  onChange={e => setNuevoTipoInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardarNuevoTipo() } if (e.key === 'Escape') setMostrarNuevoTipo(false) }}
                  placeholder="Ej: Teclado, Ventilador, Puerto..."
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button type="button" onClick={guardarNuevoTipo}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium">
                  Guardar
                </button>
                <button type="button" onClick={() => { setMostrarNuevoTipo(false); setNuevoTipoInput('') }}
                  className="px-2 py-1.5 border rounded-lg text-sm text-gray-500 hover:bg-gray-50">
                  ✕
                </button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Presupuesto estimado / Total a cobrar (CLP)</Label>
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

// ── Buscador de servicio existente ────────────────────────────────────────────
function BuscadorServicioOT({
  servicios,
  onSelect,
}: {
  servicios: { id: string; nombre: string; tipo_reparacion: string; precio_base: number; descripcion: string | null }[]
  onSelect: (s: { id: string; nombre: string; tipo_reparacion: string; precio_base: number; descripcion: string | null }) => void
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtrados = q.trim().length >= 1
    ? servicios.filter(s => s.nombre.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
    : servicios.slice(0, 8)

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar servicio por nombre..."
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8"
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); setOpen(false) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtrados.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-4">Sin resultados</p>
          ) : filtrados.map(s => (
            <button key={s.id} type="button"
              onClick={() => { onSelect(s); setQ(''); setOpen(false) }}
              className="w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-blue-50 transition-colors flex justify-between items-center gap-2">
              <div className="min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{s.nombre}</p>
                {s.descripcion && <p className="text-xs text-gray-400 truncate">{s.descripcion}</p>}
              </div>
              <p className="font-bold text-blue-700 text-sm shrink-0">{s.precio_base.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
