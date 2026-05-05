'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ConfigData = {
  id: string
  nombre_local: string
  rut_local?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  whatsapp?: string | null
  iva: number
  ppm: number
  comision_debito: number
  comision_credito: number
  comision_transferencia: number
  dias_garantia_default: number
  moneda: string
  mostrar_precio_en_presupuesto: boolean
}

export default function ConfiguracionForm({ config }: { config: ConfigData }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre_local: config.nombre_local,
    rut_local: config.rut_local ?? '',
    direccion: config.direccion ?? '',
    telefono: config.telefono ?? '',
    email: config.email ?? '',
    whatsapp: config.whatsapp ?? '',
    iva: String(config.iva ?? 19),
    ppm: String(config.ppm ?? 3),
    comision_debito: String(config.comision_debito ?? 0),
    comision_credito: String(config.comision_credito ?? 0),
    comision_transferencia: String(config.comision_transferencia ?? 0),
    dias_garantia_default: String(config.dias_garantia_default ?? 30),
    moneda: config.moneda ?? 'CLP',
    mostrar_precio_en_presupuesto: config.mostrar_precio_en_presupuesto,
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!config.id) {
      toast.error('No se encontró un registro de configuración para actualizar')
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('system_config')
      .update({
        nombre_local: form.nombre_local.trim(),
        rut_local: form.rut_local.trim() || null,
        direccion: form.direccion.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        iva: parseFloat(form.iva) || 0,
        ppm: parseFloat(form.ppm) || 0,
        comision_debito: parseFloat(form.comision_debito) || 0,
        comision_credito: parseFloat(form.comision_credito) || 0,
        comision_transferencia: parseFloat(form.comision_transferencia) || 0,
        dias_garantia_default: parseInt(form.dias_garantia_default) || 0,
        moneda: form.moneda.trim() || 'CLP',
        mostrar_precio_en_presupuesto: form.mostrar_precio_en_presupuesto,
      })
      .eq('id', config.id)

    if (error) {
      toast.error('Error al guardar configuración: ' + error.message)
      setLoading(false)
      return
    }

    toast.success('Configuración guardada correctamente')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Datos del negocio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre del local</Label>
            <Input value={form.nombre_local} onChange={(e) => set('nombre_local', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>RUT local</Label>
            <Input value={form.rut_local} onChange={(e) => set('rut_local', e.target.value)} placeholder="76.123.456-7" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Dirección</Label>
            <Input value={form.direccion} onChange={(e) => set('direccion', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Input value={form.moneda} onChange={(e) => set('moneda', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Impuestos y comisiones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>IVA (%)</Label>
            <Input type="number" min={0} step="0.01" value={form.iva} onChange={(e) => set('iva', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>PPM (%)</Label>
            <Input type="number" min={0} step="0.01" value={form.ppm} onChange={(e) => set('ppm', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Garantía por defecto (días)</Label>
            <Input type="number" min={0} value={form.dias_garantia_default} onChange={(e) => set('dias_garantia_default', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Comisión débito (%)</Label>
            <Input type="number" min={0} step="0.01" value={form.comision_debito} onChange={(e) => set('comision_debito', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Comisión crédito (%)</Label>
            <Input type="number" min={0} step="0.01" value={form.comision_credito} onChange={(e) => set('comision_credito', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Comisión transferencia (%)</Label>
            <Input type="number" min={0} step="0.01" value={form.comision_transferencia} onChange={(e) => set('comision_transferencia', e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.mostrar_precio_en_presupuesto}
            onChange={(e) => set('mostrar_precio_en_presupuesto', e.target.checked)}
          />
          Mostrar precio en presupuesto al cliente
        </label>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </div>
    </div>
  )
}
