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
import { Supplier } from '@/types'

export default function ProveedorForm({ proveedor }: { proveedor?: Supplier }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: proveedor?.nombre ?? '',
    razon_social: proveedor?.razon_social ?? '',
    rut: proveedor?.rut ?? '',
    contacto_nombre: proveedor?.contacto_nombre ?? '',
    telefono: proveedor?.telefono ?? '',
    email: proveedor?.email ?? '',
    whatsapp: proveedor?.whatsapp ?? '',
    pais: proveedor?.pais ?? 'Chile',
    ciudad: proveedor?.ciudad ?? '',
    direccion: proveedor?.direccion ?? '',
    condicion_pago: proveedor?.condicion_pago ?? 'contado',
    plazo_pago_dias: String(proveedor?.plazo_pago_dias ?? 0),
    notas: proveedor?.notas ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      nombre: form.nombre.trim(),
      razon_social: form.razon_social.trim() || null,
      rut: form.rut.trim() || null,
      contacto_nombre: form.contacto_nombre.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      pais: form.pais,
      ciudad: form.ciudad.trim() || null,
      direccion: form.direccion.trim() || null,
      condicion_pago: form.condicion_pago as 'contado' | 'credito' | 'cuotas',
      plazo_pago_dias: parseInt(form.plazo_pago_dias) || 0,
      notas: form.notas.trim() || null,
    }
    if (proveedor) {
      const { error } = await supabase.from('suppliers').update(payload).eq('id', proveedor.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Proveedor actualizado')
    } else {
      const { error } = await supabase.from('suppliers').insert(payload)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Proveedor creado')
    }
    router.push('/compras')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Datos del proveedor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre <span className="text-red-500">*</span></Label>
            <Input value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="TechParts Chile" />
          </div>
          <div className="space-y-1.5">
            <Label>Razón social</Label>
            <Input value={form.razon_social} onChange={e => set('razon_social', e.target.value)} placeholder="TechParts Chile SpA" />
          </div>
          <div className="space-y-1.5">
            <Label>RUT</Label>
            <Input value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="76.123.456-7" />
          </div>
          <div className="space-y-1.5">
            <Label>País</Label>
            <Input value={form.pais} onChange={e => set('pais', e.target.value)} placeholder="Chile" />
          </div>
          <div className="space-y-1.5">
            <Label>Ciudad</Label>
            <Input value={form.ciudad} onChange={e => set('ciudad', e.target.value)} placeholder="Santiago" />
          </div>
          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <Input value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Av. Providencia 123" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Contacto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre de contacto</Label>
            <Input value={form.contacto_nombre} onChange={e => set('contacto_nombre', e.target.value)} placeholder="Juan García" />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+56 9 1234 5678" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contacto@proveedor.cl" />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="+56 9 1234 5678" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Condiciones de pago</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Condición de pago</Label>
            <Select value={form.condicion_pago} onValueChange={v => set('condicion_pago', v ?? 'contado')}>
              <SelectTrigger>
                <span className="text-sm">{{ contado: 'Contado', credito: 'Crédito', cuotas: 'Cuotas' }[form.condicion_pago as 'contado'|'credito'|'cuotas'] ?? 'Contado'}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contado">Contado</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
                <SelectItem value="cuotas">Cuotas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Plazo de pago (días)</Label>
            <Input type="number" min={0} value={form.plazo_pago_dias} onChange={e => set('plazo_pago_dias', e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notas internas</Label>
            <Textarea value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Condiciones especiales, descuentos, etc." rows={2} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
          {loading ? 'Guardando...' : proveedor ? 'Actualizar' : 'Crear proveedor'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
