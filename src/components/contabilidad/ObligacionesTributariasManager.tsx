'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { formatCLP } from '@/lib/calculations'
import SubirComprobanteBtn from '@/components/contabilidad/SubirComprobanteBtn'

interface Obligacion {
  id: string
  nombre: string
  monto: number
  fecha_vencimiento: string | null
  recurrencia: string
  fecha_pago: string | null
  comprobante_url: string | null
  notas: string | null
  activa: boolean
}

const RECURRENCIA_LABEL: Record<string, string> = {
  unica: 'Única vez',
  mensual: 'Mensual',
  anual: 'Anual',
}

export default function ObligacionesTributariasManager({ obligaciones }: { obligaciones: Obligacion[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', monto: '', fecha_vencimiento: '', recurrencia: 'unica' })

  async function agregar() {
    if (!form.nombre.trim()) { toast.error('Ingresa un nombre'); return }
    setSaving(true)
    const { error } = await supabase.from('obligaciones_tributarias').insert({
      nombre: form.nombre.trim(),
      monto: parseInt(form.monto) || 0,
      fecha_vencimiento: form.fecha_vencimiento || null,
      recurrencia: form.recurrencia,
    })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Obligación agregada')
    setForm({ nombre: '', monto: '', fecha_vencimiento: '', recurrencia: 'unica' })
    setShowForm(false)
    router.refresh()
  }

  async function marcarPagada(o: Obligacion) {
    const hoy = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('obligaciones_tributarias').update({ fecha_pago: hoy }).eq('id', o.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Marcada como pagada')
    router.refresh()
  }

  async function revertirPago(o: Obligacion) {
    const { error } = await supabase.from('obligaciones_tributarias').update({ fecha_pago: null }).eq('id', o.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Revertida a pendiente')
    router.refresh()
  }

  async function eliminar(o: Obligacion) {
    const { error } = await supabase.from('obligaciones_tributarias').update({ activa: false }).eq('id', o.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Obligación eliminada')
    router.refresh()
  }

  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-gray-800">Otras obligaciones tributarias</h2>
          <p className="text-xs text-gray-400 mt-0.5">Patente municipal, renta anual, contribuciones, etc.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Cancelar' : '+ Agregar'}
        </Button>
      </div>

      {showForm && (
        <div className="px-5 py-4 border-b bg-gray-50/50 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Nombre</Label>
            <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Patente municipal" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Monto (CLP)</Label>
            <Input type="number" min={0} value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vencimiento</Label>
            <Input type="date" value={form.fecha_vencimiento} onChange={e => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Recurrencia</Label>
            <Select value={form.recurrencia} onValueChange={v => setForm(f => ({ ...f, recurrencia: v ?? 'unica' }))}>
              <SelectTrigger><span className="text-sm">{RECURRENCIA_LABEL[form.recurrencia]}</span></SelectTrigger>
              <SelectContent>
                {Object.entries(RECURRENCIA_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={agregar} disabled={saving} className="bg-blue-600 hover:bg-blue-700 sm:col-span-2">
            {saving ? 'Guardando...' : 'Guardar obligación'}
          </Button>
        </div>
      )}

      {obligaciones.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">Sin obligaciones registradas</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Nombre', 'Monto', 'Vencimiento', 'Recurrencia', 'Estado', ''].map((h, i) => (
                  <th key={i} className={`px-3 py-2 text-xs font-medium text-gray-600 ${i === 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {obligaciones.map(o => {
                const pagada = !!o.fecha_pago
                const vencida = !pagada && !!o.fecha_vencimiento && o.fecha_vencimiento < hoy
                return (
                  <tr key={o.id} className={pagada ? 'bg-green-50' : vencida ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2.5 font-medium text-gray-900">{o.nombre}</td>
                    <td className="px-3 py-2.5 text-right">{formatCLP(o.monto)}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">
                      {o.fecha_vencimiento ? new Date(o.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{RECURRENCIA_LABEL[o.recurrencia] ?? o.recurrencia}</td>
                    <td className="px-3 py-2.5">
                      {pagada ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Pagada</span>
                      ) : vencida ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ Vencida</span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Pendiente</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        <SubirComprobanteBtn tabla="obligaciones_tributarias" registroId={o.id} urlActual={o.comprobante_url} />
                        {pagada ? (
                          <button onClick={() => revertirPago(o)} className="text-xs text-orange-600 hover:underline">Revertir</button>
                        ) : (
                          <button onClick={() => marcarPagada(o)} className="text-xs text-green-600 hover:underline">Marcar pagada</button>
                        )}
                        <button onClick={() => eliminar(o)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
