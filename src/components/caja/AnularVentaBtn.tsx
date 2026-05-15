'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  ventaId: string
  numeroVenta: string
  total: number
  puedeAnular: boolean   // permiso caja.anular del usuario
  pinAdmin?: string | null // PIN de autorización guardado en system_config
}

const MOTIVOS = [
  'Error en el monto',
  'Error en el método de pago',
  'Venta duplicada',
  'Devolución del cliente',
  'Error en el producto/servicio',
  'Solicitud del cliente',
  'Otro',
]

export default function AnularVentaBtn({ ventaId, numeroVenta, total, puedeAnular, pinAdmin }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [paso, setPaso] = useState<'motivo' | 'autorizar'>('motivo')
  const [motivo, setMotivo] = useState('')
  const [motivoCustom, setMotivoCustom] = useState('')
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)

  const motivoFinal = motivo === 'Otro' ? motivoCustom.trim() : motivo

  function abrir() {
    setOpen(true)
    setPaso(puedeAnular ? 'motivo' : 'motivo') // siempre comienza en motivo
    setMotivo('')
    setMotivoCustom('')
    setPin('')
  }

  function cerrar() {
    setOpen(false)
    setPaso('motivo')
    setMotivo('')
    setMotivoCustom('')
    setPin('')
  }

  function continuar() {
    if (!motivoFinal) { toast.error('Selecciona o escribe el motivo'); return }
    if (puedeAnular) {
      // tiene permiso → anular directo
      ejecutarAnulacion()
    } else {
      // sin permiso → pedir PIN de admin
      setPaso('autorizar')
    }
  }

  async function ejecutarAnulacion() {
    // Si no tiene permiso, validar PIN
    if (!puedeAnular) {
      if (!pin.trim()) { toast.error('Ingresa el PIN de autorización'); return }
      if (!pinAdmin) {
        toast.error('No hay PIN de autorización configurado. Configúralo en Configuración → Sistema')
        return
      }
      if (pin.trim() !== pinAdmin.trim()) {
        toast.error('PIN incorrecto. Solicita el PIN al administrador.')
        return
      }
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('sales').update({
      anulada: true,
      motivo_anulacion: motivoFinal,
      anulado_por: user?.id ?? null,
      anulado_at: new Date().toISOString(),
    }).eq('id', ventaId)

    if (error) {
      // Fallback si las columnas nuevas no existen aún
      const { error: e2 } = await supabase.from('sales').update({ anulada: true }).eq('id', ventaId)
      if (e2) { toast.error('Error: ' + e2.message); setSaving(false); return }
    }

    // Log en audit_logs
    await supabase.from('audit_logs').insert({
      modulo: 'caja',
      accion: 'venta_anulada',
      entidad_tipo: 'sale',
      entidad_id: ventaId,
      descripcion: `${numeroVenta} anulada. Motivo: ${motivoFinal}`,
      usuario_id: user?.id ?? null,
    }).then(r => r)

    toast.success(`Venta ${numeroVenta} anulada correctamente`)
    cerrar()
    setSaving(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="text-xs text-red-500 hover:text-red-700 hover:underline font-medium transition-colors"
        title="Anular venta"
      >
        Anular
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={cerrar}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">🚫 Anular venta</h3>
                <p className="text-xs text-gray-400">{numeroVenta} · {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(total)}</p>
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>

            {/* Paso 1: Motivo */}
            {paso === 'motivo' && (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-sm text-red-800 font-medium">⚠ Esta acción no se puede deshacer</p>
                  <p className="text-xs text-red-700 mt-0.5">La venta quedará marcada como anulada y el stock se restaurará automáticamente.</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Motivo de la anulación <span className="text-red-500">*</span></Label>
                  <div className="grid grid-cols-1 gap-1.5 mt-1">
                    {MOTIVOS.map(m => (
                      <button key={m} type="button" onClick={() => setMotivo(m)}
                        className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${motivo === m ? 'bg-red-600 text-white border-red-600' : 'bg-gray-50 border-gray-200 hover:border-red-300 text-gray-700'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {motivo === 'Otro' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Describe el motivo</Label>
                    <Input value={motivoCustom} onChange={e => setMotivoCustom(e.target.value)}
                      placeholder="Describe el motivo..." autoFocus />
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={cerrar}>Cancelar</Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={continuar} disabled={!motivoFinal || saving}>
                    {puedeAnular ? (saving ? 'Anulando...' : 'Confirmar anulación') : 'Continuar →'}
                  </Button>
                </div>
              </>
            )}

            {/* Paso 2: Autorización (solo si no tiene permiso) */}
            {paso === 'autorizar' && (
              <>
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center space-y-2">
                  <span className="text-3xl">🔐</span>
                  <p className="font-semibold text-amber-900">Requiere autorización</p>
                  <p className="text-xs text-amber-700">
                    No tienes permiso para anular ventas. Solicita al administrador que ingrese el PIN de autorización.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Motivo registrado</Label>
                  <p className="text-sm bg-gray-50 border rounded-lg px-3 py-2 text-gray-700">{motivoFinal}</p>
                </div>

                <div className="space-y-1.5">
                  <Label>PIN de autorización del administrador <span className="text-red-500">*</span></Label>
                  <Input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="• • • • • •"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && ejecutarAnulacion()}
                  />
                  <p className="text-xs text-gray-400">El PIN se configura en Configuración → Sistema</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setPaso('motivo')}>← Atrás</Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={ejecutarAnulacion} disabled={!pin || saving}>
                    {saving ? 'Verificando...' : '🔐 Autorizar y anular'}
                  </Button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  )
}
