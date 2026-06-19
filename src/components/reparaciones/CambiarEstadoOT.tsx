'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { RepairStatus } from '@/types'
import { crearNotificacion } from '@/lib/notifications'
import { soundOTListo, soundOTEntregada, soundOTRechazada, soundEstadoOT, soundError } from '@/lib/sounds'
import { enviarWA, msgOTRecibida, msgOTPresupuestado, msgOTEsperandoRepuesto, msgOTLista, msgOTRechazada as msgRechazada } from '@/lib/whatsapp'

export const ESTADO_LABELS: Record<RepairStatus, string> = {
  recibido:           'Recibido',
  en_diagnostico:     'En diagnóstico',
  presupuestado:      'Presupuestando',
  aprobado:           'Aceptado',
  rechazado:          'Rechazado',
  esperando_repuesto: 'Esperando repuesto',
  en_reparacion:      'En reparación',
  listo:              'Listo',
  para_entrega:       'Para entrega',
  entregado:          'Entregado',
  en_garantia:        'En garantía',
  cancelado:          'Cancelado',
}

// Flujo lógico de estados
const TODOS_ESTADOS: RepairStatus[] = [
  'recibido', 'en_diagnostico',
  'presupuestado', 'aprobado', 'rechazado',
  'esperando_repuesto', 'en_reparacion',
  'listo', 'para_entrega', 'entregado',
  'en_garantia', 'cancelado',
]

// Descripción del estado para el técnico
export const ESTADO_DESC: Partial<Record<RepairStatus, string>> = {
  presupuestado:  'Enviando presupuesto al cliente',
  aprobado:       'Cliente aceptó el presupuesto',
  rechazado:      'Cliente rechazó el presupuesto',
  listo:          'Reparación terminada (marcar resultado abajo)',
  para_entrega:   'Equipo listo para retiro y pago',
  en_garantia:    'El equipo regresó por garantía',
}

interface Props {
  otId: string
  estadoActual: RepairStatus
  fechaEntrega?: string | null
  otNumero?: string
  clienteTelefono?: string | null
  clienteNombre?: string | null
  equipoDesc?: string | null
  nombreLocal?: string | null
}

export default function CambiarEstadoOT({ otId, estadoActual, fechaEntrega, otNumero, clienteTelefono, clienteNombre, equipoDesc, nombreLocal }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [nuevoEstado, setNuevoEstado] = useState<RepairStatus | ''>('')
  const [comentario, setComentario] = useState('')
  const [resultado, setResultado] = useState<'exitosa' | 'no_exitosa' | ''>('')
  const [montoRevision, setMontoRevision] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Mostrar input de revisión cuando: sin reparación, o rechazado
  const mostrarMontoRevision =
    (nuevoEstado === 'listo' && resultado === 'no_exitosa') ||
    nuevoEstado === 'rechazado'

  const opciones = TODOS_ESTADOS.filter(e => e !== estadoActual)

  async function comprimirFoto(file: File): Promise<File> {
    const MAX = 500 * 1024 // 0.5 MB
    if (file.size <= MAX) return file
    const img = new Image()
    const srcUrl = URL.createObjectURL(file)
    await new Promise<void>(res => { img.onload = () => res(); img.src = srcUrl })
    URL.revokeObjectURL(srcUrl)
    let { width, height } = img
    const MAX_DIM = 1600
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width >= height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM }
      else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM }
    }
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
    for (let q = 0.85; q >= 0.1; q -= 0.1) {
      const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', q))
      if (blob.size <= MAX) return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
    }
    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.1))
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' })
  }

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const comprimida = await comprimirFoto(f)
    setFoto(comprimida)
    setFotoPreview(URL.createObjectURL(comprimida))
  }

  function quitarFoto() {
    setFoto(null)
    setFotoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function subirFoto(): Promise<string | null> {
    if (!foto) return null
    const ext = foto.name.split('.').pop() ?? 'jpg'
    const path = `${otId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('ot-fotos').upload(path, foto, { upsert: true })
    if (error) { toast.error('Error al subir foto'); return null }
    const { data } = supabase.storage.from('ot-fotos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleRegistrarDevolucion() {
    setLoading(true)
    const { data, error } = await supabase.from('repair_orders')
      .update({ fecha_entrega: new Date().toISOString() })
      .eq('id', otId)
      .select('id')
    if (error || !data || data.length === 0) {
      soundError(); toast.error('No se pudo registrar la devolución' + (error ? ': ' + error.message : ''))
      setLoading(false)
      return
    }
    toast.success('Devolución registrada')
    router.refresh()
    setLoading(false)
  }

  async function handleCambio() {
    if (!nuevoEstado) return
    if (nuevoEstado === 'listo' && !resultado) {
      toast.error('Indica si la reparación fue exitosa o sin reparación')
      return
    }
    setLoading(true)

    const fotoUrl = await subirFoto()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    // Actualizar estado + resultado + precio si aplica
    const updatePayload: Record<string, unknown> = { estado: nuevoEstado }
    if (nuevoEstado === 'listo' && resultado) updatePayload.resultado = resultado
    const monto = parseFloat(montoRevision)
    if (mostrarMontoRevision && montoRevision && monto > 0) updatePayload.precio_servicio = monto

    const { data: filasActualizadas, error } = await supabase
      .from('repair_orders')
      .update(updatePayload)
      .eq('id', otId)
      .select('id')

    if (error) {
      soundError(); toast.error('Error al cambiar estado: ' + error.message)
      setLoading(false)
      return
    }
    // Sin permiso (RLS), Supabase no devuelve error pero tampoco afecta filas —
    // sin este chequeo, el cambio "parece" guardarse aunque el estado real no cambie.
    if (!filasActualizadas || filasActualizadas.length === 0) {
      soundError(); toast.error('No se pudo cambiar el estado: no tienes permiso sobre esta OT')
      setLoading(false)
      return
    }

    await supabase.from('repair_status_history').insert({
      repair_order_id: otId,
      estado_anterior: estadoActual,
      estado_nuevo: nuevoEstado,
      comentario: comentario || null,
      foto_url: fotoUrl,
      usuario_id: currentUser?.id ?? null,
    })

    // Sonido según estado
    if (nuevoEstado === 'listo') soundOTListo()
    else if (nuevoEstado === 'entregado') soundOTEntregada()
    else if (nuevoEstado === 'rechazado' || nuevoEstado === 'cancelado') soundOTRechazada()
    else soundEstadoOT()
    toast.success(`Estado: ${ESTADO_LABELS[nuevoEstado]}`)

    // WhatsApp al cliente según estado
    const ot = otNumero ?? 'OT'
    const nombre = clienteNombre ?? 'Cliente'
    const equipo = equipoDesc ?? 'equipo'
    const local = nombreLocal ?? 'Servitec'
    if (clienteTelefono) {
      if (nuevoEstado === 'recibido')           enviarWA(clienteTelefono, msgOTRecibida(nombre, equipo, ot, local))
      else if (nuevoEstado === 'presupuestado') enviarWA(clienteTelefono, msgOTPresupuestado(nombre, equipo, ot, local))
      else if (nuevoEstado === 'esperando_repuesto') enviarWA(clienteTelefono, msgOTEsperandoRepuesto(nombre, equipo, ot, local))
      else if (nuevoEstado === 'listo' || nuevoEstado === 'para_entrega') enviarWA(clienteTelefono, msgOTLista(nombre, equipo, ot, local))
      else if (nuevoEstado === 'rechazado')     enviarWA(clienteTelefono, msgRechazada(nombre, equipo, ot, local))
    }

    // Notificaciones para estados relevantes
    const ref = otNumero ? `${otNumero}` : 'OT'
    if (nuevoEstado === 'listo') {
      await crearNotificacion({
        tipo: 'ot_listo',
        titulo: `${ref} lista para cobro`,
        mensaje: resultado === 'no_exitosa' ? 'Sin reparación — cobrar revisión' : 'Reparación completada',
        url: `/reparaciones/${otId}`,
      })
    } else if (nuevoEstado === 'entregado') {
      await crearNotificacion({
        tipo: 'ot_entregada',
        titulo: `${ref} entregada al cliente`,
        url: `/reparaciones/${otId}`,
      })
    } else if (nuevoEstado === 'esperando_repuesto') {
      await crearNotificacion({
        tipo: 'solicitud_compra',
        titulo: `${ref} esperando repuesto`,
        mensaje: comentario || 'Revisar y solicitar repuesto al proveedor',
        url: `/reparaciones/${otId}`,
      })
    }

    setNuevoEstado('')
    setComentario('')
    setResultado('')
    setMontoRevision('')
    quitarFoto()
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Botón de devolución para equipos rechazados */}
      {estadoActual === 'rechazado' && (
        fechaEntrega
          ? <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 font-medium">
              ✓ Devuelto al cliente el {new Date(fechaEntrega).toLocaleDateString('es-CL')}
            </span>
          : <Button
              onClick={handleRegistrarDevolucion}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm"
              size="sm"
            >
              📦 Registrar devolución al cliente
            </Button>
      )}

      <Select value={nuevoEstado} onValueChange={v => { setNuevoEstado(v as RepairStatus); setResultado('') }}>
        <SelectTrigger className="min-w-[180px] h-9 border-gray-300 hover:border-blue-400 transition-colors">
          <span className="truncate text-sm text-left text-gray-700">
            {nuevoEstado ? ESTADO_LABELS[nuevoEstado] : 'Cambiar estado...'}
          </span>
        </SelectTrigger>
        <SelectContent>
          {opciones.map(s => (
            <SelectItem key={s} value={s}>{ESTADO_LABELS[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {nuevoEstado && (
        <>
          {/* Sub-opción para "Listo" */}
          {nuevoEstado === 'listo' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResultado('exitosa')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${resultado === 'exitosa' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'}`}
              >
                ✅ Reparado
              </button>
              <button
                type="button"
                onClick={() => setResultado('no_exitosa')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${resultado === 'no_exitosa' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'}`}
              >
                🔧 Sin reparación
              </button>
            </div>
          )}

          {/* Cobro de revisión para sin reparación o rechazado */}
          {mostrarMontoRevision && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">
                {nuevoEstado === 'rechazado' ? 'Cobro de revisión (opcional)' : 'Cobro de revisión (no se especificó precio)'}
              </label>
              <Input
                type="number"
                min={0}
                placeholder="Ej: 5000"
                value={montoRevision}
                onChange={e => setMontoRevision(e.target.value)}
              />
              {montoRevision && parseFloat(montoRevision) > 0 && (
                <p className="text-xs text-orange-600 font-medium">
                  Se registrará ${Number(montoRevision).toLocaleString('es-CL')} como precio del servicio
                </p>
              )}
            </div>
          )}

          <Textarea
            placeholder="Comentario (opcional)..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            rows={2}
          />

          {/* Foto adjunta */}
          <div>
            {fotoPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoPreview} alt="Foto" className="w-full h-32 object-cover rounded-lg border" />
                <button
                  type="button"
                  onClick={quitarFoto}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600"
                >✕</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-gray-500">
                <span>📷</span>
                <span>Adjuntar foto (opcional)</span>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
              </label>
            )}
          </div>

          <Button onClick={handleCambio} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? 'Guardando...' : 'Confirmar cambio'}
          </Button>
        </>
      )}
    </div>
  )
}
