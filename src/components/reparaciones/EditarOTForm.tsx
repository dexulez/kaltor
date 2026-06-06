'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { formatRut } from '@/lib/calculations'
import TipoEquipoSelector from '@/components/reparaciones/TipoEquipoSelector'

const TIPOS_REP = [
  { value: 'pantalla', label: 'Pantalla' }, { value: 'bateria', label: 'Batería' },
  { value: 'placa', label: 'Placa madre' }, { value: 'software', label: 'Software' },
  { value: 'camara', label: 'Cámara' }, { value: 'conector', label: 'Conector' },
  { value: 'otro', label: 'Otro' },
]

interface OTData {
  id: string; numero_ot: string; tipo_reparacion?: string | null
  presupuesto_estimado?: number | null; precio_servicio?: number | null
  fecha_estimada_entrega?: string | null; diagnostico_tecnico?: string | null
  tecnico_id?: string | null
  customers?: { id: string; nombre: string; telefono: string; rut?: string | null; email?: string | null } | null
  equipment?: {
    id: string; tipo_equipo?: string | null; marca: string; modelo: string; imei?: string | null; imei2?: string | null
    numero_serie?: string | null; color?: string | null; capacidad?: string | null
    falla_reportada?: string; observaciones?: string | null
  } | null
  user_profiles?: { id: string; nombre_completo: string } | null
}

interface Props {
  ot: OTData
  tecnicos: { id: string; nombre_completo: string }[]
}

export default function EditarOTForm({ ot, tecnicos }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Datos de la OT
  const [tipoReparacion, setTipoReparacion] = useState(ot.tipo_reparacion ?? '')
  const [presupuesto, setPresupuesto] = useState(String(ot.presupuesto_estimado ?? ''))
  const [precioServicio, setPrecioServicio] = useState(String(ot.precio_servicio ?? ''))
  const [fechaEntrega, setFechaEntrega] = useState(ot.fecha_estimada_entrega?.split('T')[0] ?? '')
  const [diagnostico, setDiagnostico] = useState(ot.diagnostico_tecnico ?? '')
  const [tecnicoId, setTecnicoId] = useState(ot.tecnico_id ?? '')

  // Datos del equipo
  const equipo = ot.equipment
  const [tipoEquipo, setTipoEquipo] = useState(equipo?.tipo_equipo ?? '')
  const [marca, setMarca] = useState(equipo?.marca ?? '')
  const [modelo, setModelo] = useState(equipo?.modelo ?? '')
  const [imei, setImei] = useState(equipo?.imei ?? '')
  const [imei2, setImei2] = useState(equipo?.imei2 ?? '')
  const [numSerie, setNumSerie] = useState(equipo?.numero_serie ?? '')
  const [color, setColor] = useState(equipo?.color ?? '')
  const [falla, setFalla] = useState(equipo?.falla_reportada ?? '')
  const [observaciones, setObservaciones] = useState(equipo?.observaciones ?? '')

  // Datos del cliente
  const cliente = ot.customers
  const [clienteNombre, setClienteNombre] = useState(cliente?.nombre ?? '')
  const [clienteTel, setClienteTel] = useState(cliente?.telefono ?? '')
  const [clienteRut, setClienteRut] = useState(cliente?.rut ?? '')
  const [clienteEmail, setClienteEmail] = useState(cliente?.email ?? '')

  async function guardar() {
    setSaving(true)
    const errors: string[] = []

    // Actualizar OT
    const { error: e1 } = await supabase.from('repair_orders').update({
      tipo_reparacion: tipoReparacion || null,
      presupuesto_estimado: presupuesto ? parseFloat(presupuesto) : null,
      precio_servicio: precioServicio ? parseFloat(precioServicio) : null,
      fecha_estimada_entrega: fechaEntrega || null,
      diagnostico_tecnico: diagnostico.trim() || null,
      tecnico_id: tecnicoId || null,
    }).eq('id', ot.id)
    if (e1) errors.push('OT: ' + e1.message)

    // Actualizar equipo
    if (equipo?.id) {
      const { error: e2 } = await supabase.from('equipment').update({
        tipo_equipo: tipoEquipo || null,
        marca: marca.trim() || 'Sin especificar',
        modelo: modelo.trim() || 'Sin especificar',
        imei: imei.trim() || null,
        imei2: imei2.trim() || null,
        numero_serie: numSerie.trim() || null,
        color: color.trim() || null,
        falla_reportada: falla.trim(),
        observaciones: observaciones.trim() || null,
      }).eq('id', equipo.id)
      if (e2) errors.push('Equipo: ' + e2.message)
    }

    // Actualizar cliente
    if (cliente?.id) {
      const { error: e3 } = await supabase.from('customers').update({
        nombre: clienteNombre.trim(),
        telefono: clienteTel.trim(),
        rut: clienteRut.trim() || null,
        email: clienteEmail.trim() || null,
      }).eq('id', cliente.id)
      if (e3) errors.push('Cliente: ' + e3.message)
    }

    if (errors.length) {
      toast.error('Errores al guardar: ' + errors.join(' | '))
    } else {
      toast.success('OT actualizada correctamente')
      router.push(`/reparaciones/${ot.id}`)
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      {/* Cliente */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Cliente</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Nombre</Label>
            <Input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} /></div>
          <div className="space-y-1"><Label>Teléfono</Label>
            <Input value={clienteTel} onChange={e => setClienteTel(e.target.value)} /></div>
          <div className="space-y-1"><Label>RUT</Label>
            <Input value={clienteRut} onChange={e => setClienteRut(formatRut(e.target.value))} placeholder="12.345.678-9" /></div>
          <div className="space-y-1"><Label>Email</Label>
            <Input type="email" value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} /></div>
        </div>
      </div>

      {/* Equipo */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Equipo</h2>
        <div className="space-y-1.5">
          <Label>Tipo de equipo</Label>
          <TipoEquipoSelector value={tipoEquipo} onChange={setTipoEquipo} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Marca</Label>
            <Input value={marca} onChange={e => setMarca(e.target.value)} /></div>
          <div className="space-y-1"><Label>Modelo</Label>
            <Input value={modelo} onChange={e => setModelo(e.target.value)} /></div>
          <div className="space-y-1"><Label>IMEI 1</Label>
            <Input value={imei} onChange={e => setImei(e.target.value.replace(/\D/g, ''))} maxLength={15} /></div>
          <div className="space-y-1"><Label>IMEI 2</Label>
            <Input value={imei2} onChange={e => setImei2(e.target.value.replace(/\D/g, ''))} maxLength={15} /></div>
          <div className="space-y-1"><Label>N° Serie</Label>
            <Input value={numSerie} onChange={e => setNumSerie(e.target.value)} /></div>
          <div className="space-y-1"><Label>Color</Label>
            <Input value={color} onChange={e => setColor(e.target.value)} /></div>
        </div>
        <div className="space-y-1"><Label>Falla reportada</Label>
          <Textarea value={falla} onChange={e => setFalla(e.target.value)} rows={2} /></div>
        <div className="space-y-1"><Label>Observaciones del equipo</Label>
          <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Estado físico adicional..." /></div>
      </div>

      {/* Orden de trabajo */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Orden de trabajo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Técnico</Label>
            <Select value={tecnicoId || 'none'} onValueChange={v => setTecnicoId(!v || v === 'none' ? '' : v)}>
              <SelectTrigger>
                <span className="truncate text-sm">
                  {!tecnicoId ? 'Sin asignar' : (tecnicos.find(t => t.id === tecnicoId)?.nombre_completo ?? 'Sin asignar')}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {tecnicos.map(t => <SelectItem key={t.id} value={t.id}>{t.nombre_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Tipo de reparación</Label>
            <Select value={tipoReparacion || 'none'} onValueChange={v => setTipoReparacion(!v || v === 'none' ? '' : v)}>
              <SelectTrigger>
                <span className="truncate text-sm">
                  {!tipoReparacion ? 'Sin especificar' : (TIPOS_REP.find(t => t.value === tipoReparacion)?.label ?? tipoReparacion)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {TIPOS_REP.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Presupuesto estimado (CLP)</Label>
            <Input type="number" min={0} value={presupuesto} onChange={e => setPresupuesto(e.target.value)} placeholder="0" /></div>
          <div className="space-y-1"><Label>Precio servicio (CLP)</Label>
            <Input type="number" min={0} value={precioServicio} onChange={e => setPrecioServicio(e.target.value)} placeholder="0" /></div>
          <div className="space-y-1"><Label>Fecha tentativa de entrega</Label>
            <Input type="date" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} /></div>
        </div>
        <div className="space-y-1"><Label>Diagnóstico técnico</Label>
          <Textarea value={diagnostico} onChange={e => setDiagnostico(e.target.value)} rows={3}
            placeholder="Describe el diagnóstico y la reparación realizada..." /></div>
      </div>

      <div className="flex gap-3">
        <Button onClick={guardar} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? 'Guardando...' : '💾 Guardar cambios'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </div>
  )
}
