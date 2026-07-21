'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCLP } from '@/lib/calculations'

type SesionExistente = {
  id: string
  fecha: string
  efectivo_apertura: number
  efectivo_cierre: number | null
  transbank_cierre: number | null
  transferencia_cierre: number | null
  otros_cierre: number | null
}

interface Props {
  mode: 'editar' | 'nueva'
  sesion?: SesionExistente
  puedeCorregir: boolean
}

const TZ = 'America/Santiago'

export default function CorregirCajaModal({ mode, sesion, puedeCorregir }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [paso, setPaso] = useState<'form' | 'autorizar'>('form')
  const [saving, setSaving] = useState(false)

  const hoy = new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date())
  const [fecha, setFecha] = useState('')
  const [efectivoApertura, setEfectivoApertura] = useState(String(sesion?.efectivo_apertura ?? 0))
  const [efectivoCierre, setEfectivoCierre] = useState(String(sesion?.efectivo_cierre ?? 0))
  const [transbankCierre, setTransbankCierre] = useState(String(sesion?.transbank_cierre ?? 0))
  const [transferenciaCierre, setTransferenciaCierre] = useState(String(sesion?.transferencia_cierre ?? 0))
  const [otrosCierre, setOtrosCierre] = useState(String(sesion?.otros_cierre ?? 0))
  const [motivo, setMotivo] = useState('')
  const [pin, setPin] = useState('')

  const [agregarVenta, setAgregarVenta] = useState(false)
  const [ventaMonto, setVentaMonto] = useState('')
  const [ventaMetodo, setVentaMetodo] = useState('efectivo')
  const [ventaTipoDoc, setVentaTipoDoc] = useState('boleta')

  function resetForm() {
    setPaso('form')
    setFecha('')
    setEfectivoApertura(String(sesion?.efectivo_apertura ?? 0))
    setEfectivoCierre(String(sesion?.efectivo_cierre ?? 0))
    setTransbankCierre(String(sesion?.transbank_cierre ?? 0))
    setTransferenciaCierre(String(sesion?.transferencia_cierre ?? 0))
    setOtrosCierre(String(sesion?.otros_cierre ?? 0))
    setMotivo('')
    setPin('')
    setAgregarVenta(false)
    setVentaMonto('')
  }

  function cerrar() {
    setOpen(false)
    resetForm()
  }

  function continuar() {
    if (motivo.trim().length < 10) { toast.error('Escribe una nota de justificación (mínimo 10 caracteres)'); return }
    if (mode === 'nueva' && !fecha) { toast.error('Selecciona la fecha de la caja'); return }
    if (mode === 'nueva' && fecha >= hoy) { toast.error('La fecha debe ser anterior a hoy'); return }
    if (agregarVenta && !(parseInt(ventaMonto) > 0)) { toast.error('Ingresa el monto de la venta manual'); return }
    if (puedeCorregir) {
      ejecutar()
    } else {
      setPaso('autorizar')
    }
  }

  async function ejecutar() {
    if (!puedeCorregir && !pin.trim()) { toast.error('Ingresa el PIN de autorización'); return }
    setSaving(true)

    const res = await fetch('/api/caja/corregir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modo: mode === 'nueva' ? 'apertura_retroactiva' : 'edicion_cierre',
        sesionId: sesion?.id,
        fecha: mode === 'nueva' ? fecha : undefined,
        motivo: motivo.trim(),
        pin: puedeCorregir ? undefined : pin.trim(),
        efectivo_apertura: parseInt(efectivoApertura) || 0,
        efectivo_cierre: parseInt(efectivoCierre) || 0,
        transbank_cierre: parseInt(transbankCierre) || 0,
        transferencia_cierre: parseInt(transferenciaCierre) || 0,
        otros_cierre: parseInt(otrosCierre) || 0,
        venta: agregarVenta ? {
          monto: parseInt(ventaMonto) || 0,
          metodo_pago: ventaMetodo,
          tipo_documento: ventaTipoDoc,
        } : null,
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) { toast.error(data.error ?? 'Error al guardar'); return }

    toast.success(mode === 'nueva' ? 'Caja registrada correctamente' : 'Caja corregida correctamente')
    cerrar()
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={mode === 'nueva'
          ? 'inline-flex items-center gap-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors'
          : 'text-xs text-amber-600 hover:text-amber-800 hover:underline font-medium transition-colors'}
        title={mode === 'nueva' ? 'Registrar caja de un día anterior' : 'Corregir esta caja'}
      >
        {mode === 'nueva' ? '🗓️ Registrar caja de un día anterior' : 'Corregir'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={cerrar}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 my-8" onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  {mode === 'nueva' ? '🗓️ Registrar caja de un día anterior' : `✏️ Corregir caja del ${sesion ? new Date(sesion.fecha + 'T12:00:00').toLocaleDateString('es-CL') : ''}`}
                </h3>
              </div>
              <button onClick={cerrar} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
            </div>

            {paso === 'form' && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-sm text-amber-800 font-medium">⚠ Esta acción requiere autorización de un administrador</p>
                  <p className="text-xs text-amber-700 mt-0.5">Toda corrección queda registrada con tu usuario, la fecha y el motivo.</p>
                </div>

                {mode === 'nueva' && (
                  <div className="space-y-1.5">
                    <Label>Fecha de la caja <span className="text-red-500">*</span></Label>
                    <Input type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value)} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {mode === 'nueva' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Fondo de apertura</Label>
                      <Input type="number" min={0} value={efectivoApertura} onChange={e => setEfectivoApertura(e.target.value)} />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Efectivo cierre</Label>
                    <Input type="number" min={0} value={efectivoCierre} onChange={e => setEfectivoCierre(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Débito/Crédito</Label>
                    <Input type="number" min={0} value={transbankCierre} onChange={e => setTransbankCierre(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Transferencia</Label>
                    <Input type="number" min={0} value={transferenciaCierre} onChange={e => setTransferenciaCierre(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Otros</Label>
                    <Input type="number" min={0} value={otrosCierre} onChange={e => setOtrosCierre(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Nota de justificación <span className="text-red-500">*</span></Label>
                  <textarea
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    placeholder={mode === 'nueva' ? 'Explica por qué se registra esta caja con fecha pasada...' : 'Explica por qué se corrige este cierre...'}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="border rounded-xl p-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={agregarVenta} onChange={e => setAgregarVenta(e.target.checked)} />
                    Agregar una venta manual a esta caja
                  </label>
                  {agregarVenta && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs">Monto</Label>
                        <Input type="number" min={0} value={ventaMonto} onChange={e => setVentaMonto(e.target.value)} />
                        {parseInt(ventaMonto) > 0 && <p className="text-xs text-green-700">{formatCLP(parseInt(ventaMonto))}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Método de pago</Label>
                        <select value={ventaMetodo} onChange={e => setVentaMetodo(e.target.value)} className="w-full h-8 rounded-lg border px-2 text-sm">
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="debito">Débito</option>
                          <option value="credito">Crédito</option>
                        </select>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Documento</Label>
                        <select value={ventaTipoDoc} onChange={e => setVentaTipoDoc(e.target.value)} className="w-full h-8 rounded-lg border px-2 text-sm">
                          <option value="boleta">Boleta</option>
                          <option value="factura">Factura</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={cerrar}>Cancelar</Button>
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={continuar} disabled={saving}>
                    {puedeCorregir ? (saving ? 'Guardando...' : 'Confirmar') : 'Continuar →'}
                  </Button>
                </div>
              </>
            )}

            {paso === 'autorizar' && (
              <>
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center space-y-2">
                  <span className="text-3xl">🔐</span>
                  <p className="font-semibold text-amber-900">Requiere autorización</p>
                  <p className="text-xs text-amber-700">
                    No tienes permiso para corregir cajas. Solicita al administrador que ingrese el PIN de autorización.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>PIN de autorización del administrador <span className="text-red-500">*</span></Label>
                  <Input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="• • • • • •"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && ejecutar()}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setPaso('form')}>← Atrás</Button>
                  <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={ejecutar} disabled={!pin || saving}>
                    {saving ? 'Verificando...' : '🔐 Autorizar y guardar'}
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
