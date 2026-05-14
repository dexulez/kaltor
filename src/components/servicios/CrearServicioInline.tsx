'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCLP } from '@/lib/calculations'

const TIPOS = [
  { value: 'pantalla',   label: '📱 Pantalla' },
  { value: 'bateria',    label: '🔋 Batería' },
  { value: 'placa',      label: '🔬 Placa madre' },
  { value: 'software',   label: '💻 Software' },
  { value: 'camara',     label: '📷 Cámara' },
  { value: 'conector',   label: '🔌 Conector' },
  { value: 'otro',       label: '🔧 Otro' },
]

interface Servicio { id: string; nombre: string; tipo_reparacion: string; precio_base: number }

interface Props {
  onCreated: (s: Servicio) => void
  nombreSugerido?: string
}

export default function CrearServicioInline({ onCreated, nombreSugerido }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState(nombreSugerido ?? '')
  const [tipo, setTipo] = useState('otro')
  const [precio, setPrecio] = useState('')
  const [saving, setSaving] = useState(false)

  async function crear() {
    if (!nombre.trim()) { toast.error('Escribe un nombre'); return }
    setSaving(true)
    const { data, error } = await supabase.from('repair_services').insert({
      nombre: nombre.trim(),
      tipo_reparacion: tipo,
      precio_base: parseInt(precio) || 0,
      activo: true,
    }).select('id, nombre, tipo_reparacion, precio_base').single()
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return }
    toast.success(`Servicio "${nombre.trim()}" creado`)
    onCreated(data as Servicio)
    setOpen(false)
    setSaving(false)
    setNombre('')
    setPrecio('')
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2">
        + Crear nuevo servicio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-4">Crear servicio rápido</h3>
            <div className="space-y-3">
              <div>
                <Label>Nombre del servicio</Label>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
                  placeholder="ej: Cambio pantalla iPhone 13" className="mt-1" />
              </div>
              <div>
                <Label>Tipo</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {TIPOS.map(t => (
                    <button key={t.value} type="button" onClick={() => setTipo(t.value)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors text-left ${tipo === t.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Precio base (CLP)</Label>
                <Input type="number" min={0} value={precio} onChange={e => setPrecio(e.target.value)}
                  placeholder="0" className="mt-1" />
                {precio && <p className="text-xs text-blue-600 mt-0.5">{formatCLP(parseInt(precio) || 0)}</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={crear} disabled={saving}>
                {saving ? 'Creando...' : 'Crear servicio'}
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              Puedes agregar repuestos desde <a href="/servicios" target="_blank" className="text-blue-500 hover:underline">Servicios →</a>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
