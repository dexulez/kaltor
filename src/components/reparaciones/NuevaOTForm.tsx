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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatRut } from '@/lib/calculations'

const MARCAS = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Motorola', 'LG', 'Sony', 'OnePlus', 'Oppo', 'Realme', 'Otro']
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
  const [accesorios, setAccesorios] = useState<string[]>([])
  const [condicion, setCondicion] = useState<string[]>([])
  const [popupClienteOpen, setPopupClienteOpen] = useState(false)
  const [guardandoCliente, setGuardandoCliente] = useState(false)

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
    tecnico_id: '', tipo_reparacion: '', presupuesto_estimado: '',
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

    const { data: equipoData, error: eqErr } = await supabase.from('equipment').insert({
      customer_id: clienteId,
      marca: equipo.marca || 'Sin especificar',
      modelo: equipo.modelo || 'Sin especificar',
      imei: equipo.imei || null,
      color: equipo.color || null,
      capacidad: equipo.capacidad || null,
      accesorios,
      condicion_visual: condicion,
      observaciones: equipo.observaciones || null,
      falla_reportada: equipo.falla_reportada,
    }).select().single()

    if (eqErr) {
      toast.error('Error al registrar el equipo: ' + eqErr.message)
      setLoading(false)
      return
    }

    const { data: otData, error: otErr } = await supabase.from('repair_orders').insert({
      customer_id: clienteId,
      equipment_id: equipoData.id,
      tecnico_id: ot.tecnico_id || null,
      tipo_reparacion: ot.tipo_reparacion || null,
      presupuesto_estimado: ot.presupuesto_estimado ? parseFloat(ot.presupuesto_estimado) : null,
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
  const clienteValue = clienteSeleccionado ? clienteId : ''
  const tecnicoValue = tecnicoSeleccionado ? ot.tecnico_id : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cliente */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">1. Cliente</h2>
        <div className="max-w-md">
          <Label>Cliente <span className="text-red-500">*</span></Label>
          <Select value={clienteValue} onValueChange={(value) => setClienteId(value ?? '')}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder={clienteId && !clienteSeleccionado ? 'Cliente no disponible' : 'Selecciona un cliente...'} />
            </SelectTrigger>
            <SelectContent>
              {clientesList.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre} — {c.telefono}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-2">
            <Dialog open={popupClienteOpen} onOpenChange={setPopupClienteOpen}>
              <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
                + Crear cliente
              </DialogTrigger>
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
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">2. Datos del equipo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Marca</Label>
            <Select value={equipo.marca} onValueChange={v => setEquipo(eq => ({ ...eq, marca: v ?? '' }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {MARCAS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <Input placeholder="iPhone 14 Pro, Galaxy S23..." value={equipo.modelo}
              onChange={e => setEquipo(eq => ({ ...eq, modelo: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>IMEI</Label>
            <Input placeholder="15 dígitos" maxLength={15} value={equipo.imei}
              onChange={e => setEquipo(eq => ({ ...eq, imei: e.target.value.replace(/\D/g, '') }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <Select value={equipo.color} onValueChange={v => setEquipo(eq => ({ ...eq, color: v ?? '' }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {COLORES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Capacidad</Label>
            <Select value={equipo.capacidad} onValueChange={v => setEquipo(eq => ({ ...eq, capacidad: v ?? '' }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {CAPACIDADES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Accesorios entregados</Label>
          <div className="flex flex-wrap gap-2">
            {ACCESORIOS_OPTS.map(a => (
              <button key={a} type="button"
                onClick={() => toggleCheck(accesorios, setAccesorios, a)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors
                  ${accesorios.includes(a) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Condición visual</Label>
          <div className="flex flex-wrap gap-2">
            {CONDICION_OPTS.map(c => (
              <button key={c} type="button"
                onClick={() => toggleCheck(condicion, setCondicion, c)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors
                  ${condicion.includes(c) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

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
      </div>

      {/* OT */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">3. Orden de trabajo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Técnico asignado</Label>
            <Select value={tecnicoValue} onValueChange={v => setOt(o => ({ ...o, tecnico_id: v ?? '' }))}>
              <SelectTrigger>
                <SelectValue placeholder={ot.tecnico_id && !tecnicoSeleccionado ? 'Técnico no disponible' : 'Sin asignar'} />
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
