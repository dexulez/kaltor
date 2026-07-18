'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type VendedorPerfil = {
  nombre: string
  telefono: string | null
  rut: string | null
  banco: string | null
  tipo_cuenta: string | null
  numero_cuenta: string | null
  titular_cuenta: string | null
}

export default function PerfilForm({ vendedor }: { vendedor: VendedorPerfil }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre:         vendedor.nombre,
    telefono:       vendedor.telefono ?? '',
    rut:            vendedor.rut ?? '',
    banco:          vendedor.banco ?? '',
    tipo_cuenta:    vendedor.tipo_cuenta ?? '',
    numero_cuenta:  vendedor.numero_cuenta ?? '',
    titular_cuenta: vendedor.titular_cuenta ?? '',
  })

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/vendedores/perfil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error'); return }
      toast.success('Perfil actualizado')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input id="nombre" value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="telefono">Teléfono (WhatsApp)</Label>
        <Input id="telefono" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rut">RUT</Label>
        <Input id="rut" value={form.rut} onChange={e => set('rut', e.target.value)} />
      </div>

      <div className="pt-2 border-t">
        <p className="text-sm font-medium text-gray-700 mb-3">Datos bancarios</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="banco">Banco</Label>
              <Input id="banco" value={form.banco} onChange={e => set('banco', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo_cuenta">Tipo de cuenta</Label>
              <Input id="tipo_cuenta" value={form.tipo_cuenta} onChange={e => set('tipo_cuenta', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="numero_cuenta">Número de cuenta</Label>
            <Input id="numero_cuenta" value={form.numero_cuenta} onChange={e => set('numero_cuenta', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titular_cuenta">Titular de la cuenta</Label>
            <Input id="titular_cuenta" value={form.titular_cuenta} onChange={e => set('titular_cuenta', e.target.value)} />
          </div>
        </div>
      </div>

      <Button type="submit" className="bg-[#FF7A1A] hover:bg-[#E06010] text-white" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
