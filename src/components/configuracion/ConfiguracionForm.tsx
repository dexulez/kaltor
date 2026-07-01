'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SystemConfig } from '@/types'

interface Props { config: SystemConfig }

export default function ConfiguracionForm({ config }: Props) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre_local: config.nombre_local ?? '',
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
    dias_garantia_default: String(config.dias_garantia_default ?? 90),
    mostrar_precio_en_presupuesto: config.mostrar_precio_en_presupuesto ?? true,
    wa_url: config.wa_url ?? '',
    wa_apikey: config.wa_apikey ?? '',
    wa_instancia: config.wa_instancia ?? 'default',
    wa_activo: config.wa_activo ?? false,
  })

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('system_config').update({
      nombre_local: form.nombre_local.trim(),
      rut_local: form.rut_local.trim() || null,
      direccion: form.direccion.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      iva: parseFloat(form.iva) || 19,
      ppm: parseFloat(form.ppm) || 3,
      comision_debito: parseFloat(form.comision_debito) || 0,
      comision_credito: parseFloat(form.comision_credito) || 0,
      comision_transferencia: parseFloat(form.comision_transferencia) || 0,
      dias_garantia_default: parseInt(form.dias_garantia_default) || 90,
      mostrar_precio_en_presupuesto: form.mostrar_precio_en_presupuesto,
      wa_url: form.wa_url.trim() || null,
      wa_apikey: form.wa_apikey.trim() || null,
      wa_instancia: form.wa_instancia.trim() || 'default',
      wa_activo: form.wa_activo,
    }).eq('id', config.id)

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Configuración guardada')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Datos del local */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Datos del local</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre del local <span className="text-red-500">*</span></Label>
            <Input value={form.nombre_local} onChange={e => set('nombre_local', e.target.value)} required placeholder="Kaltor" />
          </div>
          <div className="space-y-1.5">
            <Label>RUT del local</Label>
            <Input value={form.rut_local} onChange={e => set('rut_local', e.target.value)} placeholder="76.123.456-7" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Dirección</Label>
            <Input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Av. Providencia 123, Santiago" />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+56 9 1234 5678" />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp (sin espacios)</Label>
            <Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="56912345678" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contacto@ejemplo.cl" />
          </div>
        </div>
      </div>

      {/* Parámetros tributarios */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Parámetros tributarios</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>IVA (%)</Label>
            <Input type="number" step="0.1" min={0} max={50} value={form.iva} onChange={e => set('iva', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>PPM (%)</Label>
            <Input type="number" step="0.1" min={0} max={20} value={form.ppm} onChange={e => set('ppm', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Garantía por defecto (días)</Label>
            <Input type="number" min={0} value={form.dias_garantia_default} onChange={e => set('dias_garantia_default', e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id="mostrar_precio"
            checked={form.mostrar_precio_en_presupuesto}
            onChange={e => set('mostrar_precio_en_presupuesto', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <Label htmlFor="mostrar_precio" className="cursor-pointer font-normal">
            Mostrar precio en presupuesto enviado al cliente
          </Label>
        </div>
      </div>

      {/* Comisiones bancarias */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Comisiones bancarias</h2>
          <p className="text-xs text-gray-500 mt-0.5">Porcentaje que cobra el banco por cada tipo de pago. Se muestra como información al cobrar.</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Débito (%)</Label>
            <Input type="number" step="0.01" min={0} max={10} value={form.comision_debito} onChange={e => set('comision_debito', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Crédito (%)</Label>
            <Input type="number" step="0.01" min={0} max={10} value={form.comision_credito} onChange={e => set('comision_credito', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Transferencia (%)</Label>
            <Input type="number" step="0.01" min={0} max={10} value={form.comision_transferencia} onChange={e => set('comision_transferencia', e.target.value)} />
          </div>
        </div>
      </div>

      {/* WhatsApp API */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Mensajería WhatsApp</h2>
            <p className="text-xs text-gray-500 mt-0.5">Notificaciones automáticas a clientes y proveedores via Evolution API</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.wa_activo}
              onChange={e => set('wa_activo', e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            <span className={`text-sm font-semibold ${form.wa_activo ? 'text-green-600' : 'text-gray-400'}`}>
              {form.wa_activo ? 'Activo' : 'Inactivo'}
            </span>
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>URL del servidor (Render)</Label>
            <Input
              value={form.wa_url}
              onChange={e => set('wa_url', e.target.value)}
              placeholder="https://mi-whatsapp.onrender.com"
              disabled={!form.wa_activo}
            />
          </div>
          <div className="space-y-1.5">
            <Label>API Key</Label>
            <Input
              type="password"
              value={form.wa_apikey}
              onChange={e => set('wa_apikey', e.target.value)}
              placeholder="••••••••••••••••"
              disabled={!form.wa_activo}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nombre de instancia</Label>
            <Input
              value={form.wa_instancia}
              onChange={e => set('wa_instancia', e.target.value)}
              placeholder="default"
              disabled={!form.wa_activo}
            />
          </div>
        </div>
        {form.wa_activo && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠ Asegúrate de que el servidor Evolution API en Render esté corriendo y tenga el QR escaneado antes de activar.
          </p>
        )}
      </div>

      <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </form>
  )
}
